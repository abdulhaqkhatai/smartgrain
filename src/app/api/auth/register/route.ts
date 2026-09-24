import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb/db'
import { User } from '@/lib/mongodb/models'
import { hashPassword, signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { fullName, email, phone, password, village } = await req.json()

    if (!fullName || !email || !phone || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/[\s\-()]/g, '')
    if (!/^(\+91)?[6-9]\d{9}$/.test(cleanPhone)) {
      return NextResponse.json({ error: 'Enter a valid Indian phone number' }, { status: 400 })
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone: cleanPhone }],
    })

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    const user = await User.create({
      full_name: fullName,
      email: email.toLowerCase(),
      phone: cleanPhone,
      password_hash: passwordHash,
      role: 'farmer',
      village: village || null,
    })

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      phone: user.phone,
      name: user.full_name,
      role: user.role,
    })

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
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
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 500 })
  }
}
