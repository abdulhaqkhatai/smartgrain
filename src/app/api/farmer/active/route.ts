import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb/db'
import { Booking, Slot, Centre } from '@/lib/mongodb/models'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session || session.role !== 'farmer') {
      return NextResponse.json({ activeBooking: null, queueInfo: null, recentBookings: [] })
    }

    await connectDB()

    const activeStages = ['booked', 'checked_in', 'quality_check', 'weighed']

    // 1. Most recent active booking
    const activeBooking = await Booking.findOne({
      farmer_id: session.userId,
      procurement_stage: { $in: activeStages },
    })
      .sort({ booked_at: -1 })
      .populate('centre_id')
      .populate('slot_id')

    let queueInfo = null

    if (activeBooking && activeBooking.slot_id) {
      const slot = activeBooking.slot_id as any

      // Find all active slots on same date
      const slotsOnDate = await Slot.find({
        centre_id: activeBooking.centre_id,
        slot_date: slot.slot_date,
      }).select('_id')
      const slotIds = slotsOnDate.map((s) => s._id)

      const earlierCount = await Booking.countDocuments({
        centre_id: activeBooking.centre_id,
        slot_id: { $in: slotIds },
        procurement_stage: { $in: activeStages },
        booked_at: { $lte: activeBooking.booked_at },
      })

      const totalInQueue = await Booking.countDocuments({
        centre_id: activeBooking.centre_id,
        slot_id: { $in: slotIds },
        procurement_stage: { $in: activeStages },
      })

      queueInfo = {
        queue_position: earlierCount,
        total_in_queue: totalInQueue,
      }
    }

    // 2. Recent bookings (up to 5)
    const recent = await Booking.find({ farmer_id: session.userId })
      .sort({ booked_at: -1 })
      .limit(5)
      .populate('centre_id')
      .populate('slot_id')

    const formatBooking = (b: any) => {
      const centre = b.centre_id
      const slot = b.slot_id
      return {
        id: b._id.toString(),
        booking_reference: b.booking_reference,
        grain_type: b.grain_type,
        estimated_quantity_kg: b.estimated_quantity_kg,
        actual_quantity_kg: b.actual_quantity_kg,
        procurement_stage: b.procurement_stage,
        payment_stage: b.payment_stage,
        payment_amount: b.payment_amount,
        booked_at: b.booked_at.toISOString(),
        slots: slot
          ? {
              id: slot._id.toString(),
              slot_date: slot.slot_date,
              start_time: slot.start_time,
              end_time: slot.end_time,
              centres: centre
                ? {
                    id: centre._id.toString(),
                    name: centre.name,
                    code: centre.code,
                    address: centre.address,
                  }
                : null,
            }
          : null,
      }
    }

    return NextResponse.json({
      activeBooking: activeBooking ? formatBooking(activeBooking) : null,
      queueInfo,
      recentBookings: recent.map(formatBooking),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
