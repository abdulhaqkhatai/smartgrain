import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb/db'
import { Slot, Booking } from '@/lib/mongodb/models'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session || (session.role !== 'staff' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const centreId = session.assignedCentreId
    if (!centreId) {
      return NextResponse.json({
        stats: { total: 0, active: 0, completed: 0, cancelled: 0 },
        todaySlots: [],
        recentBookings: [],
      })
    }

    await connectDB()
    const today = new Date().toISOString().split('T')[0]

    // 1. Slots for today
    const slots = await Slot.find({
      centre_id: centreId,
      slot_date: today,
    }).sort({ start_time: 1 })

    // 2. Bookings for today
    const slotIds = slots.map((s) => s._id)
    const bookings = await Booking.find({
      centre_id: centreId,
      slot_id: { $in: slotIds },
    }).populate('farmer_id', 'full_name phone')

    const stats = {
      total: bookings.length,
      active: bookings.filter((b) =>
        ['booked', 'checked_in', 'quality_check', 'weighed'].includes(b.procurement_stage)
      ).length,
      completed: bookings.filter((b) => b.procurement_stage === 'procured').length,
      cancelled: bookings.filter((b) =>
        ['cancelled', 'no_show', 'rejected'].includes(b.procurement_stage)
      ).length,
    }

    const todaySlots = slots.map((s) => ({
      id: s._id.toString(),
      slot_date: s.slot_date,
      start_time: s.start_time,
      end_time: s.end_time,
      capacity: s.capacity,
      booked_count: s.booked_count,
      is_active: s.is_active,
      activeCount: bookings.filter(
        (b) =>
          b.slot_id.toString() === s._id.toString() &&
          ['booked', 'checked_in', 'quality_check', 'weighed'].includes(b.procurement_stage)
      ).length,
    }))

    // 3. Recent bookings
    const recent = await Booking.find({ centre_id: centreId })
      .sort({ booked_at: -1 })
      .limit(8)
      .populate('farmer_id', 'full_name')

    const recentBookings = recent.map((b) => ({
      id: b._id.toString(),
      booking_reference: b.booking_reference,
      grain_type: b.grain_type,
      procurement_stage: b.procurement_stage,
      farmer_name: (b.farmer_id as any)?.full_name || 'Farmer',
    }))

    return NextResponse.json({
      stats,
      todaySlots,
      recentBookings,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
