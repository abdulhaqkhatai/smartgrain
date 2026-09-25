'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Bell, Menu, X, Wheat, UserCircle2, LogIn, LogOut } from 'lucide-react'
import type { UserRole } from '@/lib/mongodb/models'
import { useProfile } from '@/hooks/useProfile'

interface NavbarProps {
  role?: UserRole
  unreadCount?: number
}

export function Navbar({ unreadCount = 0 }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { profile } = useProfile()

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/centres', label: 'Find Centres' },
    { href: '/dashboard', label: 'Farmer Portal' },
    { href: '/bookings', label: 'My Bookings' },
    { href: '/staff/queue', label: 'Staff Queue' },
    { href: '/admin/analytics', label: 'Admin Analytics' },
  ]

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const isGuest = !profile || (profile as any).isGuest

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-green-700 text-lg">
            <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center text-white shadow-2xs">
              <Wheat className="h-5 w-5" />
            </div>
            <span>GrainProcure</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1 text-sm font-medium text-slate-600">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-700 font-semibold'
                      : 'hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <Link
              href="/notifications"
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Auth / Profile status */}
            {!isGuest ? (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {profile?.full_name}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize">{profile?.role}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                  Direct Mode
                </span>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200 transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-100 space-y-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3.5 py-2 text-sm font-medium rounded-lg ${
                    isActive ? 'bg-green-50 text-green-700 font-semibold' : 'text-slate-600'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-3">
              {!isGuest ? (
                <button
                  onClick={handleSignOut}
                  className="text-xs text-red-600 font-semibold py-1.5"
                >
                  Sign Out ({profile?.full_name})
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-xs text-green-700 font-semibold py-1.5"
                >
                  Sign In / Create Account
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
