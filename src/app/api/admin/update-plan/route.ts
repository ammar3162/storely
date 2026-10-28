import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { changeOrgPlan } from '@/lib/changePlan'

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const admin = await requirePermission(adminKey, 'manage_users')
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { orgId, maxBranches, maxStaff, maxSuppliers, planName, orgName, billingCycle } = await req.json()
  if (!orgId || !maxBranches) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  const res = await changeOrgPlan(supabase, orgId, { planName, maxBranches, maxStaff, maxSuppliers, billingCycle })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 })
  await logAdminAction(admin, 'update_plan', orgId, orgName || null, { new_plan: planName, maxBranches })
  const { ok: _ok, ...branchSync } = res
  return NextResponse.json({ success: true, ...branchSync })
}
