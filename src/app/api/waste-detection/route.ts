import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const db = sb()
    const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString()

    // جيب كل حركات المخزون خلال 30 يوم
    const [{ data: allMov }, { data: products }] = await Promise.all([
      db.from('stock_movements')
        .select('qty_change,type,created_at,products!inner(id,name,unit,org_id)')
        .eq('products.org_id', org_id)
        .gte('created_at', since30),
      db.from('products')
        .select('id,name,qty,unit,reorder_point')
        .eq('org_id', org_id)
        .eq('is_active', true),
    ])

    // المخزون الحالي (آخر المدة)
    const currentStock: Record<string,{qty:number,unit:string}> = {}
    for(const p of (products||[])) {
      currentStock[p.name] = {qty:p.qty, unit:p.unit}
    }

    // احسب الإضافات والصرف خلال 30 يوم
    const movMap: Record<string,{name:string,unit:string,added:number,dispensed:number}> = {}
    for(const m of (allMov||[])) {
      const p = m.products as any
      if(!p) continue
      if(!movMap[p.name]) movMap[p.name] = {name:p.name,unit:p.unit||'',added:0,dispensed:0}
      if(m.type==='in') movMap[p.name].added += Math.abs(m.qty_change)
      if(m.type==='out') movMap[p.name].dispensed += Math.abs(m.qty_change)
    }

    // المعادلة المحاسبية:
    // مخزون أول المدة = مخزون الحالي - ما أُضيف + ما صُرف
    // الهدر = مخزون أول المدة + ما أُضيف - ما صُرف - مخزون الحالي
    const waste = Object.entries(movMap)
      .map(([name,{unit,added,dispensed}])=>{
        const endStock = currentStock[name]?.qty || 0
        const startStock = endStock - added + dispensed
        const expectedEnd = startStock + added - dispensed
        const waste_qty = endStock - expectedEnd // سالب = هدر
        const theoretical = startStock + added
        const wastePercent = theoretical > 0 ? Math.round((Math.abs(waste_qty)/theoretical)*100) : 0
        
        // الهدر الحقيقي = ما يُفسر بالصرف أو الإضافة
        const risk: string = wastePercent > 20 ? 'high' : wastePercent > 10 ? 'medium' : 'low'
        
        return {
          name, unit,
          startStock: Math.max(startStock, 0),
          added,
          dispensed,
          endStock,
          expectedEnd: Math.max(expectedEnd, 0),
          waste_qty: Math.abs(Math.min(waste_qty, 0)),
          wastePercent,
          risk
        }
      })
      .filter(p=>(p.added > 0 || p.dispensed > 0) && p.waste_qty > 0 && p.wastePercent > 5)
      .sort((a,b)=>{ 
        const r:Record<string,number>={high:0,medium:1,low:2}
        return (r[a.risk]||0)-(r[b.risk]||0) || b.wastePercent-a.wastePercent 
      })
      .slice(0,10)

    return NextResponse.json({ waste })
  } catch(err:any) {
    return NextResponse.json({error:err.message},{status:500})
  }
}
