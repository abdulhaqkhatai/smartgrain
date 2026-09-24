import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Wheat, MapPin, UserPlus, LogIn } from 'lucide-react'

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50">
        <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
          <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-3 text-green-700">
              <Wheat className="h-9 w-9" />
              <span className="text-lg font-bold tracking-wide">GrainProcure</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Smart grain procurement, without the queues.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-gray-600">
              Find nearby procurement centres, explore available services, and manage your booking when you are ready.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/centres" className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700">
                <MapPin className="h-4 w-4" />
                Browse Centres
              </Link>
              <Link href="/register" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 hover:bg-gray-50">
                <UserPlus className="h-4 w-4" />
                Create Account
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 px-4 py-3 font-medium text-green-700 hover:text-green-800">
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

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
