import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// آخر جرد لكل صنف + تواريخ الجرد السابقة (للاختيار بتقرير تقدير الإنتاج)
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const org_id = sp.get('org_id') || ''
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  const branch_id = enforcedBranchId(access, sp.get('branch_id'))
  let q = sb().from('stock_counts').select('product_id,counted_qty,system_qty,counted_at,counted_by_name').eq('org_id', org_id).order('counted_at', { ascending: false }).limit(2000)
  if (branch_id) q = q.eq('branch_id', branch_id)
  const { data } = await q
  const latest: Record<string, any> = {}
  const days = new Set<string>()
  for (const r of (data || []) as any[]) {
    latest[r.product_id] ??= r
    days.add(new Date(new Date(r.counted_at).getTime() + 3 * 3600_000).toISOString().slice(0, 10))
  }
  return NextResponse.json({ success: true, latest, days: [...days].sort().reverse() })
}

// حفظ جرد: counts = [{ product_id, counted_qty }]. الفرق عن رصيد النظام ينسجّل حركة تسوية
export async function POST(req: Request) {
  try {
    const { org_id, counts } = await req.json()
    if (!org_id || !Array.isArray(counts) || !counts.length) return NextResponse.json({ error: 'ما فيه أصناف للجرد' }, { status: 400 })
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const clean = new Map<string, number>()
    for (const c of counts.slice(0, 1000)) {
      const n = Number(c?.counted_qty)
      if (typeof c?.product_id !== 'string' || !Number.isInteger(n) || n < 0) return NextResponse.json({ error: 'كمية غير صحيحة — أرقام صحيحة بدون كسور' }, { status: 400 })
      clean.set(c.product_id, n)
    }
    const db = sb()
    const { data: prods } = await db.from('products').select('id,qty,branch_id').eq('org_id', org_id).in('id', [...clean.keys()])
    if ((prods || []).length !== clean.size) return NextResponse.json({ error: 'صنف غير موجود' }, { status: 404 })
    const mine = enforcedBranchId(access)
    if (mine && (prods as any[]).some(p => p.branch_id !== mine)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

    const { data: me } = await db.from('profiles').select('full_name').eq('id', access.userId).maybeSingle()
    const now = new Date().toISOString()
    const rows = (prods as any[]).map(p => ({
      org_id, branch_id: p.branch_id, product_id: p.id, counted_qty: clean.get(p.id)!, system_qty: Number(p.qty) || 0,
      counted_at: now, counted_by: access.userId, counted_by_name: (me as any)?.full_name || null,
    }))
    const { error } = await db.from('stock_counts').insert(rows as any)
    if (error) return NextResponse.json({ error: 'فشل حفظ الجرد' }, { status: 500 })

    const adjustments = rows.filter(r => r.counted_qty !== r.system_qty).map(r => ({
      org_id, product_id: r.product_id, branch_id: r.branch_id, profile_id: access.userId, type: 'adjustment',
      qty_change: r.counted_qty - r.system_qty, note: 'تسوية جرد', recorded_at: now,
    }))
    if (adjustments.length) {
      const { error: mErr } = await db.from('stock_movements').insert(adjustments as any)
      if (mErr) return NextResponse.json({ error: 'انحفظ الجرد لكن فشلت تسوية الرصيد' }, { status: 500 })
    }
    return NextResponse.json({ success: true, counted: rows.length, adjusted: adjustments.length })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
