'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { STAGE_LABELS, STAGE_COLORS, formatDate, formatTime } from '@/lib/utils'
import { Users, Clock, CheckCircle, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/types/database'

type Slot = Database['public']['Tables']['slots']['Row']
type Booking = Database['public']['Tables']['bookings']['Row']

interface SlotWithCount extends Slot {
  activeCount: number
}

export default function StaffDashboard() {
  const { profile, loading: profileLoading } = useProfile()
  const [todaySlots, setTodaySlots] = useState<SlotWithCount[]>([])
  const [recentBookings, setRecentBookings] = useState<(Booking & { profiles: { full_name: string } })[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, cancelled: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.assigned_centre_id) return

    const today = new Date().toISOString().split('T')[0]
    const supabase = createClient()

    const fetchData = async () => {
      // Today's slots
      const { data: slots } = await supabase
        .from('slots')
        .select('*')
        .eq('centre_id', profile.assigned_centre_id!)
        .eq('slot_date', today)
        .order('start_time')

      // Today's bookings for stats
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*, profiles(full_name)')
        .eq('centre_id', profile.assigned_centre_id!)
        .order('booked_at', { ascending: false })
        .limit(10)

      const allBookings = bookings || []
      const todayBookings = allBookings.filter((b) => b.booked_at.startsWith(today))

      setStats({
        total: todayBookings.length,
        active: todayBookings.filter((b) =>
          ['booked', 'checked_in', 'quality_check', 'weighed'].includes(b.procurement_stage)
        ).length,
        completed: todayBookings.filter((b) => b.procurement_stage === 'procured').length,
        cancelled: todayBookings.filter((b) =>
          ['cancelled', 'no_show', 'rejected'].includes(b.procurement_stage)
        ).length,
      })

      setTodaySlots(
        (slots || []).map((s) => ({
          ...s,
          activeCount: allBookings.filter(
            (b) =>
              b.slot_id === s.id &&
              ['booked', 'checked_in', 'quality_check', 'weighed'].includes(b.procurement_stage)
          ).length,
        }))
      )

      setRecentBookings(allBookings.slice(0, 8) as any)
      setLoading(false)
    }

    fetchData()
  }, [profile])

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="staff" />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {formatDate(new Date().toISOString())} · {profile?.full_name}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Today's Bookings", value: stats.total, icon: CalendarDays, color: 'text-blue-600' },
            { label: 'Active in Queue', value: stats.active, icon: Users, color: 'text-amber-600' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-green-600' },
            { label: 'Cancelled/Rejected', value: stats.cancelled, icon: Clock, color: 'text-red-500' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <stat.icon className={`h-6 w-6 ${stat.color} mb-2`} />
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Today's Slots */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today&apos;s Slots</CardTitle>
              <Link href="/staff/slots" className="text-sm text-green-600 hover:underline">
                Manage →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {todaySlots.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No slots configured for today.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {todaySlots.map((slot) => {
                  const pct = (slot.booked_count / slot.capacity) * 100
                  return (
                    <div key={slot.id} className="px-6 py-3.5 flex items-center gap-4">
                      <div className="w-28 shrink-0">
                        <div className="text-sm font-medium">{formatTime(slot.start_time)}</div>
                        <div className="text-xs text-gray-400">{formatTime(slot.end_time)}</div>
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 80 ? 'bg-red-400' : pct >= 50 ? 'bg-amber-400' : 'bg-green-400'}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {slot.booked_count}/{slot.capacity} booked · {slot.activeCount} in queue
                        </div>
                      </div>
                      {!slot.is_active && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Closed</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/staff/queue">
            <Card className="hover:border-green-300 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-5 text-center">
                <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="font-medium text-gray-700">Live Queue</div>
                <div className="text-xs text-gray-400 mt-0.5">Manage today&apos;s queue</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/staff/slots">
            <Card className="hover:border-green-300 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-5 text-center">
                <CalendarDays className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="font-medium text-gray-700">Slot Management</div>
                <div className="text-xs text-gray-400 mt-0.5">Configure capacity</div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent bookings */}
        {recentBookings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="divide-y divide-gray-50">
                {recentBookings.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <div className="text-sm font-mono font-medium">{b.booking_reference}</div>
                      <div className="text-xs text-gray-400">{b.profiles?.full_name} · {b.grain_type}</div>
                    </div>
                    <Badge className={STAGE_COLORS[b.procurement_stage as string]}>
                      {STAGE_LABELS[b.procurement_stage as string]}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
