import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * يقارن أسعار نفس الصنف عبر الموردين المختلفين، بناءً على سجل المشتريات
 * الفعلي (آخر 6 أشهر). يعرض بس الأصناف اللي فيها أكثر من مورد واحد
 * (وإلا ما فيه مجال مقارنة).
 */
export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const since180 = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

    const { data: purchases } = await db
      .from('purchases')
      .select('name,supplier,qty,total_amount,unit,created_at')
      .eq('org_id', org_id)
      .eq('category', 'مخزون')
      .gte('created_at', since180)
      .not('supplier', 'is', null)
      .order('created_at', { ascending: false })

    // تجميع: لكل (اسم صنف، مورد) نحسب متوسط سعر الوحدة من آخر عمليات الشراء
    const grouped: Record<string, Record<string, { total: number; qty: number; lastDate: string; unit: string }>> = {}

    for (const p of (purchases || [])) {
      const name = (p.name || '').trim()
      const supplier = (p.supplier || '').trim()
      const qty = Number(p.qty) || 0
      const amount = Number(p.total_amount) || 0
      if (!name || !supplier || qty <= 0 || amount <= 0) continue

      if (!grouped[name]) grouped[name] = {}
      if (!grouped[name][supplier]) grouped[name][supplier] = { total: 0, qty: 0, lastDate: p.created_at, unit: p.unit || '' }
      grouped[name][supplier].total += amount
      grouped[name][supplier].qty += qty
      if (p.created_at > grouped[name][supplier].lastDate) grouped[name][supplier].lastDate = p.created_at
    }

    // نبني قائمة المقارنة — بس الأصناف اللي فيها أكثر من مورد واحد
    const comparisons = Object.entries(grouped)
      .map(([name, suppliers]) => {
        const supplierList = Object.entries(suppliers).map(([supplier, d]) => ({
          supplier,
          unitPrice: Math.round((d.total / d.qty) * 100) / 100,
          lastPurchaseDate: d.lastDate,
          unit: d.unit,
        })).sort((a, b) => a.unitPrice - b.unitPrice)

        return { name, suppliers: supplierList }
      })
      .filter(c => c.suppliers.length > 1) // بس الأصناف اللي فيها أكثر من مورد
      .map(c => {
        const cheapest = c.suppliers[0]
        const mostExpensive = c.suppliers[c.suppliers.length - 1]
        const savingsPct = mostExpensive.unitPrice > 0
          ? Math.round(((mostExpensive.unitPrice - cheapest.unitPrice) / mostExpensive.unitPrice) * 100)
          : 0
        return { ...c, savingsPct }
      })
      .sort((a, b) => b.savingsPct - a.savingsPct)

    return NextResponse.json({ success: true, comparisons })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
