'use client'

import { useEffect, useState, useCallback } from 'react'
import type { NotificationType, NotificationChannel } from '@/lib/mongodb/models'

export interface AppNotification {
  id: string
  farmer_id: string
  booking_id?: string | null
  type: NotificationType
  channel: NotificationChannel
  message: string
  sent_at: string
  delivery_status: string
  read_at?: string | null
}

export function useNotifications(farmerId?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (!farmerId) return
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch {
      // Ignore network errors on background poll
    }
  }, [farmerId])

  useEffect(() => {
    fetchNotifications()
    // Poll every 8 seconds for live notifications without needing replica sets
    const interval = setInterval(fetchNotifications, 8000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch {
      // Error handling
    }
  }

  return { notifications, unreadCount, markAllRead, refresh: fetchNotifications }
}
