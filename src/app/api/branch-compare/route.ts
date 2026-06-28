import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { org_id, period = 30 } = await req.json()
  if (!org_id) return NextResponse.json({ error: 'missing' }, { status: 400 })

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const since = new Date(Date.now() - period*24*60*60*1000).toISOString()

  const [{ data: branches }, { data: movements }, { data: purchases }, { data: products }] = await Promise.all([
    db.from('branches').select('id,name').eq('org_id', org_id).eq('is_active', true),
    db.from('stock_movements')
      .select('qty_change,type,created_at,products!inner(name,unit,org_id,branch_id)')
      .eq('products.org_id', org_id).eq('type','out').gte('created_at', since).limit(2000),
    db.from('purchases').select('amount,branch_id,created_at').eq('org_id', org_id).gte('created_at', since),
    db.from('products').select('id,name,qty,reorder_point,branch_id').eq('org_id', org_id).eq('is_active', true),
  ])

  if (!branches?.length) return NextResponse.json({ branches: [] })

  const result = branches.map((b, i) => {
    const bProducts = (products||[]).filter((p:any) => p.branch_id === b.id)
    const bMovements = (movements||[]).filter((m:any) => (m.products as any)?.branch_id === b.id)
    const bPurchases = (purchases||[]).filter((p:any) => p.branch_id === b.id)

    // أكثر الأصناف صرفاً
    const prodMap: Record<string, { name:string; unit:string; total:number }> = {}
    for (const m of bMovements) {
      const p = m.products as any
      if (!p) continue
      if (!prodMap[p.name]) prodMap[p.name] = { name:p.name, unit:p.unit, total:0 }
      prodMap[p.name].total += Math.abs(m.qty_change)
    }
    const topProducts = Object.values(prodMap).sort((a,b)=>b.total-a.total).slice(0,5)

    const totalPurchases = bPurchases.reduce((s:number,p:any)=>s+Number(p.amount||0),0)
    const lowStock = bProducts.filter((p:any)=>p.qty<=p.reorder_point).length

    return {
      id: b.id,
      name: b.name,
      products: bProducts.length,
      lowStock,
      dispenses: bMovements.length,
      purchases: Math.round(totalPurchases),
      topProducts,
      rank: 0,
    }
  })

  // ترتيب الفروع حسب الأداء
  const sorted = [...result].sort((a,b) => b.dispenses - a.dispenses)
  sorted.forEach((b,i) => { b.rank = i+1 })

  return NextResponse.json({ branches: result, period })
}
