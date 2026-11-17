import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { canCloseCashier } from '@/lib/staffRoles'
import { computeBusinessDate } from '@/lib/businessDate'
import { cleanInvoiceNo, previousReturns, MAX_RETURNS } from '@/lib/closingReturns'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// قبل حفظ الإقفال: هل فيه فاتورة مرتجعة انسجلت قبل بنفس الفرع؟ (تنبيه للكاشير يصحّح الرقم لو غلط)
export async function POST(req: Request) {
  try {
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid || !auth.data) return NextResponse.json({ error: auth.error, reason: auth.reason }, { status: 401 })
    const { org_id, staff_id } = auth.data
    const { invoice_nos } = await req.json().catch(() => ({}))
    const nos = Array.isArray(invoice_nos) ? [...new Set(invoice_nos.map(cleanInvoiceNo).filter(Boolean))].slice(0, MAX_RETURNS) : []
    if (!nos.length) return NextResponse.json({ success: true, previous: {} })

    const db = sb()
    const { data: staffRow } = await db.from('staff_members').select('branch_id,role,is_active,permissions').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
    if (!staffRow || (staffRow as any).is_active === false || !canCloseCashier(staffRow as any)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    const branch_id: string | null = (staffRow as any).branch_id ?? auth.data.branch_id ?? null
    const { data: orgDay } = await db.from('organizations').select('business_day_start_hour').eq('id', org_id).single()
    const today = computeBusinessDate({ startHour: (orgDay as any)?.business_day_start_hour })
    const previous = await previousReturns(db as any, org_id, branch_id, nos, today)
    return NextResponse.json({ success: true, previous })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
