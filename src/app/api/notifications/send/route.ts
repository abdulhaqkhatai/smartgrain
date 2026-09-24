import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { farmer_id, phone, message, type, booking_id, channel } = body

    if (!farmer_id || !message || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let delivery_status = 'sent'

    // Send SMS via Fast2SMS if channel is sms and phone provided
    if ((channel === 'sms' || channel === 'both') && phone) {
      const apiKey = process.env.FAST2SMS_API_KEY!
      const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10)

      try {
        const smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'q',
            message,
            language: 'english',
            flash: 0,
            numbers: cleanPhone,
          }),
        })
        const smsData = await smsRes.json()
        delivery_status = smsData.return === true ? 'sent' : 'failed'
      } catch {
        delivery_status = 'failed'
      }
    }

    // Always insert in-app notification
    const { error } = await supabase.from('notifications').insert({
      farmer_id,
      booking_id: booking_id || null,
      type,
      channel: channel || 'in_app',
      message,
      delivery_status,
    })

    if (error) throw error

    return NextResponse.json({ ok: true, delivery_status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
