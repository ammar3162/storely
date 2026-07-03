import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const db = sb()
    const since90 = new Date(Date.now() - 90*24*60*60*1000).toISOString()

    const { data: movements } = await db.from('stock_movements')
      .select('qty_change,created_at,products!inner(name,org_id)')
      .eq('products.org_id', org_id)
      .eq('type','out')
      .gte('created_at', since90)

    // تحليل حسب اليوم
    const dayMap: Record<number,{total:number,count:number}> = {}
    const hourMap: Record<number,{total:number,count:number}> = {}
    const weekMap: Record<string,{total:number,count:number}> = {}

    for(const m of (movements||[])) {
      const d = new Date(m.created_at)
      const day = d.getDay() // 0=أحد ... 6=سبت
      const hour = d.getHours()
      const week = `${d.getFullYear()}-W${Math.ceil(d.getDate()/7)}`

      if(!dayMap[day]) dayMap[day] = {total:0,count:0}
      dayMap[day].total += Math.abs(m.qty_change)
      dayMap[day].count++

      if(!hourMap[hour]) hourMap[hour] = {total:0,count:0}
      hourMap[hour].total += Math.abs(m.qty_change)
      hourMap[hour].count++

      if(!weekMap[week]) weekMap[week] = {total:0,count:0}
      weekMap[week].total += Math.abs(m.qty_change)
      weekMap[week].count++
    }

    const dayNames = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
    const maxDay = Math.max(...Object.values(dayMap).map(d=>d.total),1)
    const maxHour = Math.max(...Object.values(hourMap).map(h=>h.total),1)

    const byDay = dayNames.map((name,i)=>({
      day: name,
      total: dayMap[i]?.total||0,
      count: dayMap[i]?.count||0,
      percent: Math.round(((dayMap[i]?.total||0)/maxDay)*100)
    })).sort((a,b)=>b.total-a.total)

    const byHour = Array.from({length:24},(_,i)=>({
      hour: i,
      label: `${i}:00`,
      total: hourMap[i]?.total||0,
      percent: Math.round(((hourMap[i]?.total||0)/maxHour)*100)
    })).filter(h=>h.total>0).sort((a,b)=>b.total-a.total).slice(0,8)

    const peakDay = byDay[0]
    const peakHour = byHour[0]

    return NextResponse.json({ byDay, byHour, peakDay, peakHour })
  } catch(err:any) {
    return NextResponse.json({error:err.message},{status:500})
  }
}
