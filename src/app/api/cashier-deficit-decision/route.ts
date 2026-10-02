import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// المالك يقرر على عجز إقفال الكاشير: اعتماد = خصم من راتب الكاشير، رفض = ما ينخصم.
// القرار مرة وحدة بس (الصف لازم يكون pending)، والخصم مربوط بالإقفال عشان ما يتكرر.
export async function POST(req: Request) {
  try {
    const { org_id, closing_id, decision } = await req.json()
    if (!org_id || !closing_id || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'القرار للمالك فقط' }, { status: 403 })

    const db = sb()
    // نقفل القرار أول (شرط pending) — طلبين بنفس اللحظة ما يقدرون يخصمون مرتين
    const { data: closing, error: updErr } = await db.from('cashier_closings')
      .update({ deficit_decision: decision, deficit_decided_at: new Date().toISOString() } as any)
      .eq('id', closing_id).eq('org_id', org_id).eq('status', 'deficit').eq('deficit_decision', 'pending')
      .select('id,staff_id,staff_name,closing_date,difference,deficit_reason').maybeSingle()
    if (updErr) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    if (!closing) return NextResponse.json({ error: 'تم اتخاذ قرار على هذا العجز من قبل' }, { status: 409 })

    const c = closing as any
    if (decision === 'approved') {
      const amount = Math.round(Math.abs(Number(c.difference || 0)) * 100) / 100
      const { error: insErr } = await db.from('staff_payroll_adjustments').insert({
        org_id, staff_id: c.staff_id, type: 'deduction', amount,
        reason: `عجز إقفال الكاشير ${c.closing_date}${c.deficit_reason ? ` — ${c.deficit_reason}` : ''}`,
        status: 'approved', requested_by: 'owner', reviewed_by: 'owner', reviewed_at: new Date().toISOString(),
        source: 'cashier_deficit', source_id: c.id,
      } as any)
      if (insErr && (insErr as any).code !== '23505') {
        // فشل الخصم — نرجّع القرار معلّق عشان المالك يقدر يعيد
        await db.from('cashier_closings').update({ deficit_decision: 'pending', deficit_decided_at: null } as any).eq('id', c.id).eq('org_id', org_id)
        return NextResponse.json({ error: 'فشل تسجيل الخصم — حاول مرة ثانية' }, { status: 500 })
      }
    }

    await db.from('notifications').update({ read: true } as any)
      .eq('org_id', org_id).eq('ref_type', 'cashier_deficit').eq('ref_id', c.id)

    return NextResponse.json({ success: true, decision })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
