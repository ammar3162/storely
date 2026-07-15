import { NextResponse } from 'next/server'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const admin = await requirePermission(adminKey, 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { action, target_org_id, target_org_name, details } = await req.json()
  if (!action) return NextResponse.json({ error: 'action مطلوب' }, { status: 400 })

  await logAdminAction(admin, action, target_org_id || null, target_org_name || null, details || {})
  return NextResponse.json({ success: true })
}
