import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// إشعارات الفرع = الإشعارات العامة (بدون فرع) + إشعارات هذا الفرع. بدون فرع = كل إشعارات المؤسسة
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function branchFilter(branchId: string | null) {
  if (branchId && !UUID_RE.test(branchId)) throw new Error('invalid branch_id')
  return branchId ?`branch_id.is.null,branch_id.eq.${branchId}` : 'branch_id.is.null,branch_id.not.is.null'
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    const db = sb()
    const { data, error } = await db.from('notifications')
      .select('id,type,read,title,message,created_at,ref_type,ref_id')
      .eq('org_id', org_id).or(branchFilter(effectiveBranchId))
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    const rows = (data || []) as any[]
    // إشعارات الطلبات (استئذان، سلفة، إجازة، عجز كاشير): نرفق حالة القرار عشان الواجهة تعرض الأزرار أو النتيجة
    const REF_SOURCES: Record<string, { table: string; col: string; map: (v: any) => string | null }> = {
      cashier_deficit: { table: 'cashier_closings', col: 'deficit_decision', map: v => v ?? null },
      excuse_request: { table: 'attendance_permission_requests', col: 'status', map: v => v },
      advance_request: { table: 'staff_payroll_adjustments', col: 'status', map: v => v },
      leave_request: { table: 'staff_leave_requests', col: 'status', map: v => v },
    }
    const isOwner = access.role === 'owner'
    for (const [refType, src] of Object.entries(REF_SOURCES)) {
      const ids = rows.filter(n => n.ref_type === refType && n.ref_id).map(n => n.ref_id)
      if (!ids.length) continue
      const { data: refRows } = await db.from(src.table).select(`id,${src.col}`).eq('org_id', org_id).in('id', ids)
      const dec = new Map(((refRows || []) as any[]).map(r => [r.id, src.map(r[src.col])]))
      for (const n of rows) if (n.ref_type === refType) {
        n.decision = dec.get(n.ref_id) ?? null
        // عجز الكاشير للمالك فقط، والباقي للمالك أو مدير الفرع (السيرفر يتحقق مرة ثانية عند القرار)
        n.can_decide = refType === 'cashier_deficit' ? isOwner : true
      }
    }
    // اليوم الإضافي: نرفق بياناته (التاريخ والمبلغ المقترح والقرار) لأدوات القرار
    const extraIds = rows.filter(n => n.ref_type === 'extra_day' && n.ref_id).map(n => n.ref_id)
    if (extraIds.length) {
      const { data: ex } = await db.from('staff_extra_days').select('id,work_date,status,amount,comp_date,staff_members(monthly_salary)').eq('org_id', org_id).in('id', extraIds)
      const byId = new Map(((ex || []) as any[]).map(e => [e.id, e]))
      for (const n of rows) if (n.ref_type === 'extra_day') {
        const e = byId.get(n.ref_id)
        n.extra = e ? { id: e.id, work_date: e.work_date, status: e.status, amount: e.amount, comp_date: e.comp_date,
          suggested_amount: Math.round((Number(e.staff_members?.monthly_salary || 0) / 30) * 100) / 100 } : null
        n.can_decide = access.role === 'owner'
      }
    }
    return NextResponse.json({ success: true, notifications: rows })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تعليم إشعار كمقروء ({ id }) أو كل الإشعارات ({ all: true, branch_id })
export async function PATCH(req: Request) {
  try {
    const { org_id, id, all, branch_id } = await req.json()
    if (!org_id || (!id && !all)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    let q = sb().from('notifications').update({ read: true }).eq('org_id', org_id)
    q = id ? q.eq('id', id) : q.eq('read', false).or(branchFilter(enforcedBranchId(access, branch_id)))
    const { error } = await q

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const id = searchParams.get('id')
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const { error } = await sb().from('notifications').delete().eq('id', id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
