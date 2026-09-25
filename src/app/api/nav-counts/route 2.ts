import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// أرقام شريط التنقل: الإشعارات غير المقروءة + الأصناف الناقصة (تتحدث كل 30 ثانية)
// by_branch=1: عدد الأصناف الناقصة لكل فرع (لنافذة اختيار الفرع)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    const byBranch = searchParams.get('by_branch') === '1'
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const bid = enforcedBranchId(access, branch_id)
    if (bid && !UUID_RE.test(bid)) return NextResponse.json({ error: 'branch_id غير صالح' }, { status: 400 })

    const db = sb()

    if (byBranch) {
      let q = db.from('products').select('branch_id,qty,reorder_point').eq('org_id', org_id).eq('is_active', true)
      if (access.role === 'manager' && access.branchId) q = q.eq('branch_id', access.branchId)
      const { data, error } = await q
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      const low_by_branch: Record<string, number> = {}
      for (const p of (data || []) as any[]) {
        if (p.qty <= p.reorder_point && p.branch_id) low_by_branch[p.branch_id] = (low_by_branch[p.branch_id] || 0) + 1
      }
      return NextResponse.json({ success: true, low_by_branch })
    }

    let prodsQ = db.from('products').select('qty,reorder_point').eq('org_id', org_id).eq('is_active', true)
    if (bid) prodsQ = prodsQ.eq('branch_id', bid)
    const [prods, unread] = await Promise.all([
      prodsQ,
      db.from('notifications').select('id', { count: 'exact', head: true }).eq('org_id', org_id).eq('read', false)
        .or(bid ? `branch_id.is.null,branch_id.eq.${bid}` : 'branch_id.is.null,branch_id.not.is.null'),
    ])
    if (prods.error || unread.error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })

    return NextResponse.json({
      success: true,
      unread: unread.count || 0,
      low: (prods.data || []).filter((p: any) => p.qty <= p.reorder_point).length,
    })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
