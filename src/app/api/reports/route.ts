import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// بيانات صفحة التقارير — نفس الاستعلامات اللي كانت بالمتصفح، والحسابات (الرسوم، التجميع باليوم المحلي) تبقى بالواجهة.
// المدى الزمني يجي من الواجهة (start/end بصيغة ISO) لأنه محسوب بتوقيت المستخدم.
//   type=movements&movement_type=out|waste  تقرير الصرف/الهدر
//   type=purchases                          فواتير الفترة
//   type=deleted_purchases                  آخر 100 فاتورة محذوفة + اسم من حذفها
//   type=inventory                          الجرد: الأصناف + حركات وفواتير الفترة
//   type=attendance                         سجلات الحضور بالفترة
//   type=summary                            أرقام الصفحة الرئيسية للتقارير
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const type = searchParams.get('type')
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    if (!org_id || !type) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const bid = enforcedBranchId(access, searchParams.get('branch_id'))
    const needsRange = type !== 'deleted_purchases'
    if (needsRange && (!start || !end || isNaN(Date.parse(start)) || isNaN(Date.parse(end)))) {
      return NextResponse.json({ error: 'الفترة غير صالحة' }, { status: 400 })
    }
    const db = sb()

    const movementsOf = (movementType: string, fields: string) => {
      let q = db.from('stock_movements').select(fields).eq('type', movementType).eq('products.org_id', org_id)
        .gte('created_at', start!).lte('created_at', end!)
      if (bid) q = q.eq('products.branch_id', bid)
      return q
    }

    if (type === 'movements') {
      const movementType = searchParams.get('movement_type') === 'waste' ? 'waste' : 'out'
      const { data, error } = await movementsOf(movementType,
        '*,products!inner(name,unit,org_id,branch_id),profiles!profile_id(full_name),staff_members!staff_id(name)')
        .order('created_at', { ascending: false })
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      return NextResponse.json({ success: true, movements: data || [] })
    }

    if (type === 'purchases') {
      let q = db.from('purchases').select('id,created_at,name,category,amount,vat_amount,total_amount,supplier,invoice_image,qty,unit,has_vat')
        .eq('org_id', org_id).is('deleted_at', null).gte('created_at', start!).lte('created_at', end!)
      if (bid) q = q.eq('branch_id', bid)
      const { data, error } = await q.order('created_at', { ascending: false })
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      return NextResponse.json({ success: true, purchases: data || [] })
    }

    if (type === 'deleted_purchases') {
      let q = db.from('purchases').select('id,name,category,qty,unit,total_amount,supplier,deleted_at,deleted_by,branch_id')
        .eq('org_id', org_id).not('deleted_at', 'is', null)
      if (enforcedBranchId(access)) q = q.eq('branch_id', enforcedBranchId(access)!)
      const { data, error } = await q.order('deleted_at', { ascending: false }).limit(100)
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      const rows = (data || []) as any[]
      const ids = [...new Set(rows.map(r => r.deleted_by).filter(Boolean))]
      const names: Record<string, string> = {}
      if (ids.length) {
        const { data: profs } = await db.from('profiles').select('id,full_name').in('id', ids)
        for (const p of (profs || []) as any[]) names[p.id] = p.full_name
      }
      return NextResponse.json({ success: true, deleted: rows.map(r => ({ ...r, deleterName: names[r.deleted_by] || '—' })) })
    }

    if (type === 'inventory') {
      let pq = db.from('products').select('id,name,unit,qty,reorder_point,category').eq('org_id', org_id).eq('is_active', true)
      if (bid) pq = pq.eq('branch_id', bid)
      let mq = db.from('stock_movements').select('qty_change,type,products!inner(name,org_id,branch_id)').eq('products.org_id', org_id)
        .gte('created_at', start!).lte('created_at', end!)
      if (bid) mq = mq.eq('products.branch_id', bid)
      let puq = db.from('purchases').select('name,qty,unit,category').eq('org_id', org_id).eq('category', 'مخزون').is('deleted_at', null)
        .gte('created_at', start!).lte('created_at', end!)
      if (bid) puq = puq.eq('branch_id', bid)
      const [prods, mvs, pus] = await Promise.all([pq.order('name'), mq, puq])
      if (prods.error || mvs.error || pus.error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      return NextResponse.json({ success: true, products: prods.data || [], movements: mvs.data || [], purchases: pus.data || [] })
    }

    if (type === 'attendance') {
      let q = db.from('staff_attendance').select('recorded_at,type,staff_name,staff_id').eq('org_id', org_id)
        .gte('recorded_at', start!).lte('recorded_at', end!).order('recorded_at', { ascending: true })
      if (bid) q = q.eq('branch_id', bid)
      const { data, error } = await q
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      return NextResponse.json({ success: true, records: data || [] })
    }

    if (type === 'summary') {
      const startDate = start!.slice(0, 10), endDate = end!.slice(0, 10)
      let puq = db.from('purchases').select('amount,total_amount,vat_amount,created_at,branch_id').eq('org_id', org_id).is('deleted_at', null)
        .gte('created_at', start!).lte('created_at', end!)
      if (bid) puq = puq.eq('branch_id', bid)
      let invq = db.from('products').select('qty,reorder_point').eq('org_id', org_id).eq('is_active', true)
      if (bid) invq = invq.eq('branch_id', bid)
      let cq = db.from('cashier_closings').select('status').eq('org_id', org_id).gte('closing_date', startDate).lte('closing_date', endDate)
      if (bid) cq = cq.eq('branch_id', bid)
      let rq = db.from('stock_movements').select('id,qty_change,type,created_at,products!inner(name,unit,org_id,branch_id)')
        .eq('products.org_id', org_id).order('created_at', { ascending: false }).limit(10)
      if (bid) rq = rq.eq('products.branch_id', bid)

      const [mv, pu, wv, inv, closings, recent] = await Promise.all([
        movementsOf('out', 'qty_change,created_at,products!inner(name,org_id,branch_id)'),
        puq,
        movementsOf('waste', 'qty_change,created_at,products!inner(name,org_id,branch_id)'),
        invq, cq, rq,
      ])
      if (mv.error || pu.error || wv.error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      return NextResponse.json({
        success: true,
        dispense: mv.data || [], purchases: pu.data || [], waste: wv.data || [],
        inventory: inv.data || [], closings: closings.data || [], recent: recent.data || [],
      })
    }

    return NextResponse.json({ error: 'نوع تقرير غير معروف' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
