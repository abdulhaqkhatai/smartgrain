# Smart Grain Procurement System 🌾

**SIH Problem Statement 26032** — Full-stack slot booking, queue management & notification platform for government grain procurement centres.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS v4 |
| Backend/DB | Supabase (PostgreSQL, Auth, Realtime, RLS) |
| SMS | Fast2SMS (Indian carriers, no per-recipient verification) |
| Maps | Leaflet / OpenStreetMap (free, no API key) |
| Charts | Recharts |
| Hosting | Vercel (frontend) + Supabase Cloud (backend) |

---

## Project Structure

```
src/
├── app/
│   ├── login/                    # Auth pages
│   ├── register/
│   ├── dashboard/                # Farmer dashboard (live queue position)
│   ├── centres/                  # Browse centres + Leaflet map
│   │   └── [id]/book/            # 3-step slot booking flow
│   ├── bookings/                 # Booking history
│   │   └── [id]/                 # Status timeline + cancel
│   ├── notifications/            # Realtime notification bell
│   ├── staff/
│   │   ├── dashboard/            # Today's stats + slot overview
│   │   ├── queue/                # Live queue board (Realtime)
│   │   └── slots/                # Slot & template management
│   ├── admin/
│   │   ├── centres/              # Centre CRUD
│   │   ├── staff/                # Staff account creation + centre assignment
│   │   └── analytics/            # Charts dashboard
│   └── api/
│       ├── admin/create-staff/   # Service-role staff account creation
│       └── notifications/send/   # Fast2SMS + in-app notification sender
├── components/
│   ├── ui/                       # Button, Input, Select, Card, Badge, Spinner
│   ├── layout/                   # Navbar (role-aware)
│   └── centres/                  # Leaflet map (dynamic import)
├── hooks/
│   ├── useProfile.ts             # Current user profile
│   └── useNotifications.ts       # Realtime notification feed
├── lib/
│   ├── supabase/                 # client.ts, server.ts, middleware.ts
│   └── utils.ts                  # formatDate, STAGE_LABELS, etc.
├── types/
│   └── database.ts               # Full TypeScript DB interface
└── middleware.ts                  # Role-based route protection
supabase/
├── schema.sql                    # Full DB schema + RLS + RPCs + seed
├── seed.sql                      # Reference seed data
└── functions/
    ├── send-notification/        # Fast2SMS Edge Function
    ├── generate-slots/           # Slot generation Edge Function
    └── queue-reminder/           # your_turn + 24h reminder cron
```

---

## Setup Guide

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **anon key** from Settings → API

### 2. Run the Schema

1. Open Supabase SQL Editor
2. Paste and run the entire contents of `supabase/schema.sql`
3. This creates all tables, RLS policies, RPCs, the `live_queue` view, and seeds 3 test centres

### 3. Configure Environment Variables

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FAST2SMS_API_KEY=your-fast2sms-api-key
```

> **Get Fast2SMS key**: Register at [fast2sms.com](https://fast2sms.com), go to Dev API → API Key. Costs ~₹1/SMS.

### 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

### 5. Deploy Edge Functions (Supabase)

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link to your project
supabase login
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set FAST2SMS_API_KEY=your-key

# Deploy
supabase functions deploy send-notification
supabase functions deploy generate-slots
supabase functions deploy queue-reminder
```

### 6. Set Up Cron Jobs (pg_cron or Supabase Dashboard)

In Supabase → Edge Functions → Schedule:
- `generate-slots`: Daily at midnight → `generate_slots_from_templates(14)`
- `queue-reminder`: Every 10 minutes → checks queue positions 1-2 + 24h reminders

### 7. Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Add the same env vars in Vercel Dashboard → Settings → Environment Variables.

---

## Create Test Accounts

After running the schema, create accounts via the app:

1. **Farmer**: Register at `/register` — gets farmer role automatically
2. **Admin**: Create via Supabase Auth dashboard → manually set `role = 'admin'` in `profiles` table
3. **Staff**: Log in as admin → go to `/admin/staff` → create staff account (uses service role API)

---

## Key Demo Points (Viva)

| SIH Requirement | Where Implemented |
|---|---|
| Farmer registration + slot booking | `/register`, `/centres/[id]/book` + `book_slot` RPC |
| Race condition proof | `FOR UPDATE` row lock in `book_slot` PostgreSQL function |
| Real-time queue management | `live_queue` view + Supabase Realtime on `bookings` table |
| SMS + in-app notifications | `/api/notifications/send` + Fast2SMS + `notifications` table |
| Procurement + payment stage tracking | `update_booking_stage` RPC + `booking_status_log` audit trail |
| Congestion reduction | Slot capacity control prevents overbooking; estimated wait time shown |
| Analytics | `/admin/analytics` — peak hours, centre load, stage distribution, daily trends |

---

## Supabase Realtime Setup

Enable Realtime on these tables in Supabase Dashboard → Database → Replication:
- `bookings` — for live queue board and farmer position updates
- `notifications` — for notification bell badge

---

## Notes for Report / Viva

- **Queue position is FIFO** — computed from `live_queue` view (window function over `booked_at`), never stored as a mutable field
- **RLS is enforced server-side** — farmers can only see their own bookings; staff only sees their centre
- **Staff creation uses Service Role key** — regular anon key cannot bypass the `role` default; only admin can create staff via `/api/admin/create-staff`
- **SLOT_FULL demo**: Open the booking page on two browsers simultaneously, both try to book the last slot — only one succeeds (show the error toast)
