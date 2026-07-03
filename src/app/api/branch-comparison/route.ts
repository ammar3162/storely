import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const db = sb()
    const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString()

    const [{ data: branches }, { data: outMov }, { data: inMov }, { data: purchases }] = await Promise.all([
      db.from('branches').select('id,name').eq('org_id',org_id).eq('is_active',true),
      db.from('stock_movements').select('qty_change,created_at,products!inner(name,org_id,branch_id)').eq('products.org_id',org_id).eq('type','out').gte('created_at',since30),
      db.from('stock_movements').select('qty_change,products!inner(name,org_id,branch_id)').eq('products.org_id',org_id).eq('type','in').gte('created_at',since30),
      db.from('purchases').select('total_amount,branch_id').eq('org_id',org_id).gte('created_at',since30),
    ])

    const branchMap: Record<string,{name:string,dispensed:number,added:number,purchases:number,ops:number}> = {}

    for(const b of (branches||[])) {
      branchMap[b.id] = {name:b.name,dispensed:0,added:0,purchases:0,ops:0}
    }

    for(const m of (outMov||[])) {
      const bid = (m.products as any)?.branch_id
      if(bid && branchMap[bid]) {
        branchMap[bid].dispensed += Math.abs(m.qty_change)
        branchMap[bid].ops++
      }
    }

    for(const m of (inMov||[])) {
      const bid = (m.products as any)?.branch_id
      if(bid && branchMap[bid]) branchMap[bid].added += Math.abs(m.qty_change)
    }

    for(const p of (purchases||[])) {
      if(p.branch_id && branchMap[p.branch_id]) {
        branchMap[p.branch_id].purchases += Number(p.total_amount)||0
      }
    }

    const comparison = Object.entries(branchMap)
      .map(([id,data])=>({
        id, ...data,
        efficiency: data.added>0 ? Math.round((data.dispensed/data.added)*100) : 0
      }))
      .sort((a,b)=>b.dispensed-a.dispensed)

    const maxDispensed = Math.max(...comparison.map(b=>b.dispensed),1)

    return NextResponse.json({ comparison, maxDispensed })
  } catch(err:any) {
    return NextResponse.json({error:err.message},{status:500})
  }
}
