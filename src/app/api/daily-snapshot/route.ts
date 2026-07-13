import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-cron-secret')
    if(secret !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({error:'unauthorized'},{status:401})
    }
    const db = sb()
    const today = new Date().toISOString().slice(0,10)
    const { data: orgs } = await db.from('organizations').select('id')
    if(!orgs?.length) return NextResponse.json({done:0})
    let done = 0
    for(const org of orgs) {
      const { data: products } = await db.from('products')
        .select('id,name,qty,unit,category,reorder_point,avg_cost')
        .eq('org_id', org.id).eq('is_active', true)
      if(!products?.length) continue
      const total_value = products.reduce((s:number,p:any)=>s+(p.qty*(p.avg_cost||0)),0)
      const low_stock_count = products.filter((p:any)=>p.qty<=p.reorder_point).length
      await db.from('inventory_snapshots').delete().eq('org_id', org.id).eq('snapshot_date', today)
      await db.from('inventory_snapshots').insert({
        org_id: org.id, snapshot_date: today, total_value,
        total_products: products.length, low_stock_count,
        products_data: products
      } as any)
      done++

      // ── نسخة احتياطية كاملة يومية (بيانات فقط، بدون أي واجهة استعادة بعد) ──
      try {
        const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString()
        const [{ data: allProducts }, { data: purchases }, { data: movements }] = await Promise.all([
          db.from('products').select('*').eq('org_id', org.id),
          db.from('purchases').select('*').eq('org_id', org.id).gte('created_at', since30),
          db.from('stock_movements').select('*,products!inner(org_id)').eq('products.org_id', org.id).gte('created_at', since30),
        ])
        await (db as any).from('data_backups').upsert({
          org_id: org.id,
          backup_date: today,
          products_data: allProducts || [],
          purchases_data: purchases || [],
          movements_data: movements || [],
        }, { onConflict: 'org_id,backup_date' })

        // تنظيف: نحتفظ بآخر 30 يوم بس من النسخ الاحتياطية (يمسح فقط من data_backups، لا يمس البيانات الأصلية)
        const cutoff = new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10)
        await (db as any).from('data_backups').delete().eq('org_id', org.id).lt('backup_date', cutoff)
      } catch (e) {
        console.log('data_backups error for org', org.id, e)
      }
    }
    return NextResponse.json({ done, date: today })
  } catch(err:any) {
    return NextResponse.json({error:err.message},{status:500})
  }
}
