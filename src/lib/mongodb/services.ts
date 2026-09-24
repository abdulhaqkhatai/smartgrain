import { connectDB } from './db'
import {
  User,
  Centre,
  SlotTemplate,
  Slot,
  Booking,
  BookingStatusLog,
  Notification,
  Counter,
  type ProcurementStage,
} from './models'
import { hashPassword } from '../auth'

export async function generateSlotsFromTemplates(daysAhead = 14) {
  await connectDB()
  const templates = await SlotTemplate.find({ is_active: true })
  const createdSlots = []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i <= daysAhead; i++) {
    const targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() + i)
    const dayOfWeek = targetDate.getDay() // 0=Sun, 6=Sat
    const dateStr = targetDate.toISOString().split('T')[0]

    const dayTemplates = templates.filter((t) => t.day_of_week === dayOfWeek)

    for (const t of dayTemplates) {
      try {
        const slot = await Slot.findOneAndUpdate(
          {
            centre_id: t.centre_id,
            slot_date: dateStr,
            start_time: t.start_time,
          },
          {
            $setOnInsert: {
              centre_id: t.centre_id,
              slot_date: dateStr,
              start_time: t.start_time,
              end_time: t.end_time,
              capacity: t.capacity,
              booked_count: 0,
              is_active: true,
            },
          },
          { upsert: true, new: true }
        )
        createdSlots.push(slot)
      } catch {
        // duplicate key on concurrent runs is expected and handled safely
      }
    }
  }

  return createdSlots
}

/**
 * Race-condition-safe slot booking in MongoDB:
 * Uses atomic findOneAndUpdate with condition { $expr: { $lt: ["$booked_count", "$capacity"] } }
 * and atomic $inc: { booked_count: 1 }
 */
export async function bookSlotConcurrently({
  farmerId,
  slotId,
  grainType,
  estimatedQuantityKg,
}: {
  farmerId: string
  slotId: string
  grainType: string
  estimatedQuantityKg: number
}) {
  await connectDB()

  // 1. Atomic slot capacity check & reservation
  const slot = await Slot.findOneAndUpdate(
    {
      _id: slotId,
      is_active: true,
      $expr: { $lt: ['$booked_count', '$capacity'] },
    },
    { $inc: { booked_count: 1 } },
    { new: true }
  )

  if (!slot) {
    const existing = await Slot.findById(slotId)
    if (!existing || !existing.is_active) {
      throw new Error('SLOT_INACTIVE')
    }
    throw new Error('SLOT_FULL')
  }

  try {
    // 2. Atomic sequence generation for reference
    const counter = await Counter.findByIdAndUpdate(
      'booking_ref',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    )
    const year = new Date().getFullYear()
    const bookingReference = `GRN-${year}-${String(counter!.seq).padStart(6, '0')}`

    // 3. Create booking record
    const booking = await Booking.create({
      booking_reference: bookingReference,
      farmer_id: farmerId,
      centre_id: slot.centre_id,
      slot_id: slot._id,
      grain_type: grainType,
      estimated_quantity_kg: estimatedQuantityKg,
      procurement_stage: 'booked',
      payment_stage: 'not_applicable',
      booked_at: new Date(),
    })

    // 4. Audit trail log
    await BookingStatusLog.create({
      booking_id: booking._id,
      changed_by: farmerId,
      old_stage: null,
      new_stage: 'booked',
      changed_at: new Date(),
    })

    return booking
  } catch (err) {
    // Rollback slot count if booking insert fails
    await Slot.findByIdAndUpdate(slotId, { $inc: { booked_count: -1 } })
    throw err
  }
}

export async function updateBookingStage({
  bookingId,
  newStage,
  staffId,
  actualQuantityKg,
  paymentAmount,
}: {
  bookingId: string
  newStage: ProcurementStage
  staffId: string
  actualQuantityKg?: number
  paymentAmount?: number
}) {
  await connectDB()

  const booking = await Booking.findById(bookingId)
  if (!booking) throw new Error('Booking not found')

  const oldStage = booking.procurement_stage
  const now = new Date()

  booking.procurement_stage = newStage

  if (actualQuantityKg !== undefined && actualQuantityKg !== null) {
    booking.actual_quantity_kg = actualQuantityKg
  }
  if (paymentAmount !== undefined && paymentAmount !== null) {
    booking.payment_amount = paymentAmount
  }
  if (newStage === 'procured') {
    booking.payment_stage = 'pending'
    booking.completed_at = now
  } else if (newStage === 'rejected') {
    booking.completed_at = now
  } else if (newStage === 'checked_in') {
    booking.checked_in_at = now
  } else if (newStage === 'cancelled' || newStage === 'no_show') {
    booking.cancelled_at = now
  }

  await booking.save()

  // Audit log
  await BookingStatusLog.create({
    booking_id: booking._id,
    changed_by: staffId,
    old_stage: oldStage,
    new_stage: newStage,
    changed_at: now,
  })

  return booking
}

export async function getLiveQueueForCentre(centreId: string, slotDate: string) {
  await connectDB()

  // Find all active slots on this date
  const slotsOnDate = await Slot.find({ centre_id: centreId, slot_date: slotDate }).select('_id')
  const slotIds = slotsOnDate.map((s) => s._id)

  const activeStages = ['booked', 'checked_in', 'quality_check', 'weighed']

  const bookings = await Booking.find({
    centre_id: centreId,
    slot_id: { $in: slotIds },
    procurement_stage: { $in: activeStages },
  })
    .sort({ booked_at: 1 })
    .populate('farmer_id', 'full_name phone')

  const totalInQueue = bookings.length

  return bookings.map((b, idx) => ({
    booking_id: b._id.toString(),
    centre_id: centreId,
    slot_date: slotDate,
    farmer_id: b.farmer_id?._id?.toString() || b.farmer_id?.toString(),
    farmer_name: (b.farmer_id as any)?.full_name || 'Farmer',
    farmer_phone: (b.farmer_id as any)?.phone || '',
    procurement_stage: b.procurement_stage,
    booking_reference: b.booking_reference,
    grain_type: b.grain_type,
    estimated_quantity_kg: b.estimated_quantity_kg,
    actual_quantity_kg: b.actual_quantity_kg,
    payment_amount: b.payment_amount,
    booked_at: b.booked_at.toISOString(),
    queue_position: idx + 1,
    total_in_queue: totalInQueue,
  }))
}

export async function seedInitialDatabase() {
  await connectDB()

  // Check if centres already exist
  const existingCentres = await Centre.countDocuments()
  if (existingCentres > 0) {
    return { message: 'Database already seeded' }
  }

  // 1. Centres
  const centres = await Centre.insertMany([
    {
      name: 'Jodhpur Main Procurement Centre',
      code: 'JDH-01',
      address: 'Station Road, Near Bus Stand, Jodhpur',
      district: 'Jodhpur',
      state: 'Rajasthan',
      latitude: 26.2389,
      longitude: 73.0243,
      grain_types: ['wheat', 'rice', 'bajra'],
      is_active: true,
    },
    {
      name: 'Jaipur North Procurement Centre',
      code: 'JAI-01',
      address: 'Sikar Road, Near Agricultural Market, Jaipur',
      district: 'Jaipur',
      state: 'Rajasthan',
      latitude: 26.9124,
      longitude: 75.7873,
      grain_types: ['wheat', 'rice'],
      is_active: true,
    },
    {
      name: 'Bikaner Grain Centre',
      code: 'BKN-01',
      address: 'Ganga Shahar Road, Bikaner',
      district: 'Bikaner',
      state: 'Rajasthan',
      latitude: 28.0229,
      longitude: 73.3119,
      grain_types: ['wheat', 'bajra', 'mustard'],
      is_active: true,
    },
  ])

  // 2. Slot Templates (Mon-Sat, 3 windows: 08:00-11:00, 11:00-14:00, 14:00-17:00)
  const templateDocs = []
  const windows = [
    { start: '08:00', end: '11:00', capacity: 20 },
    { start: '11:00', end: '14:00', capacity: 20 },
    { start: '14:00', end: '17:00', capacity: 15 },
  ]

  for (const centre of centres) {
    for (let dow = 1; dow <= 6; dow++) {
      for (const w of windows) {
        templateDocs.push({
          centre_id: centre._id,
          day_of_week: dow,
          start_time: w.start,
          end_time: w.end,
          capacity: w.capacity,
          is_active: true,
        })
      }
    }
  }
  await SlotTemplate.insertMany(templateDocs)

  // 3. Generate initial 14 days of slots
  await generateSlotsFromTemplates(14)

  // 4. Default Admin & Staff accounts for testing
  const adminPasswordHash = await hashPassword('admin123')
  const staffPasswordHash = await hashPassword('staff123')
  const farmerPasswordHash = await hashPassword('farmer123')

  await User.insertMany([
    {
      full_name: 'Admin Officer',
      phone: '9876543210',
      email: 'admin@grainprocure.in',
      password_hash: adminPasswordHash,
      role: 'admin',
    },
    {
      full_name: 'Jodhpur Staff Incharge',
      phone: '9876543211',
      email: 'staff@grainprocure.in',
      password_hash: staffPasswordHash,
      role: 'staff',
      assigned_centre_id: centres[0]._id,
    },
    {
      full_name: 'Ramesh Kumar (Farmer)',
      phone: '9876543212',
      email: 'farmer@grainprocure.in',
      password_hash: farmerPasswordHash,
      role: 'farmer',
      village: 'Mandore, Jodhpur',
    },
  ])

  return { message: 'Database initialized successfully with test centres, templates, and accounts' }
}
