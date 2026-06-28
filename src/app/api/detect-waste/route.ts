import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const { org_id } = await req.json()
  if (!org_id) return NextResponse.json({ error: 'missing org_id' }, { status: 400 })

  const db = sb()
  const since90 = new Date(Date.now() - 90*24*60*60*1000).toISOString()

  // جلب المنتجات
  const { data: products } = await db.from('products')
    .select('id,name,qty,reorder_point,unit,category')
    .eq('org_id', org_id).eq('is_active', true)

  // جلب المشتريات آخر 90 يوم
  const { data: purchases } = await db.from('purchases')
    .select('amount,created_at,items')
    .eq('org_id', org_id)
    .gte('created_at', since90)

  // جلب الصرف آخر 90 يوم
  const { data: movements } = await db.from('stock_movements')
    .select('qty_change,created_at,products!inner(id,name,unit,org_id)')
    .eq('products.org_id', org_id)
    .eq('type', 'out')
    .gte('created_at', since90)
    .limit(1000)

  // حساب الصرف لكل منتج
  const dispenseMap: Record<string, number> = {}
  for (const m of (movements||[])) {
    const p = m.products as any
    if (!p) continue
    const key = p.name
    dispenseMap[key] = (dispenseMap[key]||0) + Math.abs(m.qty_change)
  }

  // كشف الهدر — منتج كميته عالية لكن صرفه قليل جداً
  const wasteItems = (products||[])
    .map(p => {
      const dispensed = dispenseMap[p.name] || 0
      const turnover = p.qty > 0 ? dispensed / p.qty : 0
      return { ...p, dispensed, turnover }
    })
    .filter(p => p.qty > p.reorder_point * 3 && p.dispensed < p.reorder_point)
    .sort((a,b) => a.turnover - b.turnover)

  // منتجات لم تُصرف أبداً خلال 90 يوم
  const neverDispensed = (products||[])
    .filter(p => p.qty > 0 && !dispenseMap[p.name])
    .slice(0, 10)

  // إجمالي قيمة المشتريات
  const totalPurchases = (purchases||[]).reduce((s:number, p:any) => s+Number(p.amount||0), 0)

  return NextResponse.json({
    waste: wasteItems.slice(0, 10),
    neverDispensed,
    totalPurchases,
    period: '90 يوم',
    summary: {
      totalProducts: (products||[]).length,
      wasteCount: wasteItems.length,
      neverDispensedCount: neverDispensed.length,
      potentialSaving: wasteItems.length * 100, // تقدير
    }
  })
}
