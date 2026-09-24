'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { useNotifications } from '@/hooks/useNotifications'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  STAGE_LABELS,
  STAGE_COLORS,
  PAYMENT_LABELS,
  PAYMENT_COLORS,
  formatDate,
  formatTime,
  formatCurrency,
} from '@/lib/utils'
import Link from 'next/link'
import { CalendarPlus, Clock, Hash, MapPin, Wheat, TrendingUp } from 'lucide-react'
import type { Database } from '@/types/database'

type Booking = Database['public']['Tables']['bookings']['Row']
type LiveQueue = Database['public']['Views']['live_queue']['Row']
type Slot = Database['public']['Tables']['slots']['Row']
type Centre = Database['public']['Tables']['centres']['Row']

interface ActiveBooking extends Booking {
  slots: Slot & { centres: Centre }
}

export default function FarmerDashboard() {
  const { profile, loading: profileLoading } = useProfile()
  const { unreadCount } = useNotifications(profile?.id)
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null)
  const [queueInfo, setQueueInfo] = useState<LiveQueue | null>(null)
  const [recentBookings, setRecentBookings] = useState<ActiveBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    const fetchData = async () => {
      const supabase = createClient()

      // Get active bookings (not cancelled/procured/rejected/no_show)
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*, slots(*, centres(*))')
        .eq('farmer_id', profile.id)
        .not('procurement_stage', 'in', '(cancelled,procured,rejected,no_show)')
        .order('booked_at', { ascending: false })
        .limit(1)

      if (bookings && bookings.length > 0) {
        setActiveBooking(bookings[0] as ActiveBooking)

        // Get queue position for active booking
        const { data: queue } = await supabase
          .from('live_queue')
          .select('*')
          .eq('booking_id', bookings[0].id)
          .single()
        setQueueInfo(queue)
      }

      // Recent bookings
      const { data: recent } = await supabase
        .from('bookings')
        .select('*, slots(*, centres(*))')
        .eq('farmer_id', profile.id)
        .order('booked_at', { ascending: false })
        .limit(5)
      setRecentBookings((recent || []) as ActiveBooking[])

      setLoading(false)
    }

    fetchData()

    // Realtime subscription for booking updates
    const supabase = createClient()
    const channel = supabase
      .channel('farmer-bookings-' + profile.id)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `farmer_id=eq.${profile.id}`,
        },
        () => fetchData()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const estimatedWaitMin = queueInfo ? Math.max(0, (Number(queueInfo.queue_position) - 1) * 15) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" unreadCount={unreadCount} />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>

        {/* Active Booking Card */}
        {activeBooking ? (
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-white">
            <CardHeader className="border-green-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-green-800">Active Booking</CardTitle>
                <Badge className={STAGE_COLORS[activeBooking.procurement_stage]}>
                  {STAGE_LABELS[activeBooking.procurement_stage]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                {queueInfo && (
                  <div className="col-span-2 bg-white rounded-xl p-4 border border-green-100 text-center">
                    <div className="text-5xl font-bold text-green-700">
                      #{queueInfo.queue_position}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      of {queueInfo.total_in_queue} in queue
                    </div>
                    {estimatedWaitMin > 0 && (
                      <div className="flex items-center justify-center gap-1 mt-2 text-sm text-amber-600">
                        <Clock className="h-4 w-4" />
                        Est. wait: ~{estimatedWaitMin} min
                      </div>
                    )}
                    {queueInfo.queue_position === 1 && (
                      <div className="mt-2 text-sm font-semibold text-green-700 animate-pulse">
                        🎉 It&apos;s your turn! Please report to the centre.
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Hash className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-gray-500">Booking Ref</div>
                    <div className="text-sm font-mono font-medium">{activeBooking.booking_reference}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Wheat className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-gray-500">Grain Type</div>
                    <div className="text-sm font-medium capitalize">{activeBooking.grain_type}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-gray-500">Centre</div>
                    <div className="text-sm font-medium">
                      {(activeBooking.slots as ActiveBooking['slots'])?.centres?.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-gray-500">Slot Date</div>
                    <div className="text-sm font-medium">
                      {formatDate((activeBooking.slots as ActiveBooking['slots'])?.slot_date)}
                    </div>
                  </div>
                </div>

                {activeBooking.payment_stage !== 'not_applicable' && (
                  <div className="col-span-2 flex items-center justify-between border-t border-green-100 pt-3 mt-1">
                    <span className="text-sm text-gray-500">Payment Status</span>
                    <Badge className={PAYMENT_COLORS[activeBooking.payment_stage]}>
                      {PAYMENT_LABELS[activeBooking.payment_stage]}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Link href={`/bookings/${activeBooking.id}`} className="flex-1">
                  <Button variant="outline" className="w-full" size="sm">
                    View Details
                  </Button>
                </Link>
                <Link href="/bookings" className="flex-1">
                  <Button variant="ghost" className="w-full" size="sm">
                    All Bookings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="py-12 text-center">
              <CalendarPlus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">No Active Bookings</h3>
              <p className="text-gray-400 text-sm mt-1">Book a slot at a nearby procurement centre</p>
              <Link href="/centres">
                <Button className="mt-4">Find a Centre & Book</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link href="/centres">
            <Card className="hover:border-green-300 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="py-5 text-center">
                <MapPin className="h-7 w-7 text-green-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-gray-700">Find Centre</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/bookings">
            <Card className="hover:border-green-300 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="py-5 text-center">
                <CalendarPlus className="h-7 w-7 text-blue-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-gray-700">My Bookings</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/notifications">
            <Card className="hover:border-green-300 hover:shadow-md transition-all cursor-pointer col-span-2 sm:col-span-1">
              <CardContent className="py-5 text-center">
                <TrendingUp className="h-7 w-7 text-amber-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-gray-700">Notifications</div>
                {unreadCount > 0 && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent className="px-0 py-0">
              <div className="divide-y divide-gray-50">
                {recentBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/bookings/${booking.id}`}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-mono font-medium text-gray-700">
                        {booking.booking_reference}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 capitalize">
                        {booking.grain_type} · {formatDate(booking.booked_at)}
                      </div>
                    </div>
                    <Badge className={STAGE_COLORS[booking.procurement_stage]}>
                      {STAGE_LABELS[booking.procurement_stage]}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
