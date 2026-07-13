import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatPhone, sendWhatsAppMessage, delay } from '@/lib/whatsapp'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { org_id, branch_id, send_to_suppliers } = await req.json()
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const db = sb()
    const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString()

    let productsQ2 = db.from('products').select('id,name,qty,unit,reorder_point,supplier_id').eq('org_id',org_id).eq('is_active',true)
    if (branch_id) productsQ2 = productsQ2.eq('branch_id', branch_id)
    let movementsQ2 = db.from('stock_movements')
      .select('product_id,qty_change,created_at,products!inner(org_id,branch_id)')
      .eq('products.org_id',org_id)
      .eq('type','out')
      .gte('created_at',since30)
    if (branch_id) movementsQ2 = movementsQ2.eq('products.branch_id', branch_id)

    const [{ data: products }, { data: movements }] = await Promise.all([productsQ2, movementsQ2])

    const dispMap: Record<string,number> = {}
    for (const m of (movements||[])) {
      const pid = (m as any).product_id
      if (!pid) continue
      dispMap[pid] = (dispMap[pid]||0) + Math.abs((m as any).qty_change)
    }

    const items = (products||[])
      .map((p:any) => {
        const total30 = dispMap[p.id]||0
        const dailyRate = total30/30
        const suggested = Math.max(Math.ceil(dailyRate*14) - p.qty, 0)
        return {
          id: p.id,
          name: p.name,
          unit: p.unit,
          qty: p.qty,
          reorder_point: p.reorder_point,
          supplier_id: p.supplier_id,
          monthly: total30,
          suggested,
        }
      })
      .filter((i:any) => i.suggested > 0 && i.monthly > 0)
      .sort((a:any,b:any) => b.suggested - a.suggested)

    if (items.length === 0) {
      return NextResponse.json({ message: '✅ كل شي تمام — لا يوجد أصناف تحتاج شراء حالياً بناءً على معدل الصرف الحالي' })
    }

    const withSupplier = items.filter((i:any)=>i.supplier_id)
    const unassigned = items.filter((i:any)=>!i.supplier_id)

    const supplierIds = [...new Set(withSupplier.map((i:any)=>i.supplier_id))]
    let suppliersData: any[] = []
    if (supplierIds.length > 0) {
      const { data } = await db.from('suppliers').select('id,name,phone').in('id', supplierIds)
      suppliersData = data || []
    }
    const supplierMap: Record<string,any> = {}
    for (const s of suppliersData) supplierMap[s.id] = s

    const groupsMap: Record<string, any> = {}
    for (const item of withSupplier) {
      const sid = item.supplier_id
      if (!groupsMap[sid]) {
        const supplier = supplierMap[sid]
        groupsMap[sid] = { supplier_id: sid, supplier: supplier?.name || 'مورد', phone: supplier?.phone || '', items: [] }
      }
      groupsMap[sid].items.push(item)
    }
    const supplierGroups = Object.values(groupsMap)

    const summary = {
      totalItems: items.length,
      suppliersToNotify: supplierGroups.length,
    }

    let results: any[] = []
    if (send_to_suppliers) {
      for (const g of supplierGroups as any[]) {
        if (!g.phone) { results.push({ supplier: g.supplier, sent: false }); continue }
        const lines = g.items.map((i:any) => `• ${i.name} — ${i.suggested} ${i.unit}`).join('\n')
        const msg = `🟢 *Storely*\n\nطلب شراء جديد 🛒\n\n${lines}\n\nيرجى التواصل لتأكيد الطلب`
        const result = await sendWhatsAppMessage(formatPhone(g.phone), msg)
        results.push({ supplier: g.supplier, sent: result.ok })
        await delay(600) // فاصل زمني يحمي من تجاوز حدود إرسال Wasender API
      }
    }

    return NextResponse.json({ summary, supplierGroups, unassigned, results })
  } catch (err:any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
