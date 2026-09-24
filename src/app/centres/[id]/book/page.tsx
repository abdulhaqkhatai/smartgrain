'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { useNotifications } from '@/hooks/useNotifications'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { formatDate, formatTime, GRAIN_TYPES } from '@/lib/utils'
import { Calendar, Clock, Users, Wheat, AlertCircle, CheckCircle } from 'lucide-react'
import type { Database } from '@/types/database'

type Centre = Database['public']['Tables']['centres']['Row']
type Slot = Database['public']['Tables']['slots']['Row']
type Booking = Database['public']['Tables']['bookings']['Row']

interface BookPageProps {
  params: Promise<{ id: string }>
}

export default function BookSlotPage({ params }: BookPageProps) {
  const { id: centreId } = use(params)
  const { profile } = useProfile()
  const { unreadCount } = useNotifications(profile?.id)
  const router = useRouter()

  const [centre, setCentre] = useState<Centre | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [grainType, setGrainType] = useState('')
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<Booking | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [estimatedPosition, setEstimatedPosition] = useState<number | null>(null)

  // Generate next 14 days for date picker
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('centres')
      .select('*')
      .eq('id', centreId)
      .single()
      .then(({ data }) => {
        setCentre(data)
        setLoading(false)
        if (data?.grain_types?.length) setGrainType(data.grain_types[0])
      })
  }, [centreId])

  useEffect(() => {
    if (!selectedDate) return
    setSlotsLoading(true)
    const supabase = createClient()
    supabase
      .from('slots')
      .select('*')
      .eq('centre_id', centreId)
      .eq('slot_date', selectedDate)
      .eq('is_active', true)
      .order('start_time')
      .then(({ data }) => {
        setSlots(data || [])
        setSelectedSlot(null)
        setSlotsLoading(false)
      })
  }, [selectedDate, centreId])

  useEffect(() => {
    if (!selectedSlot) { setEstimatedPosition(null); return }
    // Estimate position = current booked_count + 1
    setEstimatedPosition(selectedSlot.booked_count + 1)
  }, [selectedSlot])

  const handleBook = async () => {
    if (!profile || !selectedSlot || !grainType || !quantity) return
    setBooking(true)
    setError('')

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('book_slot', {
      p_farmer_id: profile.id,
      p_slot_id: selectedSlot.id,
      p_grain_type: grainType,
      p_estimated_quantity_kg: parseFloat(quantity),
    })

    if (rpcError) {
      if (rpcError.message.includes('SLOT_FULL')) {
        setError('This slot is now full. Please select another slot.')
        // Refresh slots
        const { data: refreshed } = await supabase
          .from('slots')
          .select('*')
          .eq('centre_id', centreId)
          .eq('slot_date', selectedDate)
          .eq('is_active', true)
          .order('start_time')
        setSlots(refreshed || [])
        setSelectedSlot(null)
      } else if (rpcError.message.includes('SLOT_INACTIVE')) {
        setError('This slot has been closed. Please choose another.')
        setSelectedSlot(null)
      } else {
        setError(rpcError.message)
      }
      setBooking(false)
      setConfirmOpen(false)
      return
    }

    // Send booking_confirmed notification
    await supabase.functions.invoke('send-notification', {
      body: {
        farmer_id: profile.id,
        phone: profile.phone,
        message: `Booking confirmed! Reference: ${(data as Booking).booking_reference}. Slot: ${formatDate(selectedDate)} ${formatTime(selectedSlot.start_time)}. Centre: ${centre?.name}.`,
        type: 'booking_confirmed',
        booking_id: (data as Booking).id,
        channel: 'in_app',
      },
    })

    setSuccess(data as Booking)
    setBooking(false)
    setConfirmOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar role="farmer" unreadCount={unreadCount} />
        <main className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500 mb-6">Your slot has been successfully booked.</p>
          <Card className="text-left mb-6">
            <CardContent className="py-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reference</span>
                <span className="font-mono font-semibold">{success.booking_reference}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Centre</span>
                <span className="font-medium">{centre?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Slot</span>
                <span className="font-medium">
                  {selectedSlot && `${formatTime(selectedSlot.start_time)} – ${formatTime(selectedSlot.end_time)}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Grain</span>
                <span className="font-medium capitalize">{grainType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Quantity (est.)</span>
                <span className="font-medium">{quantity} kg</span>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
            <Button className="flex-1" onClick={() => router.push(`/bookings/${success.id}`)}>
              Track Status
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const grainOptions = (centre?.grain_types || []).map((g) => ({
    value: g,
    label: g.charAt(0).toUpperCase() + g.slice(1),
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" unreadCount={unreadCount} />

      <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book a Slot</h1>
          <p className="text-gray-500 text-sm mt-1">{centre?.name}</p>
        </div>

        {/* Step 1: Date */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-green-600" />
              Step 1: Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {dateOptions.map((date) => {
                const d = new Date(date)
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`p-2 rounded-lg text-center text-xs border transition-all ${
                      selectedDate === date
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-green-400'
                    }`}
                  >
                    <div className="font-medium">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                    <div className="text-[11px] opacity-75">
                      {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Slot */}
        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-green-600" />
                Step 2: Select Time Slot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {slotsLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No slots available for this date.
                </p>
              ) : (
                <div className="space-y-2">
                  {slots.map((slot) => {
                    const isFull = slot.booked_count >= slot.capacity
                    const remaining = slot.capacity - slot.booked_count
                    const pct = (slot.booked_count / slot.capacity) * 100

                    return (
                      <button
                        key={slot.id}
                        disabled={isFull}
                        onClick={() => setSelectedSlot(slot)}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          selectedSlot?.id === slot.id
                            ? 'border-green-500 bg-green-50'
                            : isFull
                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 bg-white hover:border-green-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                          </span>
                          <span className={`text-xs font-medium ${isFull ? 'text-red-500' : 'text-green-600'}`}>
                            {isFull ? 'Full' : `${remaining} left`}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 80 ? 'bg-red-400' : pct >= 50 ? 'bg-amber-400' : 'bg-green-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <Users className="h-3 w-3" />
                          {slot.booked_count} / {slot.capacity} booked
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Grain & Quantity */}
        {selectedSlot && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wheat className="h-5 w-5 text-green-600" />
                Step 3: Grain Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Grain Type"
                options={grainOptions}
                value={grainType}
                onChange={(e) => setGrainType(e.target.value)}
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Estimated Quantity (kg)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50000"
                  step="0.1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 500"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {estimatedPosition && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0" />
                  Estimated queue position: <strong>#{estimatedPosition}</strong>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Confirm Button */}
        {selectedSlot && quantity && grainType && (
          <Button
            className="w-full"
            size="lg"
            onClick={() => setConfirmOpen(true)}
          >
            Review & Confirm Booking
          </Button>
        )}

        {/* Confirm Modal */}
        {confirmOpen && selectedSlot && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Booking</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Centre</span>
                    <span className="font-medium">{centre?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium">{formatDate(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time Slot</span>
                    <span className="font-medium">
                      {formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Grain</span>
                    <span className="font-medium capitalize">{grainType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Quantity (est.)</span>
                    <span className="font-medium">{quantity} kg</span>
                  </div>
                  {estimatedPosition && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Est. Queue Position</span>
                      <span className="font-semibold text-green-700">#{estimatedPosition}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmOpen(false)}
                    disabled={booking}
                  >
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleBook} loading={booking}>
                    Confirm
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
