import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const db = sb()
    const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString()

    const [{ data: purchases }, { data: movements }] = await Promise.all([
      db.from('purchases').select('name,qty,unit').eq('org_id',org_id).gte('created_at',since30).eq('category','مخزون'),
      db.from('stock_movements').select('qty_change,products!inner(name,unit,org_id)').eq('products.org_id',org_id).eq('type','out').gte('created_at',since30)
    ])

    // حساب ما تم شراؤه
    const purchaseMap: Record<string,{qty:number,unit:string}> = {}
    for(const p of (purchases||[])) {
      if(!p.name) continue
      if(!purchaseMap[p.name]) purchaseMap[p.name] = {qty:0,unit:p.unit||''}
      purchaseMap[p.name].qty += Number(p.qty)||0
    }

    // حساب ما تم صرفه
    const dispenseMap: Record<string,number> = {}
    for(const m of (movements||[])) {
      const name = (m.products as any)?.name
      if(!name) continue
      dispenseMap[name] = (dispenseMap[name]||0) + Math.abs(m.qty_change)
    }

    // كشف الهدر — منتجات اشتريت أكثر مما صرفت بكثير
    const waste = Object.entries(purchaseMap)
      .map(([name,{qty,unit}])=>{
        const dispensed = dispenseMap[name]||0
        const ratio = qty>0 ? Math.round((dispensed/qty)*100) : 0
        return {name,purchased:qty,dispensed,unit,ratio}
      })
      .filter(p=>p.purchased>0 && p.ratio<30) // أقل من 30% استخدام
      .sort((a,b)=>a.ratio-b.ratio)
      .slice(0,10)

    return NextResponse.json({ waste })
  } catch(err:any) {
    return NextResponse.json({error:err.message},{status:500})
  }
}
