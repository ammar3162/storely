import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { notifyStaffDeduction } from '@/lib/staffDeductionNotice'
import { markRefNotificationsRead } from '@/lib/requestRefs'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

// الأيام الإضافية (دوام بيوم إجازة) — القائمة مع أجر اليوم المقترح (الراتب الأساسي ÷ 30)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const status = searchParams.get('status') || 'pending'
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    let q = sb().from('staff_extra_days')
      .select('id,staff_id,work_date,reason,status,amount,comp_date,decided_at,staff_members!inner(name,monthly_salary,branch_id)')
      .eq('org_id', org_id).order('work_date', { ascending: false }).limit(100)
    if (status !== 'all') q = q.eq('status', status)
    const forced = enforcedBranchId(access)
    if (forced) q = q.eq('staff_members.branch_id', forced)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    const rows = ((data || []) as any[]).map(r => ({
      id: r.id, staff_id: r.staff_id, name: r.staff_members?.name, work_date: r.work_date, reason: r.reason,
      status: r.status, amount: r.amount, comp_date: r.comp_date, decided_at: r.decided_at,
      suggested_amount: Math.round((Number(r.staff_members?.monthly_salary || 0) / 30) * 100) / 100,
    }))
    return NextResponse.json({ success: true, extra_days: rows, canDecide: access.role === 'owner' })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// قرار المالك: paid (مبلغ ينضاف للراتب) / comp (يوم إجازة بديل) / rejected
export async function POST(req: Request) {
  try {
    const { org_id, id, decision, amount, comp_date } = await req.json()
    if (!org_id || !id || !['paid', 'comp', 'rejected'].includes(decision)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'القرار للمالك فقط' }, { status: 403 })

    const amt = Math.round(Number(amount) * 100) / 100
    if (decision === 'paid' && !(amt > 0 && amt <= 100000)) return NextResponse.json({ error: 'اكتب مبلغ التعويض' }, { status: 400 })
    if (decision === 'comp' && !DAY_RE.test(String(comp_date || ''))) return NextResponse.json({ error: 'اختر تاريخ اليوم البديل' }, { status: 400 })

    const db = sb()
    // القرار مرة وحدة (pending بس)
    const { data: row, error } = await db.from('staff_extra_days').update({
      status: decision, decided_at: new Date().toISOString(),
      amount: decision === 'paid' ? amt : null, comp_date: decision === 'comp' ? comp_date : null,
    } as any).eq('id', id).eq('org_id', org_id).eq('status', 'pending').select('id,staff_id,work_date').maybeSingle()
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'تم اتخاذ قرار على هذا اليوم من قبل' }, { status: 409 })
    const r = row as any

    if (decision === 'paid') {
      const { error: insErr } = await db.from('staff_payroll_adjustments').insert({
        org_id, staff_id: r.staff_id, type: 'bonus', amount: amt,
        reason: `تعويض يوم إضافي ${r.work_date}`,
        status: 'approved', requested_by: 'owner', reviewed_by: 'owner', reviewed_at: new Date().toISOString(),
        source: 'extra_day', source_id: r.id,
      } as any)
      if (insErr && (insErr as any).code !== '23505') {
        await db.from('staff_extra_days').update({ status: 'pending', decided_at: null, amount: null } as any).eq('id', r.id).eq('org_id', org_id)
        return NextResponse.json({ error: 'تعذر تسجيل التعويض — حاول مرة ثانية' }, { status: 500 })
      }
    }

    await markRefNotificationsRead(db, org_id, 'extra_day', r.id)
    await notifyStaffDeduction(db, org_id, r.staff_id,
      decision === 'paid' ? { kind: 'extra_paid', amount: amt, date: r.work_date }
        : decision === 'comp' ? { kind: 'extra_comp', amount: 0, date: r.work_date, comp: comp_date }
        : { kind: 'extra_rejected', amount: 0, date: r.work_date })
    return NextResponse.json({ success: true, decision })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
