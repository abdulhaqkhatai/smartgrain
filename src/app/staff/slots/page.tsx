'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatDate, formatTime, DAY_NAMES } from '@/lib/utils'
import { Plus, Trash2, Power, PowerOff, CalendarDays } from 'lucide-react'
import type { Database } from '@/types/database'

type Slot = Database['public']['Tables']['slots']['Row']
type SlotTemplate = Database['public']['Tables']['slot_templates']['Row']

export default function StaffSlotsPage() {
  const { profile } = useProfile()
  const [slots, setSlots] = useState<Slot[]>([])
  const [templates, setTemplates] = useState<SlotTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'templates'>('upcoming')
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [slotForm, setSlotForm] = useState({
    slot_date: '',
    start_time: '',
    end_time: '',
    capacity: '20',
  })
  const [templateForm, setTemplateForm] = useState({
    day_of_week: '1',
    start_time: '08:00',
    end_time: '11:00',
    capacity: '20',
  })

  const fetchData = async () => {
    if (!profile?.assigned_centre_id) return
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const [{ data: s }, { data: t }] = await Promise.all([
      supabase
        .from('slots')
        .select('*')
        .eq('centre_id', profile.assigned_centre_id)
        .gte('slot_date', today)
        .order('slot_date')
        .order('start_time'),
      supabase
        .from('slot_templates')
        .select('*')
        .eq('centre_id', profile.assigned_centre_id)
        .order('day_of_week')
        .order('start_time'),
    ])

    setSlots(s || [])
    setTemplates(t || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const toggleSlotActive = async (slot: Slot) => {
    const supabase = createClient()
    await supabase.from('slots').update({ is_active: !slot.is_active }).eq('id', slot.id)
    await fetchData()
  }

  const addSlot = async () => {
    if (!profile?.assigned_centre_id) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('slots').insert({
      centre_id: profile.assigned_centre_id,
      slot_date: slotForm.slot_date,
      start_time: slotForm.start_time,
      end_time: slotForm.end_time,
      capacity: parseInt(slotForm.capacity),
    })
    setShowAddSlot(false)
    setSaving(false)
    await fetchData()
  }

  const addTemplate = async () => {
    if (!profile?.assigned_centre_id) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('slot_templates').insert({
      centre_id: profile.assigned_centre_id,
      day_of_week: parseInt(templateForm.day_of_week),
      start_time: templateForm.start_time,
      end_time: templateForm.end_time,
      capacity: parseInt(templateForm.capacity),
    })
    setShowAddTemplate(false)
    setSaving(false)
    await fetchData()
  }

  const deleteTemplate = async (id: string) => {
    const supabase = createClient()
    await supabase.from('slot_templates').delete().eq('id', id)
    await fetchData()
  }

  const generateSlots = async () => {
    setGenerating(true)
    const supabase = createClient()
    await supabase.rpc('generate_slots_from_templates', { p_days_ahead: 14 })
    await fetchData()
    setGenerating(false)
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
      <Navbar role="staff" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Slot Management</h1>
            <p className="text-gray-500 text-sm mt-0.5">Configure capacity and schedule</p>
          </div>
          <Button onClick={generateSlots} variant="outline" size="sm" loading={generating}>
            <CalendarDays className="h-4 w-4 mr-1.5" />
            Generate 14-Day Slots
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(['upcoming', 'templates'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'upcoming' ? 'Upcoming Slots' : 'Weekly Templates'}
            </button>
          ))}
        </div>

        {activeTab === 'upcoming' && (
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowAddSlot(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Slot Override
              </Button>
            </div>

            {showAddSlot && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add Custom Slot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Date</label>
                      <input type="date" value={slotForm.slot_date} onChange={(e) => setSlotForm(p => ({ ...p, slot_date: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Capacity</label>
                      <input type="number" value={slotForm.capacity} onChange={(e) => setSlotForm(p => ({ ...p, capacity: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Start Time</label>
                      <input type="time" value={slotForm.start_time} onChange={(e) => setSlotForm(p => ({ ...p, start_time: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">End Time</label>
                      <input type="time" value={slotForm.end_time} onChange={(e) => setSlotForm(p => ({ ...p, end_time: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addSlot} loading={saving} size="sm">Add Slot</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddSlot(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {slots.length === 0 && (
                <p className="text-center text-gray-400 py-8">No upcoming slots. Generate from templates or add custom slots.</p>
              )}
              {slots.map((slot) => (
                <div key={slot.id} className="bg-white border border-gray-200 rounded-xl px-5 py-3.5 flex items-center gap-4">
                  <div className="w-28 shrink-0">
                    <div className="text-sm font-medium">{formatDate(slot.slot_date)}</div>
                    <div className="text-xs text-gray-400">{formatTime(slot.start_time)} – {formatTime(slot.end_time)}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600">
                      {slot.booked_count}/{slot.capacity} booked
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full"
                        style={{ width: `${Math.min(100, (slot.booked_count / slot.capacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSlotActive(slot)}
                    className={`p-2 rounded-lg transition-colors ${slot.is_active ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`}
                    title={slot.is_active ? 'Close this slot' : 'Reopen slot'}
                  >
                    {slot.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'templates' && (
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowAddTemplate(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Template
              </Button>
            </div>

            {showAddTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">New Weekly Template</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className="text-sm font-medium text-gray-700">Day of Week</label>
                      <select value={templateForm.day_of_week} onChange={(e) => setTemplateForm(p => ({ ...p, day_of_week: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                        {DAY_NAMES.map((d, i) => (
                          <option key={i} value={i}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Start Time</label>
                      <input type="time" value={templateForm.start_time} onChange={(e) => setTemplateForm(p => ({ ...p, start_time: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">End Time</label>
                      <input type="time" value={templateForm.end_time} onChange={(e) => setTemplateForm(p => ({ ...p, end_time: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Capacity</label>
                      <input type="number" value={templateForm.capacity} onChange={(e) => setTemplateForm(p => ({ ...p, capacity: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addTemplate} loading={saving} size="sm">Add Template</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddTemplate(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {templates.length === 0 && (
                <p className="text-center text-gray-400 py-8">No templates yet. Add templates to auto-generate slots.</p>
              )}
              {templates.map((t) => (
                <div key={t.id} className="bg-white border border-gray-200 rounded-xl px-5 py-3.5 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{DAY_NAMES[t.day_of_week]}</div>
                    <div className="text-xs text-gray-400">
                      {formatTime(t.start_time)} – {formatTime(t.end_time)} · {t.capacity} slots
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
