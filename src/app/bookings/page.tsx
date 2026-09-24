'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useNotifications } from '@/hooks/useNotifications'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { STAGE_LABELS, STAGE_COLORS, PAYMENT_LABELS, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { CalendarPlus } from 'lucide-react'

export default function BookingsPage() {
  const { profile } = useProfile()
  const { unreadCount } = useNotifications(profile?.id)
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bookings')
      .then((res) => res.json())
      .then((data) => {
        setBookings(data.bookings || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" unreadCount={unreadCount} />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-500 text-sm mt-1">All your slot booking history</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16">
            <CalendarPlus className="h-14 w-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No bookings yet</p>
            <Link
              href="/centres"
              className="mt-4 inline-block text-sm text-green-600 font-medium hover:underline"
            >
              Find a centre and book your first slot →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Link key={booking.id} href={`/bookings/${booking.id}`}>
                <Card className="hover:border-green-300 hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-semibold text-gray-800">
                            {booking.booking_reference}
                          </span>
                          <Badge className={STAGE_COLORS[booking.procurement_stage]}>
                            {STAGE_LABELS[booking.procurement_stage]}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 font-medium truncate">
                          {booking.slots?.centres?.name || 'Procurement Centre'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 capitalize">
                          {booking.grain_type} · {booking.estimated_quantity_kg} kg ·{' '}
                          {formatDate(booking.slots?.slot_date || booking.booked_at)}
                        </div>
                        {booking.payment_stage !== 'not_applicable' && (
                          <div className="text-xs text-gray-500 mt-1">
                            Payment: {PAYMENT_LABELS[booking.payment_stage]}
                            {booking.payment_amount &&
                              ` · ₹${booking.payment_amount.toLocaleString('en-IN')}`}
                          </div>
                        )}
                      </div>
                      <span className="text-gray-300 text-lg">›</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
