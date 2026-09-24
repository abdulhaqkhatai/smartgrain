import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, phone, assigned_centre_id } = await req.json()

    if (!email || !password || !full_name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use service role key to bypass RLS for admin operations
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Auth creation failed' }, { status: 400 })
    }

    // Insert profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      full_name,
      phone,
      role: 'staff',
      assigned_centre_id: assigned_centre_id || null,
    })

    if (profileError) {
      // Clean up the auth user if profile insert fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, user_id: authData.user.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
