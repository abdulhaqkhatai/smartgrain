import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb/db'
import { User } from '@/lib/mongodb/models'

export async function GET() {
  await connectDB()
  const session = await getSessionUser()

  if (session) {
    const user = await User.findById(session.userId).select('-password_hash')
    if (user) {
      return NextResponse.json({
        user: {
          id: user._id.toString(),
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          assigned_centre_id: user.assigned_centre_id?.toString() || null,
          village: user.village || null,
          isGuest: false,
        },
      })
    }
  }

  // When login is not compulsory, provide the default demo farmer account
  let demoUser = await User.findOne({ email: 'farmer@grainprocure.in' })
  if (!demoUser) {
    demoUser = await User.findOne({ role: 'farmer' })
  }

  if (demoUser) {
    return NextResponse.json({
      user: {
        id: demoUser._id.toString(),
        full_name: demoUser.full_name,
        email: demoUser.email,
        phone: demoUser.phone,
        role: demoUser.role,
        assigned_centre_id: demoUser.assigned_centre_id?.toString() || null,
        village: demoUser.village || null,
        isGuest: true,
      },
    })
  }

  // Fallback virtual guest user if database hasn't been seeded yet
  return NextResponse.json({
    user: {
      id: 'demo_farmer_guest',
      full_name: 'Guest Farmer',
      email: 'farmer@grainprocure.in',
      phone: '9876543212',
      role: 'farmer',
      assigned_centre_id: null,
      village: 'Mandore, Jodhpur',
      isGuest: true,
    },
  })
}
