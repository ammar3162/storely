import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const db = sb()
    const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString()

    const [{ data: inMov }, { data: outMov }, { data: products }] = await Promise.all([
      db.from('stock_movements').select('qty_change,products!inner(name,unit,org_id)').eq('products.org_id',org_id).eq('type','in').gte('created_at',since30),
      db.from('stock_movements').select('qty_change,products!inner(name,unit,org_id)').eq('products.org_id',org_id).eq('type','out').gte('created_at',since30),
      db.from('products').select('name,qty,unit,reorder_point').eq('org_id',org_id).eq('is_active',true),
    ])

    // ما أُضيف للمخزون
    const addedMap: Record<string,{qty:number,unit:string}> = {}
    for(const m of (inMov||[])) {
      const p = m.products as any
      if(!p) continue
      if(!addedMap[p.name]) addedMap[p.name] = {qty:0,unit:p.unit||''}
      addedMap[p.name].qty += Math.abs(m.qty_change)
    }

    // ما صُرف
    const dispMap: Record<string,number> = {}
    for(const m of (outMov||[])) {
      const p = m.products as any
      if(!p) continue
      dispMap[p.name] = (dispMap[p.name]||0) + Math.abs(m.qty_change)
    }

    // المخزون الحالي
    const stockMap: Record<string,{qty:number,unit:string}> = {}
    for(const p of (products||[])) stockMap[p.name] = {qty:p.qty,unit:p.unit}

    const waste = Object.entries(addedMap)
      .map(([name,{qty,unit}])=>{
        const dispensed = dispMap[name]||0
        const currentStock = stockMap[name]?.qty||0
        const ratio = qty>0 ? Math.round((dispensed/qty)*100) : 0
        const risk: string = ratio<10 && qty>5 ? 'high' : ratio<30 ? 'medium' : 'low'
        return { name, unit, added: qty, dispensed, currentStock, ratio, risk }
      })
      .filter(p=>p.added>0 && p.ratio<30 && p.added>2)
      .sort((a,b)=>{ const r:Record<string,number>={high:0,medium:1,low:2}; return (r[a.risk]||0)-(r[b.risk]||0)||a.ratio-b.ratio })
      .slice(0,10)

    return NextResponse.json({ waste })
  } catch(err:any) {
    return NextResponse.json({error:err.message},{status:500})
  }
}
