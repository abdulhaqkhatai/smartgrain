'use client'

import { useEffect, useState, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  CheckCircle2,
  Circle,
  Clock,
  Hash,
  MapPin,
  Wheat,
  AlertTriangle,
} from 'lucide-react'
import type { ProcurementStage } from '@/lib/mongodb/models'

const STAGE_ORDER: ProcurementStage[] = [
  'booked',
  'checked_in',
  'quality_check',
  'weighed',
  'procured',
]

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = use(params)
  const { profile } = useProfile()
  const { unreadCount } = useNotifications(profile?.id)
  const router = useRouter()

  const [booking, setBooking] = useState<any | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [queueInfo, setQueueInfo] = useState<{ queue_position: number; total_in_queue: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`)
      if (!res.ok) throw new Error('Booking not found')
      const data = await res.json()
      setBooking(data.booking)
      setLogs(data.logs || [])
      setQueueInfo(data.queueInfo)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 8000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const handleCancel = async () => {
    if (!booking) return
    setCancelling(true)
    setError('')

    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { method: 'PATCH' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to cancel')
      } else {
        await fetchAll()
        setCancelConfirm(false)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar role="farmer" unreadCount={unreadCount} />
        <div className="max-w-xl mx-auto px-4 py-12 text-center text-gray-500">
          Booking not found.
        </div>
      </div>
    )
  }

  const isTerminal = ['procured', 'rejected', 'cancelled', 'no_show'].includes(
    booking.procurement_stage
  )
  const canCancel = booking.procurement_stage === 'booked'
  const estimatedWaitMin = queueInfo
    ? Math.max(0, (Number(queueInfo.queue_position) - 1) * 15)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" unreadCount={unreadCount} />

      <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-mono">
              {booking.booking_reference}
            </h1>
            <p className="text-gray-500 text-sm">
              {booking.slots?.centres?.name || 'Procurement Centre'}
            </p>
          </div>
          <Badge className={STAGE_COLORS[booking.procurement_stage]}>
            {STAGE_LABELS[booking.procurement_stage]}
          </Badge>
        </div>

        {/* Queue Position (if active) */}
        {queueInfo && !isTerminal && (
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-white">
            <CardContent className="py-4 text-center">
              <div className="text-5xl font-bold text-green-700">#{queueInfo.queue_position}</div>
              <div className="text-sm text-gray-500 mt-1">
                of {queueInfo.total_in_queue} in today&apos;s queue (Live FIFO)
              </div>
              {estimatedWaitMin > 0 && (
                <div className="flex items-center justify-center gap-1 mt-2 text-sm text-amber-600 font-medium">
                  <Clock className="h-4 w-4" />
                  Est. wait: ~{estimatedWaitMin} min
                </div>
              )}
              {queueInfo.queue_position === 1 && (
                <p className="mt-2 text-sm font-semibold text-green-700 animate-pulse">
                  🎉 It&apos;s your turn! Go to the centre now.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row
              icon={<MapPin className="h-4 w-4" />}
              label="Centre"
              value={booking.slots?.centres?.name}
            />
            <Row
              icon={<Clock className="h-4 w-4" />}
              label="Slot Date"
              value={formatDate(booking.slots?.slot_date || booking.booked_at)}
            />
            <Row
              icon={<Clock className="h-4 w-4" />}
              label="Time"
              value={
                booking.slots
                  ? `${formatTime(booking.slots.start_time)} – ${formatTime(booking.slots.end_time)}`
                  : '—'
              }
            />
            <Row icon={<Wheat className="h-4 w-4" />} label="Grain" value={booking.grain_type} capitalize />
            <Row
              icon={<Hash className="h-4 w-4" />}
              label="Est. Quantity"
              value={`${booking.estimated_quantity_kg} kg`}
            />
            {booking.actual_quantity_kg && (
              <Row
                icon={<Hash className="h-4 w-4" />}
                label="Actual Quantity"
                value={`${booking.actual_quantity_kg} kg`}
              />
            )}
            {booking.payment_stage !== 'not_applicable' && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-500">Payment</span>
                <div className="flex items-center gap-2">
                  {booking.payment_amount && (
                    <span className="font-medium">{formatCurrency(booking.payment_amount)}</span>
                  )}
                  <Badge className={PAYMENT_COLORS[booking.payment_stage]}>
                    {PAYMENT_LABELS[booking.payment_stage]}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {booking.procurement_stage === 'rejected' ||
            booking.procurement_stage === 'cancelled' ||
            booking.procurement_stage === 'no_show' ? (
              <div className="flex items-center gap-3 py-2">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-red-700">
                    {STAGE_LABELS[booking.procurement_stage]}
                  </div>
                  {booking.cancelled_at && (
                    <div className="text-xs text-gray-400">
                      {new Date(booking.cancelled_at).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {STAGE_ORDER.map((stage, idx) => {
                  const stageIdx = STAGE_ORDER.indexOf(booking.procurement_stage as ProcurementStage)
                  const done = idx < stageIdx || booking.procurement_stage === 'procured'
                  const current = stage === booking.procurement_stage
                  const logEntry = logs.find((l) => l.new_stage === stage)

                  return (
                    <div key={stage} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            done || (current && stage === 'procured')
                              ? 'bg-green-600 text-white'
                              : current
                              ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          {done || (current && stage === 'procured') ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : current ? (
                            <Clock className="h-3 w-3" />
                          ) : (
                            <Circle className="h-3 w-3" />
                          )}
                        </div>
                        {idx < STAGE_ORDER.length - 1 && (
                          <div
                            className={`w-0.5 h-6 ${
                              done ? 'bg-green-400' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>
                      <div className="pb-2 pt-0.5">
                        <div
                          className={`text-sm font-medium ${
                            done || current ? 'text-gray-900' : 'text-gray-400'
                          }`}
                        >
                          {STAGE_LABELS[stage]}
                        </div>
                        {logEntry && (
                          <div className="text-xs text-gray-400">
                            {new Date(logEntry.changed_at).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {canCancel && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setCancelConfirm(true)}
          >
            Cancel Booking
          </Button>
        )}
      </main>

      {/* Cancel Confirm Modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">
              Cancel Booking?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will cancel your booking for {booking.booking_reference}. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCancelConfirm(false)}
                disabled={cancelling}
              >
                Keep Booking
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleCancel}
                loading={cancelling}
              >
                Yes, Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({
  icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ReactNode
  label: string
  value?: string | null
  capitalize?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        {label}
      </div>
      <span className={`font-medium text-gray-900 ${capitalize ? 'capitalize' : ''}`}>
        {value || '—'}
      </span>
    </div>
  )
}
