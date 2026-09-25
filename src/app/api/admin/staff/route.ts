import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb/db'
import { User, Centre } from '@/lib/mongodb/models'

export async function GET() {
  try {
    await connectDB()
    const [staffUsers, centres] = await Promise.all([
      User.find({ role: { $in: ['staff', 'admin'] } }).select('-password_hash').sort({ full_name: 1 }),
      Centre.find({ is_active: true }).sort({ name: 1 }),
    ])

    return NextResponse.json({
      staff: staffUsers.map((u) => ({
        id: u._id.toString(),
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        assigned_centre_id: u.assigned_centre_id?.toString() || null,
      })),
      centres: centres.map((c) => ({
        id: c._id.toString(),
        name: c.name,
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, phone, password, assigned_centre_id } = await req.json()
    if (!full_name || !email || !phone || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await connectDB()

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    })
    if (existing) {
      return NextResponse.json({ error: 'Email or phone already registered' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    const user = await User.create({
      full_name,
      email: email.toLowerCase(),
      phone,
      password_hash: passwordHash,
      role: 'staff',
      assigned_centre_id: assigned_centre_id || null,
    })

    return NextResponse.json({
      ok: true,
      user: {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        assigned_centre_id: user.assigned_centre_id?.toString() || null,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, assigned_centre_id } = await req.json()
    await connectDB()
    const user = await User.findByIdAndUpdate(
      userId,
      { assigned_centre_id: assigned_centre_id || null },
      { new: true }
    )
    return NextResponse.json({ ok: true, user })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
