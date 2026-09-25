import Link from 'next/link'
import {
  Wheat,
  MapPin,
  CalendarCheck2,
  Users,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Building2,
  CheckCircle2,
  BellRing,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { connectDB } from '@/lib/mongodb/db'
import { Centre } from '@/lib/mongodb/models'

async function getCentres() {
  try {
    await connectDB()
    const centres = await Centre.find({ is_active: true }).limit(3).lean()
    return JSON.parse(JSON.stringify(centres))
  } catch {
    return []
  }
}

export default async function HomePage() {
  const centres = await getCentres()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-green-700 text-lg">
            <div className="h-9 w-9 rounded-xl bg-green-600 flex items-center justify-center text-white shadow-sm">
              <Wheat className="h-5 w-5" />
            </div>
            <span>GrainProcure</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Link href="/" className="px-3 py-2 text-green-700 font-semibold bg-green-50 rounded-lg">
              Home
            </Link>
            <Link href="/centres" className="px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors">
              Find Centres
            </Link>
            <Link href="/dashboard" className="px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors">
              Farmer Dashboard
            </Link>
            <Link href="/staff/queue" className="px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors">
              Staff Queue
            </Link>
            <Link href="/admin/analytics" className="px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors">
              Admin Analytics
            </Link>
          </nav>

          {/* Quick Action / Login */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/centres"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-xs transition-colors"
            >
              Book Slot
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-green-700 border border-slate-300 hover:border-green-400 bg-white rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-green-50/70 via-white to-slate-50 pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-green-100/80 border border-green-200 text-xs font-semibold text-green-800 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-green-600" />
            <span>SIH Problem Statement 26032 • Smart Procurement Portal</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight sm:leading-tight">
            Transparent Grain Slot Booking & <span className="text-green-600">Live FIFO Queue</span>
          </h1>

          <p className="mt-5 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal">
            Eliminating long mandi queues and wait anxiety. Book concrete slots, track your exact position in real-time, and get notified automatically at each procurement step.
          </p>

          {/* Hero CTA buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/centres"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <CalendarCheck2 className="h-5 w-5" />
              Find Centre & Book Slot
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-all"
            >
              <Clock className="h-5 w-5 text-green-600" />
              Farmer Live Queue
            </Link>
            <Link
              href="/staff/queue"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-all"
            >
              <Users className="h-5 w-5 text-blue-600" />
              Staff Queue Console
            </Link>
          </div>

          {/* Feature Highlights Strip */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
            {[
              { title: 'Strict FIFO Ordering', desc: 'Ranked purely by booking time, no priority manipulation.' },
              { title: 'Atomic Concurrency', desc: 'Zero overbooking risk under concurrent booking clicks.' },
              { title: 'Live Position Tracking', desc: 'Dynamic wait time estimation and proactive arrival cues.' },
              { title: 'Audit Trail Pipeline', desc: 'Timestamped quality checks, weighing, and digital payment.' },
            ].map((f, i) => (
              <div key={i} className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-1.5 text-green-700 font-semibold text-xs sm:text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  {f.title}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Direct Role Explorer (No Login Required) */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-9">
            <span className="text-xs font-bold text-green-700 uppercase tracking-wider bg-green-50 px-3 py-1 rounded-full">
              Explore Portal Directly
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
              Instant Access by Role — No Sign-In Needed
            </h2>
            <p className="text-slate-500 text-sm mt-1 max-w-xl mx-auto">
              Test and demo each user interface directly from the browser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Farmer Experience */}
            <div className="bg-gradient-to-br from-green-50/50 to-white rounded-2xl border border-green-200 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="h-12 w-12 rounded-xl bg-green-600 text-white flex items-center justify-center mb-4 shadow-xs">
                  <Wheat className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">1. Farmer Experience</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Browse procurement centres across Rajasthan, pick available time slots with live capacity gauges, book with atomic safety, and track live FIFO queue rank.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    Interactive Leaflet map & grain filters
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    Live `#N of Total` queue rank calculation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    Status progression timeline & cancellation
                  </li>
                </ul>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <Link
                  href="/centres"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  Browse Centres & Book Slot
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Go to Farmer Dashboard
                </Link>
              </div>
            </div>

            {/* Staff Experience */}
            <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-2xl border border-blue-200 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-xs">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">2. Staff Queue Board</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Real-time queue board for procurement centre operators. Call next farmer in line, advance through inspection and weighing, and log payments.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    One-click &quot;Call Next&quot; stage progression
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    Inline actual weight and payment logging
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    Slot capacity overrides & recurring templates
                  </li>
                </ul>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <Link
                  href="/staff/queue"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Open Live Queue Board
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/staff/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Staff Dashboard & Slots
                </Link>
              </div>
            </div>

            {/* Admin Experience */}
            <div className="bg-gradient-to-br from-amber-50/50 to-white rounded-2xl border border-amber-200 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="h-12 w-12 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-4 shadow-xs">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">3. Admin Analytics</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  High-level oversight for state agricultural boards. Monitor centre congestion, daily booking volume trends, peak rush hours, and average wait duration.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    Centre-wise workload comparison charts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    Peak booking hours distribution
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    Centre CRUD & staff provisioning
                  </li>
                </ul>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <Link
                  href="/admin/analytics"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                >
                  View Analytics Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/admin/centres"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Manage Centres & Staff
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Centres Showcase */}
      <section className="py-12 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
            <div>
              <span className="text-xs font-bold text-green-700 uppercase tracking-wider">
                Procurement Network
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Active Rajasthan Centres</h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Real centres registered in the database ready for slot reservations
              </p>
            </div>
            <Link
              href="/centres"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800"
            >
              View all centres & map
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {centres.length > 0 ? (
              centres.map((c: any) => (
                <div
                  key={c._id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-green-300 hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                        {c.name}
                      </h3>
                      <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold shrink-0">
                        {c.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{c.address}, {c.district}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {c.grain_types?.map((grain: string) => (
                        <span
                          key={grain}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 text-[11px] rounded-md font-medium capitalize"
                        >
                          <Wheat className="h-2.5 w-2.5" />
                          {grain}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/centres/${c._id}/book`}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    Select Slot & Book
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
                Centres loading from MongoDB...
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How It Works Pipeline */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-green-700 uppercase tracking-wider bg-green-50 px-3 py-1 rounded-full">
              Process Flow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
              End-to-End Procurement in 5 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                step: '01',
                title: 'Select Slot',
                desc: 'Pick date & 3-hour capacity window at nearest centre.',
              },
              {
                step: '02',
                title: 'Instant Confirmation',
                desc: 'Unique reference generated (GRN-2026-XXXXXX) & locked atomically.',
              },
              {
                step: '03',
                title: 'Track Live Turn',
                desc: 'Farmer sees position (#4 of 12) & estimated wait time before arriving.',
              },
              {
                step: '04',
                title: 'Quality Check & Weigh',
                desc: 'Staff inspects moisture, records exact weighment in the console.',
              },
              {
                step: '05',
                title: 'Digital Payment',
                desc: 'Procurement status marked done, payment stage triggered instantly.',
              },
            ].map((s, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 relative">
                <div className="text-2xl font-black text-green-600/40 mb-1">{s.step}</div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">{s.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Wheat className="h-4 w-4 text-green-400" />
            <span>GrainProcure Platform</span>
          </div>
          <p className="text-center sm:text-right">
            Smart India Hackathon Problem Statement 26032 • Built with Next.js 16, MongoDB, and Tailwind CSS.
          </p>
        </div>
      </footer>
    </div>
  )
}
