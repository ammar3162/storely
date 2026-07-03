import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const db = sb()
    const since90 = new Date(Date.now() - 90*24*60*60*1000).toISOString()

    const [{ data: products }, { data: movements }] = await Promise.all([
      db.from('products').select('id,name,qty,unit,reorder_point').eq('org_id',org_id).eq('is_active',true),
      db.from('stock_movements')
        .select('qty_change,created_at,products!inner(name,org_id)')
        .eq('products.org_id',org_id)
        .eq('type','out')
        .gte('created_at',since90)
    ])

    // احسب معدل الصرف بناءً على الأيام الفعلية
    const dispMap: Record<string,{total:number,firstDate:Date,lastDate:Date}> = {}
    for(const m of (movements||[])) {
      const name = (m.products as any)?.name
      if(!name) continue
      const d = new Date(m.created_at)
      if(!dispMap[name]) dispMap[name] = {total:0,firstDate:d,lastDate:d}
      dispMap[name].total += Math.abs(m.qty_change)
      if(d < dispMap[name].firstDate) dispMap[name].firstDate = d
      if(d > dispMap[name].lastDate) dispMap[name].lastDate = d
    }

    const forecast = (products||[])
      .map(p=>{
        const data = dispMap[p.name]
        if(!data) return null
        // عدد الأيام الفعلية بين أول وآخر صرف (minimum 1 يوم)
        const daysDiff = Math.max(
          Math.ceil((data.lastDate.getTime()-data.firstDate.getTime())/(1000*60*60*24)),
          1
        )
        const dailyRate = data.total/daysDiff
        const daysLeft = dailyRate>0 ? Math.floor(p.qty/dailyRate) : null
        const weeklyNeed = Math.ceil(dailyRate*7)
        
        let status = 'safe'
        if(daysLeft !== null) {
          if(daysLeft <= 3) status = 'critical'
          else if(daysLeft <= 7) status = 'warning'
          else if(daysLeft <= 14) status = 'watch'
        }

        return {
          name: p.name,
          unit: p.unit,
          currentQty: p.qty,
          dailyRate: parseFloat(dailyRate.toFixed(2)),
          daysLeft,
          weeklyNeed,
          status
        }
      })
      .filter(p=>p!==null && p.dailyRate>0)
      .filter((p:any)=>p!==null).sort((a:any,b:any)=>{
        const s:Record<string,number>={critical:0,warning:1,watch:2,safe:3}
        return (s[a.status]||0)-(s[b.status]||0)||(a.daysLeft||999)-(b.daysLeft||999)
      })

    return NextResponse.json({ forecast })
  } catch(err:any) {
    return NextResponse.json({error:err.message},{status:500})
  }
}
