import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb/db'
import { Booking, Centre, User } from '@/lib/mongodb/models'
import { STAGE_LABELS } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')

    await connectDB()

    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)

    const [bookings, centres, farmerCount] = await Promise.all([
      Booking.find({ booked_at: { $gte: sinceDate } }).populate('centre_id'),
      Centre.find({ is_active: true }),
      User.countDocuments({ role: 'farmer' }),
    ])

    // Centre load
    const centreLoad = centres
      .map((c) => {
        const cb = bookings.filter((b) => (b.centre_id as any)?._id?.toString() === c._id.toString())
        return {
          name: c.code,
          bookings: cb.length,
          completed: cb.filter((b) => b.procurement_stage === 'procured').length,
        }
      })
      .sort((a, b) => b.bookings - a.bookings)

    // Stage distribution
    const stageCounts: Record<string, number> = {}
    bookings.forEach((b) => {
      stageCounts[b.procurement_stage] = (stageCounts[b.procurement_stage] || 0) + 1
    })
    const stageDistribution = Object.entries(stageCounts).map(([k, v]) => ({
      name: STAGE_LABELS[k] || k,
      value: v,
    }))

    // Peak booking hours (0-23)
    const hourCounts: Record<number, number> = {}
    bookings.forEach((b) => {
      const hour = new Date(b.booked_at).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    const peakHours = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}:00`,
      count: hourCounts[h] || 0,
    })).filter((h) => h.count > 0)

    // Daily bookings trend (last 14 days)
    const dailyMap: Record<string, { bookings: number; completed: number }> = {}
    bookings.forEach((b) => {
      const day = new Date(b.booked_at).toISOString().split('T')[0]
      if (!dailyMap[day]) dailyMap[day] = { bookings: 0, completed: 0 }
      dailyMap[day].bookings++
      if (b.procurement_stage === 'procured') dailyMap[day].completed++
    })

    const dailyBookings = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, vals]) => ({
        date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        ...vals,
      }))

    // Avg wait time (checked_in_at to completed_at for procured bookings)
    const completedWithTimes = bookings.filter(
      (b) => b.procurement_stage === 'procured' && b.checked_in_at && b.completed_at
    )
    const avgWaitMs =
      completedWithTimes.length > 0
        ? completedWithTimes.reduce(
            (sum, b) =>
              sum +
              (new Date(b.completed_at!).getTime() - new Date(b.checked_in_at!).getTime()),
            0
          ) / completedWithTimes.length
        : 0
    const avgWaitMinutes = Math.round(avgWaitMs / 60000)

    return NextResponse.json({
      analytics: {
        totalBookings: bookings.length,
        totalFarmers: farmerCount,
        totalCentres: centres.length,
        avgWaitMinutes,
        centreLoad,
        stageDistribution,
        peakHours,
        dailyBookings,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
