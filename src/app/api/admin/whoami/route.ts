import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/adminAuth'

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')

  const session = await verifyAdminSession(adminKey)
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 })

  return NextResponse.json({ authenticated: true, admin: session })
}
