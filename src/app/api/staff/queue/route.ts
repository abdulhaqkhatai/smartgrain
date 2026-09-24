import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getLiveQueueForCentre, updateBookingStage } from '@/lib/mongodb/services'
import { Notification, User } from '@/lib/mongodb/models'
import { STAGE_LABELS } from '@/lib/utils'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session || (session.role !== 'staff' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const centreId = session.assignedCentreId
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
    const session = await getSessionUser()
    if (!session || (session.role !== 'staff' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { bookingId, newStage, actualQuantityKg, paymentAmount } = await req.json()
    if (!bookingId || !newStage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const booking = await updateBookingStage({
      bookingId,
      newStage,
      staffId: session.userId,
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
