import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'smart_grain_procurement_jwt_secret_key_2026_sih_project'
)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth_token')?.value

  let userPayload: any = null
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      userPayload = payload
    } catch {
      userPayload = null
    }
  }

  // Auth pages: redirect to respective dashboard if already logged in
  if (userPayload && (pathname === '/login' || pathname === '/register')) {
    const role = userPayload.role
    const redirectTo =
      role === 'admin' ? '/admin/analytics' : role === 'staff' ? '/staff/dashboard' : '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  // Login is NOT compulsory for now — allow direct browsing to all pages (Home, Dashboard, Centres, Bookings, Staff, Admin)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/seed|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
