// Standalone MongoDB Seed Script
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/grain_procurement'

async function seed() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)

  const db = mongoose.connection.db

  console.log('Clearing existing collections...')
  const collections = ['users', 'centres', 'slottemplates', 'slots', 'bookings', 'bookingstatuslogs', 'notifications', 'counters']
  for (const c of collections) {
    try {
      await db.collection(c).drop()
    } catch {}
  }

  console.log('Inserting procurement centres...')
  const centresResult = await db.collection('centres').insertMany([
    {
      name: 'Jodhpur Main Procurement Centre',
      code: 'JDH-01',
      address: 'Station Road, Near Bus Stand, Jodhpur',
      district: 'Jodhpur',
      state: 'Rajasthan',
      latitude: 26.2389,
      longitude: 73.0243,
      grain_types: ['wheat', 'rice', 'bajra'],
      is_active: true,
      created_at: new Date(),
    },
    {
      name: 'Jaipur North Procurement Centre',
      code: 'JAI-01',
      address: 'Sikar Road, Near Agricultural Market, Jaipur',
      district: 'Jaipur',
      state: 'Rajasthan',
      latitude: 26.9124,
      longitude: 75.7873,
      grain_types: ['wheat', 'rice'],
      is_active: true,
      created_at: new Date(),
    },
    {
      name: 'Bikaner Grain Centre',
      code: 'BKN-01',
      address: 'Ganga Shahar Road, Bikaner',
      district: 'Bikaner',
      state: 'Rajasthan',
      latitude: 28.0229,
      longitude: 73.3119,
      grain_types: ['wheat', 'bajra', 'mustard'],
      is_active: true,
      created_at: new Date(),
    },
  ])

  const jodhpurId = centresResult.insertedIds[0]
  const jaipurId = centresResult.insertedIds[1]
  const bikanerId = centresResult.insertedIds[2]

  console.log('Creating slot templates...')
  const templateDocs = []
  const windows = [
    { start: '08:00', end: '11:00', capacity: 20 },
    { start: '11:00', end: '14:00', capacity: 20 },
    { start: '14:00', end: '17:00', capacity: 15 },
  ]

  for (const cid of [jodhpurId, jaipurId, bikanerId]) {
    for (let dow = 1; dow <= 6; dow++) {
      for (const w of windows) {
        templateDocs.push({
          centre_id: cid,
          day_of_week: dow,
          start_time: w.start,
          end_time: w.end,
          capacity: w.capacity,
          is_active: true,
        })
      }
    }
  }
  await db.collection('slottemplates').insertMany(templateDocs)

  console.log('Generating concrete slots for next 14 days...')
  const slotDocs = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i <= 14; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dow = d.getDay()
    if (dow === 0) continue // Skip Sundays

    const dateStr = d.toISOString().split('T')[0]
    for (const cid of [jodhpurId, jaipurId, bikanerId]) {
      for (const w of windows) {
        slotDocs.push({
          centre_id: cid,
          slot_date: dateStr,
          start_time: w.start,
          end_time: w.end,
          capacity: w.capacity,
          booked_count: 0,
          is_active: true,
          created_at: new Date(),
        })
      }
    }
  }
  await db.collection('slots').insertMany(slotDocs)

  console.log('Creating initial test accounts...')
  const adminHash = await bcrypt.hash('admin123', 10)
  const staffHash = await bcrypt.hash('staff123', 10)
  const farmerHash = await bcrypt.hash('farmer123', 10)

  await db.collection('users').insertMany([
    {
      full_name: 'Admin Officer',
      phone: '9876543210',
      email: 'admin@grainprocure.in',
      password_hash: adminHash,
      role: 'admin',
      created_at: new Date(),
    },
    {
      full_name: 'Jodhpur Centre Incharge',
      phone: '9876543211',
      email: 'staff@grainprocure.in',
      password_hash: staffHash,
      role: 'staff',
      assigned_centre_id: jodhpurId,
      created_at: new Date(),
    },
    {
      full_name: 'Ramesh Kumar (Farmer)',
      phone: '9876543212',
      email: 'farmer@grainprocure.in',
      password_hash: farmerHash,
      role: 'farmer',
      village: 'Mandore, Jodhpur',
      created_at: new Date(),
    },
  ])

  // Initialize booking counter
  await db.collection('counters').insertOne({ _id: 'booking_ref', seq: 0 })

  console.log('✅ MongoDB Seeding Complete!')
  console.log('----------------------------------------------------')
  console.log('Demo Accounts:')
  console.log('• Farmer: farmer@grainprocure.in / farmer123')
  console.log('• Staff:  staff@grainprocure.in  / staff123')
  console.log('• Admin:  admin@grainprocure.in  / admin123')
  console.log('----------------------------------------------------')

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seeding error:', err)
  process.exit(1)
})
