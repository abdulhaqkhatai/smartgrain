'use client'

import { useEffect, useState, useCallback } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { UserPlus, Building2 } from 'lucide-react'

interface StaffUser {
  id: string
  full_name: string
  email: string
  phone: string
  role: string
  assigned_centre_id?: string | null
}

interface CentreOption {
  id: string
  name: string
}

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffUser[]>([])
  const [centres, setCentres] = useState<CentreOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    assigned_centre_id: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/staff')
      if (res.ok) {
        const data = await res.json()
        setStaffList(data.staff || [])
        setCentres(data.centres || [])
      }
    } catch {
      // Error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateStaff = async () => {
    setError('')
    setSuccess('')
    setCreating(true)

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create staff')
      } else {
        setSuccess(`Staff account created for ${form.full_name}`)
        setForm({ email: '', password: '', full_name: '', phone: '', assigned_centre_id: '' })
        setShowCreate(false)
        await fetchData()
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setCreating(false)
    }
  }

  const updateCentreAssignment = async (userId: string, centreId: string) => {
    await fetch('/api/admin/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, assigned_centre_id: centreId || null }),
    })
    await fetchData()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const centreOptions = [
    { value: '', label: 'No centre assigned' },
    ...centres.map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="admin" />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-gray-500 text-sm mt-0.5">{staffList.length} staff & admin accounts in MongoDB</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Create Staff Account
          </Button>
        </div>

        {/* Create Staff Form */}
        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Staff Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  required
                />
                <Input
                  label="Phone Number"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                />
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Assign to Centre</label>
                  <select
                    value={form.assigned_centre_id}
                    onChange={(e) => setForm((p) => ({ ...p, assigned_centre_id: e.target.value }))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {centreOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                  {success}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleCreateStaff} loading={creating} size="sm">
                  Create Staff
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Staff list */}
        <div className="space-y-3">
          {staffList.map((staff) => (
            <Card key={staff.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm shrink-0">
                    {staff.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{staff.full_name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          staff.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {staff.role}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {staff.phone} · {staff.email}
                    </div>
                  </div>
                  {staff.role === 'staff' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <select
                        value={staff.assigned_centre_id || ''}
                        onChange={(e) => updateCentreAssignment(staff.id, e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {centreOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
