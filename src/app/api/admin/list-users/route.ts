import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { monthlyBills } from '@/lib/orgBill'
import { requirePermission } from '@/lib/adminAuth'

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'manage_users'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,phone,role,status,created_at,org_id,subscription_type,subscription_ends_at,branch_count,organizations(name,max_branches,billing_cycle,plan,requested_plan,whatsapp_number,locked_plan_monthly)')
    .eq('role', 'owner') // نعرض حساب المالك بس — مديرو الفروع حسابات تابعة، مو مؤسسات مستقلة
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // الفاتورة الشهرية لكل منشأة — عشان نعلّم المرشّحين للترقية
  const orgs = ((data || []) as any[]).filter(u => u.org_id).map(u => ({ id: u.org_id, plan: u.organizations?.plan, max_branches: u.organizations?.max_branches, locked_plan_monthly: u.organizations?.locked_plan_monthly }))
  const bills = await monthlyBills(supabase, orgs).catch(() => ({} as Record<string, number>))
  return NextResponse.json({ users: ((data || []) as any[]).map(u => ({ ...u, monthly_bill: u.org_id ? bills[u.org_id] ?? null : null })) })
}
