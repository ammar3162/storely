import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { saveInvoice } from '@/lib/saveInvoice'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// حفظ أصناف فاتورة وحدة مقروءة من صورة (المالك/المدير): كل صنف سطر مشتريات،
// والصنف الموجود تزيد كميته (اختيار المستخدم أو تطابق قوي بالاسم) — الباقي ينضاف للمخزون
export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body?.org_id) return NextResponse.json({ error: 'حدد صنف واحد على الأقل واكتب سعره' }, { status: 400 })
    const access = await verifyOrgAccess(body.org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const r = await saveInvoice(sb(), { orgId: body.org_id, branchId: enforcedBranchId(access, body.branch_id) || null, profileId: access.userId ?? null, body })
    if (!r.ok) return NextResponse.json({ error: r.error, duplicate: r.duplicate, results: r.results }, { status: r.status })
    return NextResponse.json({ success: true, saved: r.saved, results: r.results, summary: r.summary })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
