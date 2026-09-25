import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb/db'
import { getLiveQueueForCentre, updateBookingStage } from '@/lib/mongodb/services'
import { Notification, User, Centre } from '@/lib/mongodb/models'
import { STAGE_LABELS } from '@/lib/utils'

export async function GET() {
  try {
    await connectDB()
    const session = await getSessionUser()

    let centreId = session?.assignedCentreId
    if (!centreId) {
      const staffUser = await User.findOne({ role: 'staff' })
      if (staffUser?.assigned_centre_id) {
        centreId = staffUser.assigned_centre_id.toString()
      } else {
        const firstCentre = await Centre.findOne({ is_active: true })
        if (firstCentre) centreId = firstCentre._id.toString()
      }
    }

    if (!centreId) {
      return NextResponse.json({ queue: [] })
    }

    const today = new Date().toISOString().split('T')[0]
    const queue = await getLiveQueueForCentre(centreId, today)

    return NextResponse.json({ queue })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const session = await getSessionUser()

    let staffId = session?.userId
    if (!staffId) {
      const staffUser = await User.findOne({ role: 'staff' })
      staffId = staffUser ? staffUser._id.toString() : 'guest_staff'
    }

    const { bookingId, newStage, actualQuantityKg, paymentAmount } = await req.json()
    if (!bookingId || !newStage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const booking = await updateBookingStage({
      bookingId,
      newStage,
      staffId,
      actualQuantityKg: actualQuantityKg ? parseFloat(actualQuantityKg) : undefined,
      paymentAmount: paymentAmount ? parseFloat(paymentAmount) : undefined,
    })

    // Send in-app notification to the farmer
    const stageLabel = STAGE_LABELS[newStage] || newStage
    await Notification.create({
      farmer_id: booking.farmer_id,
      booking_id: booking._id,
      type: newStage === 'procured' ? 'payment_update' : 'stage_update',
      channel: 'in_app',
      message: `Status update for ${booking.booking_reference}: Now at ${stageLabel}.`,
      sent_at: new Date(),
      delivery_status: 'sent',
    })

    return NextResponse.json({ ok: true, booking })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
