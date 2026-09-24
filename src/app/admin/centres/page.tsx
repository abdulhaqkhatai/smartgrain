'use client'

import { useEffect, useState, useCallback } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Plus, Pencil, Power, PowerOff, MapPin, Wheat } from 'lucide-react'
import { GRAIN_TYPES } from '@/lib/utils'

interface CentreItem {
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

const EMPTY_FORM = {
  name: '',
  code: '',
  address: '',
  district: '',
  state: 'Rajasthan',
  latitude: '',
  longitude: '',
  grain_types: ['wheat', 'rice'],
}

export default function AdminCentresPage() {
  const [centres, setCentres] = useState<CentreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CentreItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchCentres = useCallback(async () => {
    try {
      const res = await fetch('/api/centres')
      if (res.ok) {
        const data = await res.json()
        setCentres(data.centres || [])
      }
    } catch {
      // Error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCentres()
  }, [fetchCentres])

  const toggleGrain = (grain: string) => {
    setForm((prev) => ({
      ...prev,
      grain_types: prev.grain_types.includes(grain)
        ? prev.grain_types.filter((g) => g !== grain)
        : [...prev.grain_types, grain],
    }))
  }

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (centre: CentreItem) => {
    setEditing(centre)
    setForm({
      name: centre.name,
      code: centre.code,
      address: centre.address,
      district: centre.district,
      state: centre.state,
      latitude: centre.latitude?.toString() || '',
      longitude: centre.longitude?.toString() || '',
      grain_types: [...centre.grain_types],
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const url = editing ? `/api/centres/${editing.id}` : '/api/centres'
    const method = editing ? 'PATCH' : 'POST'

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setShowForm(false)
    setSaving(false)
    await fetchCentres()
  }

  const toggleActive = async (centre: CentreItem) => {
    await fetch(`/api/centres/${centre.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !centre.is_active }),
    })
    await fetchCentres()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Procurement Centres</h1>
            <p className="text-gray-500 text-sm mt-0.5">{centres.length} centres registered in MongoDB</p>
          </div>
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Centre
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{editing ? 'Edit Centre' : 'New Centre'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Centre Name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <Input
                  label="Centre Code (e.g. JDH-01)"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  required
                />
                <Input
                  label="Address"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className="sm:col-span-2"
                />
                <Input
                  label="District"
                  value={form.district}
                  onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
                />
                <Input
                  label="State"
                  value={form.state}
                  onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                />
                <Input
                  label="Latitude"
                  type="number"
                  value={form.latitude}
                  onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
                  placeholder="26.2389"
                />
                <Input
                  label="Longitude"
                  type="number"
                  value={form.longitude}
                  onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
                  placeholder="73.0243"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grain Types Accepted
                </label>
                <div className="flex flex-wrap gap-2">
                  {GRAIN_TYPES.map((grain) => (
                    <button
                      key={grain}
                      type="button"
                      onClick={() => toggleGrain(grain)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border capitalize transition-colors ${
                        form.grain_types.includes(grain)
                          ? 'bg-amber-100 border-amber-400 text-amber-800'
                          : 'bg-white border-gray-200 text-gray-500'
                      }`}
                    >
                      <Wheat className="h-3.5 w-3.5" />
                      {grain}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} loading={saving} size="sm">
                  {editing ? 'Save Changes' : 'Create Centre'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Centres list */}
        <div className="space-y-3">
          {centres.map((centre) => (
            <Card key={centre.id} className={!centre.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{centre.name}</h3>
                      <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {centre.code}
                      </span>
                      {!centre.is_active && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {centre.address}, {centre.district}, {centre.state}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {centre.grain_types.map((g) => (
                        <span
                          key={g}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full capitalize"
                        >
                          <Wheat className="h-3 w-3" />
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(centre)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleActive(centre)}
                      className={`p-2 rounded-lg ${
                        centre.is_active ? 'text-green-600 hover:bg-green-50' : 'text-red-400 hover:bg-red-50'
                      }`}
                    >
                      {centre.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
