'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useNotifications } from '@/hooks/useNotifications'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { MapPin, Search, Wheat, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Centre {
  id: string
  name: string
  code: string
  address: string
  district: string
  state: string
  latitude?: number | null
  longitude?: number | null
  grain_types: string[]
  is_active: boolean
}

// Leaflet map loaded client-side only to avoid SSR issues
const CentresMap = dynamic(() => import('@/components/centres/centres-map'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center">
      <Spinner />
    </div>
  ),
})

export default function CentresPage() {
  const { profile } = useProfile()
  const { unreadCount } = useNotifications(profile?.id)
  const [centres, setCentres] = useState<Centre[]>([])
  const [filtered, setFiltered] = useState<Centre[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [grainFilter, setGrainFilter] = useState('')
  const [view, setView] = useState<'list' | 'map'>('list')

  useEffect(() => {
    fetch('/api/centres')
      .then((res) => res.json())
      .then((data) => {
        setCentres(data.centres || [])
        setFiltered(data.centres || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let result = centres
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q)
      )
    }
    if (grainFilter) {
      result = result.filter((c) => c.grain_types.includes(grainFilter))
    }
    setFiltered(result)
  }, [search, grainFilter, centres])

  const allGrains = Array.from(new Set(centres.flatMap((c) => c.grain_types))).sort()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" unreadCount={unreadCount} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Procurement Centres</h1>
          <p className="text-gray-500 text-sm mt-1">Find a centre near you and book a slot</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, district or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <select
            value={grainFilter}
            onChange={(e) => setGrainFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Grains</option>
            {allGrains.map((g) => (
              <option key={g} value={g} className="capitalize">
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </option>
            ))}
          </select>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 text-sm font-medium ${
                view === 'list' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView('map')}
              className={`px-4 py-2 text-sm font-medium ${
                view === 'map' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'
              }`}
            >
              Map
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <>
            {view === 'map' && (
              <div className="mb-4">
                <CentresMap centres={filtered as any} />
              </div>
            )}

            <div className="text-sm text-gray-500 mb-3">
              {filtered.length} centre{filtered.length !== 1 ? 's' : ''} found
            </div>

            <div className="space-y-3">
              {filtered.map((centre) => (
                <Card key={centre.id} className="hover:border-green-300 hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{centre.name}</h3>
                          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            {centre.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                          <MapPin className="h-3.5 w-3.5" />
                          {centre.address}, {centre.district}, {centre.state}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {centre.grain_types.map((grain) => (
                            <span
                              key={grain}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full capitalize"
                            >
                              <Wheat className="h-3 w-3" />
                              {grain}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Link href={`/centres/${centre.id}/book`}>
                        <Button size="sm" className="shrink-0 gap-1">
                          Book Slot
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No centres match your search</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
