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
        .order('created_at',{ascending:true})
    ])

    // نجمع الحركات حسب المنتج مع التواريخ
    const movMap: Record<string,{dates:Date[],qtys:number[]}> = {}
    for(const m of (movements||[])) {
      const name = (m.products as any)?.name
      if(!name) continue
      if(!movMap[name]) movMap[name] = {dates:[],qtys:[]}
      movMap[name].dates.push(new Date(m.created_at))
      movMap[name].qtys.push(Math.abs(m.qty_change))
    }

    const forecast = (products||[]).map(p=>{
      const data = movMap[p.name]
      if(!data || data.dates.length === 0) return null

      const totalQty = data.qtys.reduce((s,q)=>s+q,0)
      const dispenseCount = data.dates.length // عدد مرات الصرف

      // متوسط الكمية لكل مرة صرف
      const avgQtyPerDispense = totalQty / dispenseCount

      // متوسط الفترة بين كل صرفة (بالأيام)
      let avgDaysBetween = 1
      if(data.dates.length > 1) {
        const firstDate = data.dates[0]
        const lastDate = data.dates[data.dates.length-1]
        const totalDays = (lastDate.getTime()-firstDate.getTime())/(1000*60*60*24)
        avgDaysBetween = Math.max(totalDays/(data.dates.length-1), 0.5)
      } else {
        // صرفة واحدة فقط — نفترض نفس الفترة من آخر صرف لليوم
        const daysSinceLast = (new Date().getTime()-data.dates[0].getTime())/(1000*60*60*24)
        avgDaysBetween = Math.max(daysSinceLast, 1)
      }

      // معدل الصرف اليومي الحقيقي
      const dailyRate = avgQtyPerDispense / avgDaysBetween

      // عدد الأيام قبل النفاد
      const daysLeft = dailyRate > 0 ? Math.floor(p.qty / dailyRate) : null

      // عدد الصرفات المتبقية
      const dispensesLeft = avgQtyPerDispense > 0 ? Math.floor(p.qty / avgQtyPerDispense) : null

      // الحالة بناءً على الأيام المتبقية والنقطة الحرجة
      let status = 'safe'
      if(p.qty <= p.reorder_point) status = 'critical'
      else if(daysLeft !== null && daysLeft <= 3) status = 'critical'
      else if(p.qty <= p.reorder_point*2) status = 'warning'
      else if(daysLeft !== null && daysLeft <= 7) status = 'warning'
      else if(p.qty <= p.reorder_point*3) status = 'watch'
      else if(daysLeft !== null && daysLeft <= 14) status = 'watch'

      return {
        name: p.name,
        unit: p.unit,
        currentQty: p.qty,
        reorderPoint: p.reorder_point,
        dailyRate: parseFloat(dailyRate.toFixed(2)),
        avgQtyPerDispense: parseFloat(avgQtyPerDispense.toFixed(1)),
        avgDaysBetween: parseFloat(avgDaysBetween.toFixed(1)),
        daysLeft,
        dispensesLeft,
        dispenseCount,
        status
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null && p.dailyRate > 0)
    .sort((a,b)=>{
      const s:Record<string,number>={critical:0,warning:1,watch:2,safe:3}
      return (s[a.status]||0)-(s[b.status]||0)||(a.daysLeft||999)-(b.daysLeft||999)
    })

    return NextResponse.json({ forecast })
  } catch(err:any) {
    return NextResponse.json({error:err.message},{status:500})
  }
}
