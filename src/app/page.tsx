import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'

export default async function RootPage() {
  const session = await getSessionUser()

  if (!session) redirect('/login')

  if (session.role === 'admin') redirect('/admin/analytics')
  if (session.role === 'staff') redirect('/staff/dashboard')
  redirect('/dashboard')
}
