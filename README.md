# Smart Grain Procurement System 🌾

**SIH Problem Statement 26032** — Full-stack slot booking, queue management & notification platform for government grain procurement centres.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Backend & Database | **MongoDB** + **Mongoose** (Collections, Indexes, Atomic Concurrency) |
| Auth & Security | JWT in HTTP-only Cookies via `jose` + `bcryptjs` password hashing |
| SMS & Notifications | Fast2SMS API route + In-app Realtime notification polling |
| Maps | Leaflet / OpenStreetMap (free, zero API cost) |
| Charts & Visuals | Recharts (responsive analytics suite) |
| Hosting | Vercel (frontend & API routes) + MongoDB Atlas / Local MongoDB |

---

## Project Structure

```
src/
├── app/
│   ├── login/                    # Auth pages (email/password, role redirects)
│   ├── register/                 # Farmer registration with phone validation
│   ├── dashboard/                # Farmer dashboard (live FIFO queue rank & wait estimate)
│   ├── centres/                  # Browse centres + Leaflet interactive map
│   │   └── [id]/book/            # 3-step slot booking wizard
│   ├── bookings/                 # Booking history
│   │   └── [id]/                 # Status progress timeline + cancel
│   ├── notifications/            # In-app notification feed
│   ├── staff/
│   │   ├── dashboard/            # Capacity gauges & today's queue overview
│   │   ├── queue/                # Live queue board (one-click stage advance, inline weigh/payment)
│   │   └── slots/                # Slot & weekly capacity template management
│   ├── admin/
│   │   ├── centres/              # Procurement Centre CRUD
│   │   ├── staff/                # Staff account creation + centre assignment
│   │   └── analytics/            # Recharts analytics (peak hours, wait time, centre load)
│   └── api/
│       ├── auth/                 # register, login, logout, me (JWT cookies)
│       ├── centres/              # list centres, [id], [id]/slots
│       ├── bookings/             # list, book (atomic concurrency), [id] (details, cancel)
│       ├── farmer/active/        # active booking & live queue rank calculation
│       ├── staff/                # dashboard, queue, slots
│       ├── admin/                # centres, staff, analytics
│       ├── notifications/        # list, mark-read, send (Fast2SMS)
│       └── seed/                 # 1-click database population endpoint
├── components/
│   ├── ui/                       # Button, Input, Select, Card, Badge, Spinner
│   ├── layout/                   # Navbar (role-aware links & sign-out)
│   └── centres/                  # Leaflet OpenStreetMap component (client-only)
├── hooks/
│   ├── useProfile.ts             # Active user profile hook
│   └── useNotifications.ts       # Live notification polling hook
├── lib/
│   ├── auth.ts                   # JWT sign/verify (jose) & bcryptjs helpers
│   ├── utils.ts                  # formatDate, STAGE_LABELS, formatCurrency
│   └── mongodb/
│       ├── db.ts                 # Cached Mongoose connection singleton
│       ├── models.ts             # User, Centre, Slot, Template, Booking, StatusLog, etc.
│       └── services.ts           # Atomic booking, queue calculations, and seeding
├── middleware.ts                 # Next.js Edge JWT middleware with role-based protection
└── scripts/
    └── seed.mjs                  # Standalone CLI seeding script
```

---

## Setup & Running Guide

### 1. Configure Environment Variables

Edit `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/grain_procurement
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/grain_procurement?retryWrites=true&w=majority

JWT_SECRET=smart_grain_procurement_jwt_secret_key_2026_sih_project
FAST2SMS_API_KEY=your-fast2sms-api-key
```

### 2. Seed the Database

You can populate test centres, slot templates, 14 days of slots, and demo accounts using either method:

**Option A — Via CLI**:
```bash
npm run seed
```

**Option B — Via Browser / API**:
Start the dev server and open `http://localhost:3000/api/seed` in your browser.

---

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Pre-Configured Demo Accounts

After running the seed script, log in with any of these pre-configured accounts:

| Role | Email | Password | Assigned Centre |
|------|-------|----------|-----------------|
| **Farmer** | `farmer@grainprocure.in` | `farmer123` | N/A |
| **Staff** | `staff@grainprocure.in` | `staff123` | Jodhpur Main Centre (`JDH-01`) |
| **Admin** | `admin@grainprocure.in` | `admin123` | All Centres |

*Or register a new farmer account directly via the `/register` page.*

---

## Core Technical Solutions for Viva

### 1. Race-Condition-Proof Capacity Control (Section 3)
In MongoDB, overbooking is prevented using an atomic conditional update:
```javascript
const slot = await Slot.findOneAndUpdate(
  {
    _id: slotId,
    is_active: true,
    $expr: { $lt: ['$booked_count', '$capacity'] }
  },
  { $inc: { booked_count: 1 } },
  { new: true }
);
if (!slot) throw new Error("SLOT_FULL");
```
Because MongoDB document modifications are serialized and atomic at the document level, two simultaneous requests hitting the last remaining slot will result in only one operation matching the condition (`booked_count < capacity`), completely preventing race conditions.

### 2. Strict FIFO Live Queue Calculation (Section 4)
Queue rank is **not** stored as a mutable integer. Instead, it is computed dynamically by ordering active bookings for that centre and slot date by `booked_at`:
- When an earlier booking is completed, cancelled, or marked as a no-show, the queue position for all waiting farmers updates automatically.
- The farmer dashboard and staff queue board poll every 5–8 seconds to reflect real-time queue changes without requiring replica set change streams.

### 3. Status Pipeline & Audit Log (Section 5)
Every procurement transition:
`booked` → `checked_in` → `quality_check` → `weighed` → `procured` (Payment: `pending` → `paid`)
is logged in the `BookingStatusLog` collection with timestamps, creating a transparent audit trail visible on the farmer's status timeline screen.

### 4. Admin Workload & Congestion Analytics (Section 7)
The `/admin/analytics` dashboard provides live visibility into centre congestion:
- Centre-wise load distribution (Bookings vs Completed).
- Peak booking hours histogram (0:00–23:00) to identify rush windows.
- Average processing and waiting times calculated from checked-in and completion timestamps.
