'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { STAGE_LABELS, STAGE_COLORS } from '@/lib/utils'
import { Users, RefreshCw, ChevronRight } from 'lucide-react'
import type { Database, ProcurementStage } from '@/types/database'

type LiveQueue = Database['public']['Views']['live_queue']['Row']

const NEXT_STAGE: Partial<Record<ProcurementStage, ProcurementStage>> = {
  booked: 'checked_in',
  checked_in: 'quality_check',
  quality_check: 'weighed',
  weighed: 'procured',
}

const STAGE_BUTTON_LABELS: Partial<Record<ProcurementStage, string>> = {
  booked: 'Check In',
  checked_in: 'Quality Check ✓',
  quality_check: 'Weighed ✓',
  weighed: 'Mark Procured',
}

export default function StaffQueuePage() {
  const { profile } = useProfile()
  const [queue, setQueue] = useState<LiveQueue[]>([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [noShowIds, setNoShowIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [actualQty, setActualQty] = useState<Record<string, string>>({})
  const [paymentAmt, setPaymentAmt] = useState<Record<string, string>>({})

  const today = new Date().toISOString().split('T')[0]

  const fetchQueue = async () => {
    if (!profile?.assigned_centre_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('live_queue')
      .select('*')
      .eq('centre_id', profile.assigned_centre_id)
      .eq('slot_date', today)
      .order('queue_position')
    setQueue(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!profile?.assigned_centre_id) return

    fetchQueue()

    const supabase = createClient()
    const channel = supabase
      .channel('staff-queue-' + profile.assigned_centre_id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `centre_id=eq.${profile.assigned_centre_id}`,
      }, fetchQueue)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const advanceStage = async (item: LiveQueue) => {
    if (!profile) return
    const nextStage = NEXT_STAGE[item.procurement_stage as ProcurementStage]
    if (!nextStage) return

    setAdvancing(item.booking_id)
    const supabase = createClient()

    const args: Record<string, unknown> = {
      p_booking_id: item.booking_id,
      p_new_stage: nextStage,
      p_staff_id: profile.id,
    }

    if (actualQty[item.booking_id]) {
      args.p_actual_quantity_kg = parseFloat(actualQty[item.booking_id])
    }
    if (paymentAmt[item.booking_id] && nextStage === 'procured') {
      args.p_payment_amount = parseFloat(paymentAmt[item.booking_id])
    }

    const { error } = await supabase.rpc('update_booking_stage', args as any)

    if (!error) {
      // Send stage_update notification
      const { data: farmerProfile } = await supabase
        .from('profiles')
        .select('phone, full_name')
        .eq('id', item.farmer_id)
        .single()

      if (farmerProfile) {
        await supabase.functions.invoke('send-notification', {
          body: {
            farmer_id: item.farmer_id,
            phone: farmerProfile.phone,
            message: `Update for booking ${item.booking_reference}: Stage changed to ${STAGE_LABELS[nextStage]}.`,
            type: nextStage === 'procured' ? 'payment_update' : 'stage_update',
            booking_id: item.booking_id,
            channel: 'in_app',
          },
        })
      }
    }

    setAdvancing(null)
    await fetchQueue()
  }

  const markNoShow = async (item: LiveQueue) => {
    if (!profile) return
    setNoShowIds((prev) => new Set([...prev, item.booking_id]))
    const supabase = createClient()
    await supabase.rpc('update_booking_stage', {
      p_booking_id: item.booking_id,
      p_new_stage: 'no_show',
      p_staff_id: profile.id,
    } as any)
    await fetchQueue()
    setNoShowIds((prev) => { const n = new Set(prev); n.delete(item.booking_id); return n })
  }

  const filtered = queue.filter((item) => {
    if (!search) return true
    const q = search.toLowerCase()
    return item.booking_reference.toLowerCase().includes(q) || item.farmer_id.includes(q)
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="staff" />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Queue Board</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {queue.length} farmer{queue.length !== 1 ? 's' : ''} in today&apos;s queue
            </p>
          </div>
          <button
            onClick={fetchQueue}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by booking reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Queue is empty for today</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const isAdvancing = advancing === item.booking_id
              const isNoShow = noShowIds.has(item.booking_id)
              const nextStage = NEXT_STAGE[item.procurement_stage as ProcurementStage]
              const needsWeight = item.procurement_stage === 'quality_check'
              const needsPayment = item.procurement_stage === 'weighed'

              return (
                <Card
                  key={item.booking_id}
                  className={`transition-all ${item.queue_position === 1 ? 'border-green-400 bg-green-50/30' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Position number */}
                      <div
                        className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold ${
                          item.queue_position === 1
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.queue_position}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold">
                            {item.booking_reference}
                          </span>
                          <Badge className={STAGE_COLORS[item.procurement_stage]}>
                            {STAGE_LABELS[item.procurement_stage]}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 capitalize">
                          {item.grain_type} · {item.estimated_quantity_kg} kg est.
                        </div>

                        {/* Optional fields for weigh/payment */}
                        {(needsWeight || needsPayment) && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {needsWeight && (
                              <input
                                type="number"
                                placeholder="Actual kg"
                                value={actualQty[item.booking_id] || ''}
                                onChange={(e) =>
                                  setActualQty((prev) => ({
                                    ...prev,
                                    [item.booking_id]: e.target.value,
                                  }))
                                }
                                className="w-28 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            )}
                            {needsPayment && (
                              <input
                                type="number"
                                placeholder="Payment ₹"
                                value={paymentAmt[item.booking_id] || ''}
                                onChange={(e) =>
                                  setPaymentAmt((prev) => ({
                                    ...prev,
                                    [item.booking_id]: e.target.value,
                                  }))
                                }
                                className="w-28 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {nextStage && (
                          <Button
                            size="sm"
                            onClick={() => advanceStage(item)}
                            loading={isAdvancing}
                            className="text-xs"
                          >
                            {STAGE_BUTTON_LABELS[item.procurement_stage as ProcurementStage] || 'Next'}
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        )}
                        {['booked', 'checked_in'].includes(item.procurement_stage) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markNoShow(item)}
                            loading={isNoShow}
                            className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                          >
                            No Show
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
