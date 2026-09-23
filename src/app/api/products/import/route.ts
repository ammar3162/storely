import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// استيراد جماعي من ملف CSV: صنف موجود (بالاسم، بنفس الفرع) = تحديث + تسوية الكمية بالفرق،
// صنف جديد = إضافة بكمية صفر + حركة "in". الكمية ما تُكتب مباشرة أبداً (الـ trigger يحسبها من الحركات)
export async function POST(req: Request) {
  try {
    const { org_id, branch_id, rows } = await req.json()
    if (!org_id || !Array.isArray(rows) || !rows.length) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const bid = enforcedBranchId(access, branch_id)
    if (bid) {
      const { data: b } = await db.from('branches').select('id').eq('id', bid).eq('org_id', org_id).maybeSingle()
      if (!b) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })
    }

    let pq = db.from('products').select('id,name,qty').eq('org_id', org_id).eq('is_active', true)
    if (bid) pq = pq.eq('branch_id', bid)
    const { data: existingList } = await pq
    const byName = new Map((existingList || []).map((p: any) => [String(p.name).trim(), p]))

    let added = 0, updated = 0, failed = 0
    for (const raw of rows.slice(0, 2000)) {
      const row = {
        name: String(raw.name || '').trim(),
        category: String(raw.category || '').trim() || null,
        qty: Number(raw.qty) || 0,
        unit: String(raw.unit || 'قطعة').trim(),
        reorder_point: Number(raw.reorder_point) || 5,
      }
      if (!row.name) continue
      const existing: any = byName.get(row.name)

      if (existing) {
        const { error: updErr } = await db.from('products').update({ reorder_point: row.reorder_point, category: row.category, unit: row.unit } as any).eq('id', existing.id)
        if (updErr) { failed++; continue }
        const delta = row.qty - (Number(existing.qty) || 0)
        if (delta !== 0) {
          const { error: moveErr } = await db.from('stock_movements').insert({ product_id: existing.id, org_id, profile_id: access.userId, type: 'adjustment', qty_change: delta, note: 'تسوية استيراد جماعي' } as any)
          if (moveErr) { failed++; continue }
        }
        updated++
      } else {
        const { data: np, error: insErr } = await db.from('products').insert({
          org_id, branch_id: bid || null, name: row.name, category: row.category, qty: 0, unit: row.unit, reorder_point: row.reorder_point, is_active: true,
        } as any).select('id').single()
        if (insErr || !np) { failed++; continue }
        byName.set(row.name, { id: (np as any).id, name: row.name, qty: row.qty })
        if (row.qty > 0) {
          const { error: moveErr } = await db.from('stock_movements').insert({ product_id: (np as any).id, org_id, profile_id: access.userId, type: 'in', qty_change: row.qty, note: 'إضافة أولية — استيراد جماعي' } as any)
          if (moveErr) { failed++; continue }
        }
        added++
      }
    }
    return NextResponse.json({ success: true, added, updated, failed })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
