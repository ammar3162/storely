import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const db = sb()
    const since90 = new Date(Date.now() - 90*24*60*60*1000).toISOString()
    const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString()

    const [{ data: products }, { data: purchases }, { data: inMov }, { data: outMov }] = await Promise.all([
      db.from('products').select('id,name,qty,reorder_point,unit,category').eq('org_id',org_id).eq('is_active',true),
      db.from('purchases').select('name,qty,unit,created_at').eq('org_id',org_id).gte('created_at',since90).eq('category','مخزون'),
      db.from('stock_movements').select('qty_change,created_at,products!inner(name,unit,org_id)').eq('products.org_id',org_id).eq('type','in').gte('created_at',since90),
      db.from('stock_movements').select('qty_change,created_at,products!inner(name,unit,org_id)').eq('products.org_id',org_id).eq('type','out').gte('created_at',since90),
    ])

    // ما تم إضافته (شراء + إدخال يدوي) خلال 90 يوم
    const addedMap: Record<string,{qty:number,unit:string,qty30:number}> = {}
    
    for(const p of (purchases||[])) {
      if(!p.name) continue
      if(!addedMap[p.name]) addedMap[p.name] = {qty:0,unit:p.unit||'',qty30:0}
      addedMap[p.name].qty += Number(p.qty)||0
      if(new Date(p.created_at) >= new Date(since30)) addedMap[p.name].qty30 += Number(p.qty)||0
    }

    for(const m of (inMov||[])) {
      const p = m.products as any
      if(!p) continue
      if(!addedMap[p.name]) addedMap[p.name] = {qty:0,unit:p.unit||'',qty30:0}
      addedMap[p.name].qty += Math.abs(m.qty_change)
      if(new Date(m.created_at) >= new Date(since30)) addedMap[p.name].qty30 += Math.abs(m.qty_change)
    }

    // ما تم صرفه خلال 90 يوم
    const dispMap: Record<string,{qty:number,qty30:number,days:Set<string>}> = {}
    for(const m of (outMov||[])) {
      const p = m.products as any
      if(!p) continue
      if(!dispMap[p.name]) dispMap[p.name] = {qty:0,qty30:0,days:new Set()}
      dispMap[p.name].qty += Math.abs(m.qty_change)
      dispMap[p.name].days.add(new Date(m.created_at).toDateString())
      if(new Date(m.created_at) >= new Date(since30)) dispMap[p.name].qty30 += Math.abs(m.qty_change)
    }

    // المخزون الحالي
    const stockMap: Record<string,{qty:number,unit:string}> = {}
    for(const p of (products||[])) {
      stockMap[p.name] = {qty:p.qty,unit:p.unit}
    }

    // حساب الهدر
    const waste = Object.entries(addedMap)
      .map(([name,{qty,unit,qty30}])=>{
        const disp = dispMap[name]||{qty:0,qty30:0,days:new Set()}
        const ratio90 = qty>0 ? Math.round((disp.qty/qty)*100) : 0
        const ratio30 = qty30>0 ? Math.round((disp.qty30/qty30)*100) : (qty30===0?-1:0)
        const currentStock = stockMap[name]?.qty||0
        const daysActive = disp.days.size
        const dailyRate = daysActive>0 ? (disp.qty/90).toFixed(1) : '0'
        
        // مستوى الخطر
        let risk: 'high'|'medium'|'low' = 'low'
        if(ratio90<10 && qty>5) risk = 'high'
        else if(ratio90<30) risk = 'medium'
        
        return {
          name, unit, 
          added90: qty,
          dispensed90: disp.qty,
          ratio90,
          currentStock,
          dailyRate,
          risk
        }
      })
      .filter(p=>p.added90>0 && p.ratio90<30 && p.added90>3)
      .sort((a,b)=>{
        const riskOrder = {high:0,medium:1,low:2}
        return riskOrder[a.risk]-riskOrder[b.risk] || a.ratio90-b.ratio90
      })
      .slice(0,15)

    return NextResponse.json({ waste, period: 90 })
  } catch(err:any) {
    return NextResponse.json({error:err.message},{status:500})
  }
}
