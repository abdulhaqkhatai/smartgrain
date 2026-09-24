import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb/db'
import { User } from '@/lib/mongodb/models'

export async function GET() {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  await connectDB()
  const user = await User.findById(session.userId).select('-password_hash')
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      assigned_centre_id: user.assigned_centre_id?.toString() || null,
      village: user.village || null,
    },
  })
}
