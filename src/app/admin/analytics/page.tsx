'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Users, Wheat, Building2, TrendingUp, Clock } from 'lucide-react'
import type { Database } from '@/types/database'
import { STAGE_LABELS } from '@/lib/utils'

type Booking = Database['public']['Tables']['bookings']['Row']
type Centre = Database['public']['Tables']['centres']['Row']

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2']

interface Analytics {
  totalBookings: number
  totalFarmers: number
  totalCentres: number
  avgWaitMinutes: number
  centreLoad: { name: string; bookings: number; completed: number }[]
  stageDistribution: { name: string; value: number }[]
  peakHours: { hour: string; count: number }[]
  dailyBookings: { date: string; bookings: number; completed: number }[]
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(30) // days

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      const supabase = createClient()
      const since = new Date()
      since.setDate(since.getDate() - dateRange)
      const sinceStr = since.toISOString()

      const [
        { data: bookings },
        { data: centres },
        { count: farmerCount },
      ] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, slots(slot_date, start_time)')
          .gte('booked_at', sinceStr),
        supabase.from('centres').select('*').eq('is_active', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'farmer'),
      ])

      const allBookings = (bookings || []) as any[]
      const allCentres = (centres || []) as Centre[]

      // Centre load
      const centreLoad = allCentres.map((c) => {
        const cb = allBookings.filter((b) => b.centre_id === c.id)
        return {
          name: c.code,
          bookings: cb.length,
          completed: cb.filter((b) => b.procurement_stage === 'procured').length,
        }
      }).sort((a, b) => b.bookings - a.bookings)

      // Stage distribution
      const stageCounts: Record<string, number> = {}
      allBookings.forEach((b) => {
        stageCounts[b.procurement_stage] = (stageCounts[b.procurement_stage] || 0) + 1
      })
      const stageDistribution = Object.entries(stageCounts).map(([k, v]) => ({
        name: STAGE_LABELS[k] || k,
        value: v,
      }))

      // Peak booking hours
      const hourCounts: Record<number, number> = {}
      allBookings.forEach((b) => {
        const hour = new Date(b.booked_at).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      })
      const peakHours = Array.from({ length: 24 }, (_, h) => ({
        hour: `${h}:00`,
        count: hourCounts[h] || 0,
      })).filter((h) => h.count > 0)

      // Daily bookings (last 14 days)
      const dailyMap: Record<string, { bookings: number; completed: number }> = {}
      allBookings.forEach((b) => {
        const day = b.booked_at.split('T')[0]
        if (!dailyMap[day]) dailyMap[day] = { bookings: 0, completed: 0 }
        dailyMap[day].bookings++
        if (b.procurement_stage === 'procured') dailyMap[day].completed++
      })
      const dailyBookings = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, vals]) => ({
          date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          ...vals,
        }))

      // Avg wait time (checked_in_at - booked_at for completed bookings)
      const completedWithTimes = allBookings.filter(
        (b) => b.procurement_stage === 'procured' && b.checked_in_at && b.booked_at
      )
      const avgWaitMs =
        completedWithTimes.length > 0
          ? completedWithTimes.reduce(
              (sum, b) =>
                sum +
                (new Date(b.checked_in_at).getTime() - new Date(b.booked_at).getTime()),
              0
            ) / completedWithTimes.length
          : 0
      const avgWaitMinutes = Math.round(avgWaitMs / 60000)

      setAnalytics({
        totalBookings: allBookings.length,
        totalFarmers: farmerCount || 0,
        totalCentres: allCentres.length,
        avgWaitMinutes,
        centreLoad,
        stageDistribution,
        peakHours,
        dailyBookings,
      })
      setLoading(false)
    }

    fetchAnalytics()
  }, [dateRange])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">System-wide performance overview</p>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(parseInt(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
        ) : analytics ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Bookings', value: analytics.totalBookings, icon: Wheat, color: 'text-green-600' },
                { label: 'Registered Farmers', value: analytics.totalFarmers, icon: Users, color: 'text-blue-600' },
                { label: 'Active Centres', value: analytics.totalCentres, icon: Building2, color: 'text-amber-600' },
                {
                  label: 'Avg Wait Time',
                  value: analytics.avgWaitMinutes > 0 ? `${analytics.avgWaitMinutes} min` : 'N/A',
                  icon: Clock,
                  color: 'text-purple-600',
                },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-4">
                    <stat.icon className={`h-6 w-6 ${stat.color} mb-2`} />
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Daily Bookings Chart */}
            {analytics.dailyBookings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Daily Bookings Trend (Last 14 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={analytics.dailyBookings}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="bookings" stroke="#16a34a" name="Bookings" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="completed" stroke="#2563eb" name="Completed" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Centre Load */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Centre-wise Load</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics.centreLoad}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="bookings" fill="#16a34a" name="Bookings" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" fill="#2563eb" name="Completed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Stage Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Booking Stage Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analytics.stageDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {analytics.stageDistribution.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Peak Booking Hours */}
            {analytics.peakHours.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Peak Booking Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.peakHours}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#d97706" name="Bookings" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-gray-400">No data available</div>
        )}
      </main>
    </div>
  )
}
