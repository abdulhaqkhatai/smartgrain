import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb/db'
import { Booking, Centre, Slot, Notification } from '@/lib/mongodb/models'
import { bookSlotConcurrently } from '@/lib/mongodb/services'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const filter: any = {}
    if (session.role === 'farmer') {
      filter.farmer_id = session.userId
    } else if (session.role === 'staff' && session.assignedCentreId) {
      filter.centre_id = session.assignedCentreId
    }

    const bookings = await Booking.find(filter)
      .sort({ booked_at: -1 })
      .populate('centre_id')
      .populate('slot_id')

    const formatted = bookings.map((b) => {
      const centre = b.centre_id as any
      const slot = b.slot_id as any

      return {
        id: b._id.toString(),
        booking_reference: b.booking_reference,
        farmer_id: b.farmer_id.toString(),
        centre_id: centre?._id?.toString() || b.centre_id.toString(),
        slot_id: slot?._id?.toString() || b.slot_id.toString(),
        grain_type: b.grain_type,
        estimated_quantity_kg: b.estimated_quantity_kg,
        actual_quantity_kg: b.actual_quantity_kg,
        procurement_stage: b.procurement_stage,
        payment_stage: b.payment_stage,
        payment_amount: b.payment_amount,
        booked_at: b.booked_at.toISOString(),
        checked_in_at: b.checked_in_at?.toISOString() || null,
        completed_at: b.completed_at?.toISOString() || null,
        cancelled_at: b.cancelled_at?.toISOString() || null,
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
    })

    return NextResponse.json({ bookings: formatted })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'Please log in to book a slot' }, { status: 401 })
    }

    const { slotId, grainType, estimatedQuantityKg } = await req.json()
    if (!slotId || !grainType || !estimatedQuantityKg) {
      return NextResponse.json({ error: 'Missing required booking information' }, { status: 400 })
    }

    const booking = await bookSlotConcurrently({
      farmerId: session.userId,
      slotId,
      grainType,
      estimatedQuantityKg: parseFloat(estimatedQuantityKg),
    })

    // Create in-app notification
    const slot = await Slot.findById(slotId).populate('centre_id')
    const centreName = (slot?.centre_id as any)?.name || 'Centre'

    await Notification.create({
      farmer_id: session.userId,
      booking_id: booking._id,
      type: 'booking_confirmed',
      channel: 'in_app',
      message: `Booking confirmed! Ref: ${booking.booking_reference}. Date: ${slot?.slot_date} (${slot?.start_time} - ${slot?.end_time}) at ${centreName}.`,
      sent_at: new Date(),
      delivery_status: 'sent',
    })

    return NextResponse.json({
      ok: true,
      booking: {
        id: booking._id.toString(),
        booking_reference: booking.booking_reference,
        centre_id: booking.centre_id.toString(),
        slot_id: booking.slot_id.toString(),
        grain_type: booking.grain_type,
        estimated_quantity_kg: booking.estimated_quantity_kg,
        procurement_stage: booking.procurement_stage,
        payment_stage: booking.payment_stage,
        booked_at: booking.booked_at.toISOString(),
      },
    })
  } catch (err: any) {
    if (err.message === 'SLOT_FULL') {
      return NextResponse.json({ error: 'SLOT_FULL', message: 'This slot is full. Please pick another slot.' }, { status: 409 })
    }
    if (err.message === 'SLOT_INACTIVE') {
      return NextResponse.json({ error: 'SLOT_INACTIVE', message: 'This slot has been closed.' }, { status: 400 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
