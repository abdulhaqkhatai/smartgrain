import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb/db'
import { Centre } from '@/lib/mongodb/models'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectDB()
    const centre = await Centre.findById(id)
    if (!centre) {
      return NextResponse.json({ error: 'Centre not found' }, { status: 404 })
    }

    return NextResponse.json({
      centre: {
        id: centre._id.toString(),
        name: centre.name,
        code: centre.code,
        address: centre.address,
        district: centre.district,
        state: centre.state,
        latitude: centre.latitude,
        longitude: centre.longitude,
        grain_types: centre.grain_types,
        is_active: centre.is_active,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectDB()
    const body = await req.json()

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.code !== undefined) updateData.code = body.code.toUpperCase()
    if (body.address !== undefined) updateData.address = body.address
    if (body.district !== undefined) updateData.district = body.district
    if (body.state !== undefined) updateData.state = body.state
    if (body.latitude !== undefined) updateData.latitude = body.latitude ? parseFloat(body.latitude) : null
    if (body.longitude !== undefined) updateData.longitude = body.longitude ? parseFloat(body.longitude) : null
    if (body.grain_types !== undefined) updateData.grain_types = body.grain_types
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const centre = await Centre.findByIdAndUpdate(id, updateData, { new: true })

    return NextResponse.json({ ok: true, centre })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
