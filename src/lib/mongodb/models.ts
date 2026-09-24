import mongoose, { Schema, Document, Model } from 'mongoose'

export type UserRole = 'farmer' | 'staff' | 'admin'
export type ProcurementStage =
  | 'booked'
  | 'checked_in'
  | 'quality_check'
  | 'weighed'
  | 'procured'
  | 'rejected'
  | 'cancelled'
  | 'no_show'
export type PaymentStage = 'not_applicable' | 'pending' | 'processing' | 'paid' | 'failed'
export type NotificationChannel = 'sms' | 'email' | 'in_app'
export type NotificationType =
  | 'booking_confirmed'
  | 'queue_reminder'
  | 'your_turn'
  | 'stage_update'
  | 'payment_update'
  | 'cancelled'
  | 'booking_reminder_24h'

// 1. User
export interface IUser extends Document {
  full_name: string
  phone: string
  email: string
  password_hash: string
  role: UserRole
  assigned_centre_id?: mongoose.Types.ObjectId | null
  village?: string | null
  created_at: Date
}

const UserSchema = new Schema<IUser>({
  full_name: { type: String, required: true },
  phone: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['farmer', 'staff', 'admin'], default: 'farmer', required: true },
  assigned_centre_id: { type: Schema.Types.ObjectId, ref: 'Centre', default: null },
  village: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

// 2. Centre
export interface ICentre extends Document {
  name: string
  code: string
  address: string
  district: string
  state: string
  latitude?: number | null
  longitude?: number | null
  grain_types: string[]
  is_active: boolean
  created_at: Date
}

const CentreSchema = new Schema<ICentre>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  address: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, required: true },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  grain_types: { type: [String], default: ['wheat', 'rice'] },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
})

// 3. SlotTemplate
export interface ISlotTemplate extends Document {
  centre_id: mongoose.Types.ObjectId
  day_of_week: number // 0-6 (0=Sun, 6=Sat)
  start_time: string // "08:00"
  end_time: string // "11:00"
  capacity: number
  is_active: boolean
}

const SlotTemplateSchema = new Schema<ISlotTemplate>({
  centre_id: { type: Schema.Types.ObjectId, ref: 'Centre', required: true, index: true },
  day_of_week: { type: Number, required: true, min: 0, max: 6 },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1 },
  is_active: { type: Boolean, default: true },
})

// 4. Concrete Slot
export interface ISlot extends Document {
  centre_id: mongoose.Types.ObjectId
  slot_date: string // "YYYY-MM-DD"
  start_time: string // "08:00"
  end_time: string // "11:00"
  capacity: number
  booked_count: number
  is_active: boolean
  created_at: Date
}

const SlotSchema = new Schema<ISlot>({
  centre_id: { type: Schema.Types.ObjectId, ref: 'Centre', required: true },
  slot_date: { type: String, required: true },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1 },
  booked_count: { type: Number, default: 0, min: 0 },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
})

SlotSchema.index({ centre_id: 1, slot_date: 1, start_time: 1 }, { unique: true })
SlotSchema.index({ centre_id: 1, slot_date: 1 })

// 5. Booking
export interface IBooking extends Document {
  booking_reference: string
  farmer_id: mongoose.Types.ObjectId
  centre_id: mongoose.Types.ObjectId
  slot_id: mongoose.Types.ObjectId
  grain_type: string
  estimated_quantity_kg: number
  actual_quantity_kg?: number | null
  procurement_stage: ProcurementStage
  payment_stage: PaymentStage
  payment_amount?: number | null
  queue_position?: number | null
  booked_at: Date
  checked_in_at?: Date | null
  completed_at?: Date | null
  cancelled_at?: Date | null
  notes?: string | null
}

const BookingSchema = new Schema<IBooking>({
  booking_reference: { type: String, required: true, unique: true, index: true },
  farmer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  centre_id: { type: Schema.Types.ObjectId, ref: 'Centre', required: true, index: true },
  slot_id: { type: Schema.Types.ObjectId, ref: 'Slot', required: true, index: true },
  grain_type: { type: String, required: true },
  estimated_quantity_kg: { type: Number, required: true },
  actual_quantity_kg: { type: Number, default: null },
  procurement_stage: {
    type: String,
    enum: ['booked', 'checked_in', 'quality_check', 'weighed', 'procured', 'rejected', 'cancelled', 'no_show'],
    default: 'booked',
    index: true,
  },
  payment_stage: {
    type: String,
    enum: ['not_applicable', 'pending', 'processing', 'paid', 'failed'],
    default: 'not_applicable',
  },
  payment_amount: { type: Number, default: null },
  queue_position: { type: Number, default: null },
  booked_at: { type: Date, default: Date.now, index: true },
  checked_in_at: { type: Date, default: null },
  completed_at: { type: Date, default: null },
  cancelled_at: { type: Date, default: null },
  notes: { type: String, default: null },
})

BookingSchema.index({ centre_id: 1, procurement_stage: 1 })
BookingSchema.index({ centre_id: 1, booked_at: 1 })

// 6. BookingStatusLog
export interface IBookingStatusLog extends Document {
  booking_id: mongoose.Types.ObjectId
  changed_by?: mongoose.Types.ObjectId | null
  old_stage?: string | null
  new_stage: string
  changed_at: Date
}

const BookingStatusLogSchema = new Schema<IBookingStatusLog>({
  booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  changed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  old_stage: { type: String, default: null },
  new_stage: { type: String, required: true },
  changed_at: { type: Date, default: Date.now },
})

// 7. Notification
export interface INotification extends Document {
  farmer_id: mongoose.Types.ObjectId
  booking_id?: mongoose.Types.ObjectId | null
  type: NotificationType
  channel: NotificationChannel
  message: string
  sent_at: Date
  delivery_status: string
  read_at?: Date | null
}

const NotificationSchema = new Schema<INotification>({
  farmer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', default: null },
  type: {
    type: String,
    enum: [
      'booking_confirmed',
      'queue_reminder',
      'your_turn',
      'stage_update',
      'payment_update',
      'cancelled',
      'booking_reminder_24h',
    ],
    required: true,
  },
  channel: { type: String, enum: ['sms', 'email', 'in_app'], default: 'in_app' },
  message: { type: String, required: true },
  sent_at: { type: Date, default: Date.now, index: true },
  delivery_status: { type: String, default: 'sent' },
  read_at: { type: Date, default: null },
})

// 8. Counter (for atomic sequence generation)
export interface ICounter extends Document {
  _id: string
  seq: number
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
})

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
export const Centre: Model<ICentre> = mongoose.models.Centre || mongoose.model<ICentre>('Centre', CentreSchema)
export const SlotTemplate: Model<ISlotTemplate> =
  mongoose.models.SlotTemplate || mongoose.model<ISlotTemplate>('SlotTemplate', SlotTemplateSchema)
export const Slot: Model<ISlot> = mongoose.models.Slot || mongoose.model<ISlot>('Slot', SlotSchema)
export const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema)
export const BookingStatusLog: Model<IBookingStatusLog> =
  mongoose.models.BookingStatusLog || mongoose.model<IBookingStatusLog>('BookingStatusLog', BookingStatusLogSchema)
export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)
export const Counter: Model<ICounter> = mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema)
