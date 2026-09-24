'use client'

import { useProfile } from '@/hooks/useProfile'
import { useNotifications } from '@/hooks/useNotifications'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Bell, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TYPE_ICONS: Record<string, string> = {
  booking_confirmed: '✅',
  queue_reminder: '⏰',
  your_turn: '🔔',
  stage_update: '📋',
  payment_update: '💰',
  cancelled: '❌',
  booking_reminder_24h: '📅',
}

export default function NotificationsPage() {
  const { profile, loading: profileLoading } = useProfile()
  const { notifications, unreadCount, markAllRead } = useNotifications(profile?.id)

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" unreadCount={unreadCount} />

      <main className="max-w-xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="h-14 w-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <Card
                key={notif.id}
                className={notif.read_at ? 'opacity-70' : 'border-blue-200 bg-blue-50/30'}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="text-2xl shrink-0">
                    {TYPE_ICONS[notif.type] || '📢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notif.sent_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {notif.channel === 'sms' && (
                        <span className="ml-2 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">
                          SMS
                        </span>
                      )}
                    </p>
                  </div>
                  {!notif.read_at && (
                    <div className="h-2 w-2 bg-blue-500 rounded-full shrink-0 mt-1" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
