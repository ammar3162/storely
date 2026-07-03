import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const db = sb()
    const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString()

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

    const currentStock: Record<string,{qty:number,unit:string}> = {}
    for(const p of (products||[])) {
      currentStock[p.name] = {qty:p.qty, unit:p.unit}
    }

    const movMap: Record<string,{name:string,unit:string,added:number,dispensed:number}> = {}
    for(const m of (allMov||[])) {
      const p = m.products as any
      if(!p) continue
      if(!movMap[p.name]) movMap[p.name] = {name:p.name,unit:p.unit||'',added:0,dispensed:0}
      if(m.type==='in') movMap[p.name].added += Math.abs(m.qty_change)
      if(m.type==='out') movMap[p.name].dispensed += Math.abs(m.qty_change)
    }

    const waste = Object.entries(movMap)
      .map(([name,{unit,added,dispensed}])=>{
        const endStock = currentStock[name]?.qty || 0
        const startStock = Math.max(endStock - added + dispensed, 0)
        const usageRatio = added > 0 ? Math.round((dispensed/added)*100) : 0
        
        // نوع الهدر
        let wasteType = ''
        let risk = 'low'
        
        if(dispensed === 0 && added > 0) {
          wasteType = 'مخزون ميت — لم يُصرف منه شيء'
          risk = added > 20 ? 'high' : 'medium'
        } else if(usageRatio < 20 && added > 5) {
          wasteType = 'استخدام منخفض جداً'
          risk = usageRatio < 10 ? 'high' : 'medium'
        } else if(usageRatio < 40 && added > 10) {
          wasteType = 'استخدام أقل من المتوقع'
          risk = 'low'
        }

        return {
          name, unit, startStock, added, dispensed, endStock,
          usageRatio, wasteType, risk,
          wasteQty: added - dispensed
        }
      })
      .filter(p => p.wasteType !== '' && p.added > 2)
      .sort((a,b)=>{ 
        const r:Record<string,number>={high:0,medium:1,low:2}
        return (r[a.risk]||0)-(r[b.risk]||0) || b.wasteQty-a.wasteQty
      })
      .slice(0,10)

    return NextResponse.json({ waste })
  } catch(err:any) {
    return NextResponse.json({error:err.message},{status:500})
  }
}
