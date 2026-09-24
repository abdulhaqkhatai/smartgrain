import { NextResponse } from 'next/server'
import { seedInitialDatabase } from '@/lib/mongodb/services'

export async function GET() {
  try {
    const result = await seedInitialDatabase()
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const result = await seedInitialDatabase()
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
