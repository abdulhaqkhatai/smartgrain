import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb/db'
import { Slot, SlotTemplate } from '@/lib/mongodb/models'
import { generateSlotsFromTemplates } from '@/lib/mongodb/services'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session || (session.role !== 'staff' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const centreId = session.assignedCentreId
    if (!centreId) {
      return NextResponse.json({ slots: [], templates: [] })
    }

    await connectDB()
    const today = new Date().toISOString().split('T')[0]

    const [slots, templates] = await Promise.all([
      Slot.find({ centre_id: centreId, slot_date: { $gte: today } })
        .sort({ slot_date: 1, start_time: 1 })
        .limit(100),
      SlotTemplate.find({ centre_id: centreId }).sort({ day_of_week: 1, start_time: 1 }),
    ])

    return NextResponse.json({
      slots: slots.map((s) => ({
        id: s._id.toString(),
        slot_date: s.slot_date,
        start_time: s.start_time,
        end_time: s.end_time,
        capacity: s.capacity,
        booked_count: s.booked_count,
        is_active: s.is_active,
      })),
      templates: templates.map((t) => ({
        id: t._id.toString(),
        day_of_week: t.day_of_week,
        start_time: t.start_time,
        end_time: t.end_time,
        capacity: t.capacity,
        is_active: t.is_active,
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session || (session.role !== 'staff' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const centreId = session.assignedCentreId
    if (!centreId) {
      return NextResponse.json({ error: 'No centre assigned to your account' }, { status: 400 })
    }

    const body = await req.json()
    const { action } = body

    await connectDB()

    if (action === 'generate') {
      await generateSlotsFromTemplates(14)
      return NextResponse.json({ ok: true, message: '14-day slots generated successfully' })
    }

    if (action === 'add_template') {
      const { day_of_week, start_time, end_time, capacity } = body
      const template = await SlotTemplate.create({
        centre_id: centreId,
        day_of_week: parseInt(day_of_week),
        start_time,
        end_time,
        capacity: parseInt(capacity),
        is_active: true,
      })
      return NextResponse.json({ ok: true, template })
    }

    if (action === 'add_slot') {
      const { slot_date, start_time, end_time, capacity } = body
      const slot = await Slot.create({
        centre_id: centreId,
        slot_date,
        start_time,
        end_time,
        capacity: parseInt(capacity),
        booked_count: 0,
        is_active: true,
      })
      return NextResponse.json({ ok: true, slot })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session || (session.role !== 'staff' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { slotId, is_active } = await req.json()
    await connectDB()
    const slot = await Slot.findByIdAndUpdate(slotId, { is_active }, { new: true })
    return NextResponse.json({ ok: true, slot })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session || (session.role !== 'staff' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const templateId = searchParams.get('id')
    if (!templateId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    await connectDB()
    await SlotTemplate.findByIdAndDelete(templateId)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
