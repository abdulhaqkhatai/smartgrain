import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb/db'
import { Booking, BookingStatusLog, Slot, Centre } from '@/lib/mongodb/models'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await connectDB()

    const booking = await Booking.findById(id)
      .populate('centre_id')
      .populate('slot_id')

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Role security check
    if (session.role === 'farmer' && booking.farmer_id.toString() !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const centre = booking.centre_id as any
    const slot = booking.slot_id as any

    // Status logs
    const logs = await BookingStatusLog.find({ booking_id: booking._id }).sort({ changed_at: 1 })

    // Compute live queue position if active
    let queueInfo = null
    const activeStages = ['booked', 'checked_in', 'quality_check', 'weighed']
    if (activeStages.includes(booking.procurement_stage) && slot) {
      // Find all active slots on same date
      const slotsOnDate = await Slot.find({
        centre_id: booking.centre_id,
        slot_date: slot.slot_date,
      }).select('_id')
      const slotIds = slotsOnDate.map((s) => s._id)

      // Count bookings booked before or at the same time
      const earlierCount = await Booking.countDocuments({
        centre_id: booking.centre_id,
        slot_id: { $in: slotIds },
        procurement_stage: { $in: activeStages },
        booked_at: { $lte: booking.booked_at },
      })

      const totalInQueue = await Booking.countDocuments({
        centre_id: booking.centre_id,
        slot_id: { $in: slotIds },
        procurement_stage: { $in: activeStages },
      })

      queueInfo = {
        queue_position: earlierCount,
        total_in_queue: totalInQueue,
      }
    }

    return NextResponse.json({
      booking: {
        id: booking._id.toString(),
        booking_reference: booking.booking_reference,
        farmer_id: booking.farmer_id.toString(),
        centre_id: centre?._id?.toString() || booking.centre_id.toString(),
        slot_id: slot?._id?.toString() || booking.slot_id.toString(),
        grain_type: booking.grain_type,
        estimated_quantity_kg: booking.estimated_quantity_kg,
        actual_quantity_kg: booking.actual_quantity_kg,
        procurement_stage: booking.procurement_stage,
        payment_stage: booking.payment_stage,
        payment_amount: booking.payment_amount,
        booked_at: booking.booked_at.toISOString(),
        checked_in_at: booking.checked_in_at?.toISOString() || null,
        completed_at: booking.completed_at?.toISOString() || null,
        cancelled_at: booking.cancelled_at?.toISOString() || null,
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
      },
      logs: logs.map((l) => ({
        id: l._id.toString(),
        booking_id: l.booking_id.toString(),
        changed_by: l.changed_by?.toString() || null,
        old_stage: l.old_stage || null,
        new_stage: l.new_stage,
        changed_at: l.changed_at.toISOString(),
      })),
      queueInfo,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await connectDB()

    const booking = await Booking.findById(id)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (session.role === 'farmer' && booking.farmer_id.toString() !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (booking.procurement_stage !== 'booked') {
      return NextResponse.json(
        { error: 'Cannot cancel a booking that is already checked in or processed' },
        { status: 400 }
      )
    }

    const oldStage = booking.procurement_stage
    booking.procurement_stage = 'cancelled'
    booking.cancelled_at = new Date()
    await booking.save()

    // Decrement slot booked count safely
    await Slot.findByIdAndUpdate(booking.slot_id, { $inc: { booked_count: -1 } })

    // Log cancellation
    await BookingStatusLog.create({
      booking_id: booking._id,
      changed_by: session.userId,
      old_stage: oldStage,
      new_stage: 'cancelled',
      changed_at: new Date(),
    })

    return NextResponse.json({ ok: true, booking })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
