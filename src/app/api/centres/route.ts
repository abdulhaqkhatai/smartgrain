import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb/db'
import { Centre } from '@/lib/mongodb/models'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  try {
    await connectDB()
    const centres = await Centre.find({ is_active: true }).sort({ name: 1 })
    const formatted = centres.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      code: c.code,
      address: c.address,
      district: c.district,
      state: c.state,
      latitude: c.latitude,
      longitude: c.longitude,
      grain_types: c.grain_types,
      is_active: c.is_active,
    }))
    return NextResponse.json({ centres: formatted })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await connectDB()
    const body = await req.json()
    const centre = await Centre.create({
      name: body.name,
      code: body.code.toUpperCase(),
      address: body.address,
      district: body.district,
      state: body.state || 'Rajasthan',
      latitude: body.latitude ? parseFloat(body.latitude) : null,
      longitude: body.longitude ? parseFloat(body.longitude) : null,
      grain_types: body.grain_types || ['wheat', 'rice'],
      is_active: true,
    })

    return NextResponse.json({
      ok: true,
      centre: {
        id: centre._id.toString(),
        name: centre.name,
        code: centre.code,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
