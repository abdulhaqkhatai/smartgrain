import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile as { role: string } | null)?.role

  if (role === 'admin') redirect('/admin/analytics')
  if (role === 'staff') redirect('/staff/dashboard')
  redirect('/dashboard')
}
