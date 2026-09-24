import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb/db'
import { Notification } from '@/lib/mongodb/models'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { farmer_id, phone, message, type, booking_id, channel } = body

    if (!farmer_id || !message || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await connectDB()

    let delivery_status = 'sent'

    // Send SMS via Fast2SMS if channel is sms and phone provided
    if ((channel === 'sms' || channel === 'both') && phone) {
      const apiKey = process.env.FAST2SMS_API_KEY
      const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10)

      if (apiKey && apiKey !== 'your-fast2sms-api-key') {
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
    }

    // Insert into MongoDB notifications collection
    const notif = await Notification.create({
      farmer_id,
      booking_id: booking_id || null,
      type,
      channel: channel || 'in_app',
      message,
      sent_at: new Date(),
      delivery_status,
    })

    return NextResponse.json({ ok: true, delivery_status, id: notif._id.toString() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
