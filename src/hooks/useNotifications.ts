'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

export function useNotifications(farmerId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!farmerId) return
    const supabase = createClient()

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('sent_at', { ascending: false })
        .limit(50)
      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter((n) => !n.read_at).length)
      }
    }

    fetchNotifications()

    const channel = supabase
      .channel('notifications:' + farmerId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `farmer_id=eq.${farmerId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [farmerId])

  const markAllRead = async () => {
    if (!farmerId) return
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('farmer_id', farmerId)
      .is('read_at', null)
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    setUnreadCount(0)
  }

  return { notifications, unreadCount, markAllRead }
}
