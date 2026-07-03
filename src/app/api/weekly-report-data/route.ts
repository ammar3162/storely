import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    if(!org_id) return NextResponse.json({error:'missing org_id'},{status:400})
    
    const db = sb()
    const since7 = new Date(Date.now() - 7*24*60*60*1000).toISOString()

    const [{ data: products }, { data: movements }] = await Promise.all([
      db.from('products').select('id,name,qty,reorder_point,unit,category').eq('org_id',org_id).eq('is_active',true),
      db.from('stock_movements').select('qty_change,created_at,products!inner(name,unit,org_id)').eq('products.org_id',org_id).eq('type','out').gte('created_at',since7).limit(500)
    ])

    // أكثر المنتجات صرفاً
    const productMap: Record<string,{name:string,qty:number,unit:string}> = {}
    for(const m of (movements||[])) {
      const p = m.products as any
      if(!p) continue
      if(!productMap[p.name]) productMap[p.name] = {name:p.name,qty:0,unit:p.unit}
      productMap[p.name].qty += Math.abs(m.qty_change)
    }
    const topProducts = Object.values(productMap).sort((a,b)=>b.qty-a.qty).slice(0,10)
    const totalDispensed = Object.values(productMap).reduce((s,p)=>s+p.qty,0)

    // منتجات ناقصة
    const lowStockItems = (products||[]).filter((p:any)=>p.qty<=p.reorder_point&&p.qty>0)
    const outOfStock = (products||[]).filter((p:any)=>p.qty===0)

    return NextResponse.json({
      topProducts,
      totalDispensed,
      totalProducts: products?.length||0,
      lowStock: lowStockItems.length + outOfStock.length,
      lowStockItems: [...outOfStock,...lowStockItems].slice(0,10)
    })
  } catch(err:any) {
    return NextResponse.json({error:err.message},{status:500})
  }
}
