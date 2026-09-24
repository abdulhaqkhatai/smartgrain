import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Auth pages — redirect if already logged in
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    const profile = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const role = profile.data?.role
    const redirectTo = role === 'admin' ? '/admin/analytics'
      : role === 'staff' ? '/staff/dashboard'
      : '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  // Protected routes
  if (!user && (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/centres') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/admin')
  )) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based route protection
  if (user) {
    const profile = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const role = profile.data?.role

    if (pathname.startsWith('/staff') && role !== 'staff' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}
