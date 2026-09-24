import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { farmer_id, phone, message, type, booking_id, channel } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    let delivery_status = 'sent'

    if (channel === 'sms' && phone) {
      const fast2smsApiKey = Deno.env.get('FAST2SMS_API_KEY')!
      
      const smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2smsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: message,
          language: 'english',
          flash: 0,
          numbers: phone.replace(/\D/g, '').replace(/^91/, '').substring(0, 10),
        }),
      })

      const smsData = await smsRes.json()
      delivery_status = smsData.return === true ? 'sent' : 'failed'
    }

    // Always log to notifications table
    const { error } = await supabase.from('notifications').insert({
      farmer_id,
      booking_id: booking_id || null,
      type,
      channel: channel || 'in_app',
      message,
      delivery_status,
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ ok: true, delivery_status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
