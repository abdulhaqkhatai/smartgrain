import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient(
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect logged-in users away from auth pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profile as { role: string } | null)?.role
    const redirectTo =
      role === 'admin' ? '/admin/analytics' : role === 'staff' ? '/staff/dashboard' : '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  // Redirect unauthenticated users from protected routes
  const protectedPrefixes = ['/dashboard', '/centres', '/bookings', '/notifications', '/staff', '/admin']
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based access control
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profile as { role: string } | null)?.role

    if (pathname.startsWith('/staff') && role !== 'staff' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}
