import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Find bookings where queue_position is 1 or 2 (use the live_queue view)
    const { data: queueItems, error } = await supabase
      .from('live_queue')
      .select('booking_id, farmer_id, booking_reference, queue_position, centre_id')
      .lte('queue_position', 2)
      .eq('slot_date', new Date().toISOString().split('T')[0])

    if (error) throw error

    for (const item of queueItems || []) {
      // Get farmer phone
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, full_name')
        .eq('id', item.farmer_id)
        .single()

      if (!profile) continue

      // Check if we already sent a your_turn notification for this booking today
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('booking_id', item.booking_id)
        .eq('type', 'your_turn')
        .gte('sent_at', new Date().toISOString().split('T')[0])
        .single()

      if (existingNotif) continue // Already notified

      const message = item.queue_position === 1
        ? `Dear ${profile.full_name}, it's your turn! Please report to the centre now. Booking: ${item.booking_reference}`
        : `Dear ${profile.full_name}, you are next in queue (#${item.queue_position}). Please be ready. Booking: ${item.booking_reference}`

      // Send via edge function
      await supabase.functions.invoke('send-notification', {
        body: {
          farmer_id: item.farmer_id,
          phone: profile.phone,
          message,
          type: 'your_turn',
          booking_id: item.booking_id,
          channel: 'sms',
        },
      })
    }

    // 24h reminders
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: upcomingBookings } = await supabase
      .from('bookings')
      .select('id, farmer_id, booking_reference, slots(slot_date)')
      .eq('procurement_stage', 'booked')

    for (const booking of upcomingBookings || []) {
      const slot = (booking.slots as unknown as { slot_date: string })
      if (!slot?.slot_date || slot.slot_date !== tomorrowStr) continue

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, full_name')
        .eq('id', booking.farmer_id)
        .single()

      if (!profile) continue

      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('type', 'booking_reminder_24h')
        .single()

      if (existingNotif) continue

      const message = `Reminder: Your grain procurement slot is tomorrow (${tomorrowStr}). Booking reference: ${booking.booking_reference}. Please arrive on time.`

      await supabase.functions.invoke('send-notification', {
        body: {
          farmer_id: booking.farmer_id,
          phone: profile.phone,
          message,
          type: 'booking_reminder_24h',
          booking_id: booking.id,
          channel: 'sms',
        },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
