import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb/db'
import { Notification, User } from '@/lib/mongodb/models'

async function resolveUserId(): Promise<string | null> {
  const session = await getSessionUser()
  if (session) return session.userId

  await connectDB()
  const demoUser =
    (await User.findOne({ email: 'farmer@grainprocure.in' })) ||
    (await User.findOne({ role: 'farmer' }))
  return demoUser ? demoUser._id.toString() : null
}

export async function GET() {
  try {
    await connectDB()
    const userId = await resolveUserId()
    if (!userId) return NextResponse.json({ notifications: [], unreadCount: 0 })

    const notifications = await Notification.find({ farmer_id: userId })
      .sort({ sent_at: -1 })
      .limit(50)

    const unreadCount = await Notification.countDocuments({
      farmer_id: userId,
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
    await connectDB()
    const userId = await resolveUserId()
    if (!userId) return NextResponse.json({ ok: true })

    await Notification.updateMany(
      { farmer_id: userId, read_at: null },
      { $set: { read_at: new Date() } }
    )

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
