export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'farmer' | 'staff' | 'admin'
export type ProcurementStage = 'booked' | 'checked_in' | 'quality_check' | 'weighed' | 'procured' | 'rejected' | 'cancelled' | 'no_show'
export type PaymentStage = 'not_applicable' | 'pending' | 'processing' | 'paid' | 'failed'
export type NotificationChannel = 'sms' | 'email' | 'in_app'
export type NotificationType = 'booking_confirmed' | 'queue_reminder' | 'your_turn' | 'stage_update' | 'payment_update' | 'cancelled' | 'booking_reminder_24h'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string
          role: UserRole
          assigned_centre_id: string | null
          village: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone: string
          role?: UserRole
          assigned_centre_id?: string | null
          village?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string
          role?: UserRole
          assigned_centre_id?: string | null
          village?: string | null
          created_at?: string
        }
      }
      centres: {
        Row: {
          id: string
          name: string
          code: string
          address: string
          district: string
          state: string
          latitude: number | null
          longitude: number | null
          grain_types: string[]
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          address: string
          district: string
          state: string
          latitude?: number | null
          longitude?: number | null
          grain_types?: string[]
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          address?: string
          district?: string
          state?: string
          latitude?: number | null
          longitude?: number | null
          grain_types?: string[]
          is_active?: boolean
          created_at?: string
        }
      }
      slots: {
        Row: {
          id: string
          centre_id: string
          slot_date: string
          start_time: string
          end_time: string
          capacity: number
          booked_count: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          centre_id: string
          slot_date: string
          start_time: string
          end_time: string
          capacity: number
          booked_count?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          centre_id?: string
          slot_date?: string
          start_time?: string
          end_time?: string
          capacity?: number
          booked_count?: number
          is_active?: boolean
          created_at?: string
        }
      }
      slot_templates: {
        Row: {
          id: string
          centre_id: string
          day_of_week: number
          start_time: string
          end_time: string
          capacity: number
          is_active: boolean
        }
        Insert: {
          id?: string
          centre_id: string
          day_of_week: number
          start_time: string
          end_time: string
          capacity: number
          is_active?: boolean
        }
        Update: {
          id?: string
          centre_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          capacity?: number
          is_active?: boolean
        }
      }
      bookings: {
        Row: {
          id: string
          farmer_id: string
          centre_id: string
          slot_id: string
          grain_type: string
          estimated_quantity_kg: number
          actual_quantity_kg: number | null
          booking_reference: string
          procurement_stage: ProcurementStage
          payment_stage: PaymentStage
          payment_amount: number | null
          queue_position: number | null
          booked_at: string
          checked_in_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          farmer_id: string
          centre_id: string
          slot_id: string
          grain_type: string
          estimated_quantity_kg: number
          actual_quantity_kg?: number | null
          booking_reference: string
          procurement_stage?: ProcurementStage
          payment_stage?: PaymentStage
          payment_amount?: number | null
          queue_position?: number | null
          booked_at?: string
          checked_in_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          farmer_id?: string
          centre_id?: string
          slot_id?: string
          grain_type?: string
          estimated_quantity_kg?: number
          actual_quantity_kg?: number | null
          booking_reference?: string
          procurement_stage?: ProcurementStage
          payment_stage?: PaymentStage
          payment_amount?: number | null
          queue_position?: number | null
          booked_at?: string
          checked_in_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          notes?: string | null
        }
      }
      booking_status_log: {
        Row: {
          id: string
          booking_id: string
          changed_by: string | null
          old_stage: string | null
          new_stage: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          changed_by?: string | null
          old_stage?: string | null
          new_stage?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          changed_by?: string | null
          old_stage?: string | null
          new_stage?: string | null
          changed_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          farmer_id: string
          booking_id: string | null
          type: NotificationType
          channel: NotificationChannel
          message: string
          sent_at: string
          delivery_status: string
          read_at: string | null
        }
        Insert: {
          id?: string
          farmer_id: string
          booking_id?: string | null
          type: NotificationType
          channel: NotificationChannel
          message: string
          sent_at?: string
          delivery_status?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          farmer_id?: string
          booking_id?: string | null
          type?: NotificationType
          channel?: NotificationChannel
          message?: string
          sent_at?: string
          delivery_status?: string
          read_at?: string | null
        }
      }
    }
    Views: {
      live_queue: {
        Row: {
          booking_id: string
          centre_id: string
          slot_date: string
          farmer_id: string
          procurement_stage: ProcurementStage
          booking_reference: string
          grain_type: string
          estimated_quantity_kg: number
          booked_at: string
          queue_position: number
          total_in_queue: number
        }
      }
    }
    Functions: {
      book_slot: {
        Args: {
          p_farmer_id: string
          p_slot_id: string
          p_grain_type: string
          p_estimated_quantity_kg: number
        }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
      update_booking_stage: {
        Args: {
          p_booking_id: string
          p_new_stage: ProcurementStage
          p_staff_id: string
          p_actual_quantity_kg?: number
          p_payment_amount?: number
        }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
      generate_slots_from_templates: {
        Args: { p_days_ahead?: number }
        Returns: void
      }
    }
    Enums: {
      user_role: UserRole
      procurement_stage: ProcurementStage
      payment_stage: PaymentStage
      notification_channel: NotificationChannel
      notification_type: NotificationType
    }
  }
}
