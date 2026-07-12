import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * كشف الهدر الحقيقي — يعتمد على حركات type='waste' المسجّلة يدوياً من الموظفين
 * (بعكس الأداة القديمة اللي كانت تخمّن الهدر من انخفاض نسبة الاستخدام)
 */
export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const db = sb()
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: wasteMoves }, { data: purchases }] = await Promise.all([
      (db as any).from('stock_movements')
        .select('qty_change,waste_reason,created_at,products!inner(id,name,unit,org_id)')
        .eq('products.org_id', org_id)
        .eq('type', 'waste')
        .gte('created_at', since30),
      db.from('purchases')
        .select('name,qty,total_amount')
        .eq('org_id', org_id)
        .not('total_amount', 'is', null)
        .not('qty', 'is', null),
    ])

    // متوسط سعر الوحدة لكل منتج من سجل المشتريات (لتقدير قيمة الهدر بالريال)
    const priceMap: Record<string, { total: number; qty: number }> = {}
    for (const p of (purchases || [])) {
      const name = (p as any).name
      const qty = Number((p as any).qty) || 0
      const amount = Number((p as any).total_amount) || 0
      if (!name || qty <= 0) continue
      if (!priceMap[name]) priceMap[name] = { total: 0, qty: 0 }
      priceMap[name].total += amount
      priceMap[name].qty += qty
    }

    const byProduct: Record<string, { name: string; unit: string; totalQty: number; reasons: Record<string, number> }> = {}
    for (const m of (wasteMoves || [])) {
      const p = (m as any).products
      if (!p) continue
      if (!byProduct[p.name]) byProduct[p.name] = { name: p.name, unit: p.unit || '', totalQty: 0, reasons: {} }
      const qty = Math.abs((m as any).qty_change)
      byProduct[p.name].totalQty += qty
      const reason = (m as any).waste_reason || 'غير محدد'
      byProduct[p.name].reasons[reason] = (byProduct[p.name].reasons[reason] || 0) + qty
    }

    const report = Object.values(byProduct).map(item => {
      const avgUnitPrice = priceMap[item.name] && priceMap[item.name].qty > 0
        ? priceMap[item.name].total / priceMap[item.name].qty
        : null
      const estimatedCost = avgUnitPrice !== null ? Math.round(avgUnitPrice * item.totalQty) : null
      const topReason = Object.entries(item.reasons).sort((a, b) => b[1] - a[1])[0]
      return {
        name: item.name,
        unit: item.unit,
        totalQty: item.totalQty,
        estimatedCost,
        topReason: topReason ? topReason[0] : null,
        reasonsBreakdown: item.reasons,
      }
    }).sort((a, b) => (b.estimatedCost || 0) - (a.estimatedCost || 0) || b.totalQty - a.totalQty)

    const totalEstimatedCost = report.reduce((s, r) => s + (r.estimatedCost || 0), 0)
    const totalWasteEntries = (wasteMoves || []).length

    return NextResponse.json({ report, totalEstimatedCost, totalWasteEntries, hasData: totalWasteEntries > 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
