import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb/db'
import { Slot } from '@/lib/mongodb/models'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    await connectDB()
    const slots = await Slot.find({
      centre_id: id,
      slot_date: date,
      is_active: true,
    }).sort({ start_time: 1 })

    const formatted = slots.map((s) => ({
      id: s._id.toString(),
      centre_id: s.centre_id.toString(),
      slot_date: s.slot_date,
      start_time: s.start_time,
      end_time: s.end_time,
      capacity: s.capacity,
      booked_count: s.booked_count,
      is_active: s.is_active,
    }))

    return NextResponse.json({ slots: formatted })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
