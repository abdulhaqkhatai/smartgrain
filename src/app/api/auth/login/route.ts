import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb/db'
import { User } from '@/lib/mongodb/models'
import { comparePassword, signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Please enter email and password' }, { status: 400 })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const isValid = await comparePassword(password, user.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      phone: user.phone,
      name: user.full_name,
      role: user.role,
      assignedCentreId: user.assigned_centre_id?.toString() || null,
    })

    const redirectTo =
      user.role === 'admin'
        ? '/admin/analytics'
        : user.role === 'staff'
        ? '/staff/dashboard'
        : '/dashboard'

    const res = NextResponse.json({
      ok: true,
      redirectTo,
      user: {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        assigned_centre_id: user.assigned_centre_id?.toString() || null,
      },
    })

    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return res
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 })
  }
}
