import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const db = sb()
    const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString()

    const [{ data: branches }, { data: outMov }, { data: inMov }, { data: purchases }, { data: products }] = await Promise.all([
      db.from('branches').select('id,name').eq('org_id',org_id).eq('is_active',true),
      db.from('stock_movements').select('qty_change,created_at,products!inner(name,unit,org_id,branch_id)').eq('products.org_id',org_id).eq('type','out').gte('created_at',since30),
      db.from('stock_movements').select('qty_change,products!inner(name,org_id,branch_id)').eq('products.org_id',org_id).eq('type','in').gte('created_at',since30),
      db.from('purchases').select('total_amount,branch_id').eq('org_id',org_id).gte('created_at',since30),
      db.from('products').select('branch_id,qty,reorder_point').eq('org_id',org_id).eq('is_active',true),
    ])

    const branchMap: Record<string,{name:string,dispensed:number,added:number,purchases:number,ops:number}> = {}
    const topProductsMap: Record<string, Record<string, {qty:number,unit:string}>> = {}
    const invMap: Record<string,{total:number,low:number,out:number}> = {}

    for(const b of (branches||[])) {
      branchMap[b.id] = {name:b.name,dispensed:0,added:0,purchases:0,ops:0}
      topProductsMap[b.id] = {}
      invMap[b.id] = {total:0,low:0,out:0}
    }

    for(const m of (outMov||[])) {
      const prod = m.products as any
      const bid = prod?.branch_id
      if(bid && branchMap[bid]) {
        branchMap[bid].dispensed += Math.abs(m.qty_change)
        branchMap[bid].ops++
        const name = prod?.name || 'غير معروف'
        if(!topProductsMap[bid][name]) topProductsMap[bid][name] = {qty:0, unit:prod?.unit||''}
        topProductsMap[bid][name].qty += Math.abs(m.qty_change)
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

    for(const p of (products||[])) {
      const bid = (p as any).branch_id
      if(bid && invMap[bid]) {
        invMap[bid].total++
        const qty = Number((p as any).qty)||0
        const rp = Number((p as any).reorder_point)||0
        if(qty===0) invMap[bid].out++
        else if(qty<=rp) invMap[bid].low++
      }
    }

    const comparison = Object.entries(branchMap)
      .map(([id,data])=>{
        const topList = Object.entries(topProductsMap[id]||{})
          .map(([name,v])=>({name,qty:v.qty,unit:v.unit}))
          .sort((a,b)=>b.qty-a.qty)
          .slice(0,5)
        return {
          id, ...data,
          efficiency: data.added>0 ? Math.round((data.dispensed/data.added)*100) : 0,
          inventory: invMap[id] || {total:0,low:0,out:0},
          topProducts: topList,
        }
      })
      .sort((a,b)=>b.dispensed-a.dispensed)

    const maxDispensed = Math.max(...comparison.map(b=>b.dispensed),1)

    return NextResponse.json({ comparison, maxDispensed })
  } catch(err:any) {
    return NextResponse.json({error:err.message},{status:500})
  }
}
