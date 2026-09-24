import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb/db'
import { Notification } from '@/lib/mongodb/models'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ notifications: [], unreadCount: 0 })
    }

    await connectDB()
    const notifications = await Notification.find({ farmer_id: session.userId })
      .sort({ sent_at: -1 })
      .limit(50)

    const unreadCount = await Notification.countDocuments({
      farmer_id: session.userId,
      read_at: null,
    })

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        farmer_id: n.farmer_id.toString(),
        booking_id: n.booking_id?.toString() || null,
        type: n.type,
        channel: n.channel,
        message: n.message,
        sent_at: n.sent_at.toISOString(),
        delivery_status: n.delivery_status,
        read_at: n.read_at?.toISOString() || null,
      })),
      unreadCount,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    await Notification.updateMany(
      { farmer_id: session.userId, read_at: null },
      { $set: { read_at: new Date() } }
    )

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
