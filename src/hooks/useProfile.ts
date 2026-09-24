'use client'

import { useEffect, useState } from 'react'
import type { UserRole } from '@/lib/mongodb/models'

export interface UserProfile {
  id: string
  full_name: string
  email: string
  phone: string
  role: UserRole
  assigned_centre_id?: string | null
  village?: string | null
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated')
        return res.json()
      })
      .then((data) => {
        setProfile(data.user)
      })
      .catch(() => {
        setProfile(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return { profile, loading }
}
