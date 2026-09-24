'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Bell, Menu, X, Wheat } from 'lucide-react'
import type { UserRole } from '@/types/database'

interface NavbarProps {
  role?: UserRole
  unreadCount?: number
}

export function Navbar({ role = 'farmer', unreadCount = 0 }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const farmerLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/centres', label: 'Find Centres' },
    { href: '/bookings', label: 'My Bookings' },
    { href: '/notifications', label: 'Notifications' },
  ]

  const staffLinks = [
    { href: '/staff/dashboard', label: 'Dashboard' },
    { href: '/staff/queue', label: 'Live Queue' },
    { href: '/staff/slots', label: 'Slot Management' },
  ]

  const adminLinks = [
    { href: '/admin/centres', label: 'Centres' },
    { href: '/admin/staff', label: 'Staff' },
    { href: '/admin/analytics', label: 'Analytics' },
  ]

  const links =
    role === 'admin' ? adminLinks : role === 'staff' ? staffLinks : farmerLinks

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const homeHref =
    role === 'admin' ? '/admin/analytics' : role === 'staff' ? '/staff/dashboard' : '/dashboard'

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={homeHref} className="flex items-center gap-2 font-bold text-green-700">
            <Wheat className="h-6 w-6" />
            <span className="hidden sm:block">GrainProcure</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {role === 'farmer' && (
              <Link href="/notifications" className="relative p-2 text-gray-500 hover:text-gray-700">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="hidden md:block text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50"
            >
              Sign Out
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-500"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-3 border-t border-gray-100 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium rounded-lg ${
                  pathname.startsWith(link.href) ? 'bg-green-50 text-green-700' : 'text-gray-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-4 py-2.5 text-sm text-red-600 font-medium rounded-lg hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
