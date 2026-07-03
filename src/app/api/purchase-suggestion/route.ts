import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const db = sb()
    const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString()

    const [{ data: products }, { data: movements }] = await Promise.all([
      db.from('products').select('id,name,qty,unit,reorder_point').eq('org_id',org_id).eq('is_active',true),
      db.from('stock_movements')
        .select('qty_change,created_at,products!inner(name,org_id)')
        .eq('products.org_id',org_id)
        .eq('type','out')
        .gte('created_at',since30)
    ])

    const dispMap: Record<string,number> = {}
    for(const m of (movements||[])) {
      const name = (m.products as any)?.name
      if(!name) continue
      dispMap[name] = (dispMap[name]||0) + Math.abs(m.qty_change)
    }

    const suggestions = (products||[])
      .map(p=>{
        const total30 = dispMap[p.name]||0
        const dailyRate = total30/30
        const weeklyNeed = Math.ceil(dailyRate*7)
        const monthlyNeed = Math.ceil(dailyRate*30)
        // مقترح الشراء = احتياج أسبوعين - المخزون الحالي
        const suggestedQty = Math.max(Math.ceil(dailyRate*14) - p.qty, 0)
        const urgency = p.qty <= p.reorder_point ? 'urgent' : p.qty <= p.reorder_point*2 ? 'soon' : 'normal'

        return {
          name: p.name,
          unit: p.unit,
          currentQty: p.qty,
          reorderPoint: p.reorder_point,
          dailyRate: parseFloat(dailyRate.toFixed(2)),
          weeklyNeed,
          monthlyNeed,
          suggestedQty,
          urgency
        }
      })
      .filter(p=>p.dailyRate>0 && p.suggestedQty>0)
      .sort((a,b)=>{
        const u:Record<string,number>={urgent:0,soon:1,normal:2}
        return (u[a.urgency]||0)-(u[b.urgency]||0)||b.suggestedQty-a.suggestedQty
      })

    return NextResponse.json({ suggestions })
  } catch(err:any) {
    return NextResponse.json({error:err.message},{status:500})
  }
}
