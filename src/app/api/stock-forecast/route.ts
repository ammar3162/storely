import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const db = sb()

    const [{ data: products }, { data: movements }] = await Promise.all([
      db.from('products').select('id,name,qty,unit,reorder_point').eq('org_id',org_id).eq('is_active',true),
      db.from('stock_movements')
        .select('qty_change,created_at,products!inner(name,org_id)')
        .eq('products.org_id',org_id)
        .eq('type','out')
        .order('created_at',{ascending:true})
    ])

    // نجمع الحركات حسب المنتج
    const movMap: Record<string,{dates:Date[],qtys:number[]}> = {}
    for(const m of (movements||[])) {
      const name = (m.products as any)?.name
      if(!name) continue
      if(!movMap[name]) movMap[name] = {dates:[],qtys:[]}
      movMap[name].dates.push(new Date(m.created_at))
      movMap[name].qtys.push(Math.abs(m.qty_change))
    }

    const todayDay = new Date().getDay()
    const dayNames = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
    const alpha = 0.3

    const forecast = (products||[]).map(p=>{
      const data = movMap[p.name]
      if(!data || data.dates.length === 0) return null

      const totalQty = data.qtys.reduce((s:number,q:number)=>s+q,0)
      const dispenseCount = data.dates.length

      // نجمع الكميات لكل يوم
      const dailyMap: Record<string,number> = {}
      data.dates.forEach((d,i)=>{
        const key = d.toISOString().split('T')[0]
        dailyMap[key] = (dailyMap[key]||0) + data.qtys[i]
      })
      const dailyValues = Object.entries(dailyMap)
        .sort((a,b)=>a[0].localeCompare(b[0]))
        .map(([,v])=>v)

      // نحتاج بيانات كافية (على الأقل 14 عملية صرف و14 يوم تغطية) عشان التنعيم الأسي
      // والمعاملات الموسمية تكون موثوقة إحصائياً. أقل من كذا، منتج واحد صُرف
      // مصادفة يعطي انطباع خاطئ بمعدل استهلاك مرتفع (وهذا كان يسبب تنبيهات "حرج" كاذبة).
      const firstDispenseDate = data.dates[0]
      const daysSpan = Math.max((new Date().getTime()-firstDispenseDate.getTime())/(1000*60*60*24),1)
      const longTermDailyAvg = totalQty / daysSpan
      const hasEnoughData = dispenseCount >= 14 && daysSpan >= 14

      let smoothed: number
      if (hasEnoughData) {
        // Exponential Smoothing — موثوق فقط مع بيانات كافية
        smoothed = dailyValues[0]
        for(let i=1;i<dailyValues.length;i++){
          smoothed = alpha * dailyValues[i] + (1-alpha) * smoothed
        }
        // مزج مع المعدل طويل المدى عشان ما ننخدع بيوم واحد شاذ (صرف كمية كبيرة دفعة وحدة)
        smoothed = smoothed*0.4 + longTermDailyAvg*0.6
      } else {
        // بيانات قليلة — نعتمد على المعدل البسيط طويل المدى فقط، بدون تنعيم مبالغ فيه
        smoothed = longTermDailyAvg
      }

      // معامل كل يوم من الأسبوع
      const dayFactors: Record<number,{total:number,count:number}> = {}
      data.dates.forEach((d,i)=>{
        const day = d.getDay()
        if(!dayFactors[day]) dayFactors[day] = {total:0,count:0}
        dayFactors[day].total += data.qtys[i]
        dayFactors[day].count++
      })

      const overallAvg = totalQty / dispenseCount
      const dayCoefficients: Record<number,number> = {}
      if (hasEnoughData) {
        for(const [d,{total,count}] of Object.entries(dayFactors)){
          dayCoefficients[Number(d)] = overallAvg > 0 ? (total/count)/overallAvg : 1
        }
      }
      // لو البيانات غير كافية، dayCoefficients تبقى فاضية فتُستخدم القيمة الافتراضية 1 لكل يوم (بدون موسمية)

      // أيوم الذروة
      const peakDayNum = Object.entries(dayCoefficients).sort((a,b)=>Number(b[1])-Number(a[1]))[0]
      const peakDay = peakDayNum ? dayNames[Number(peakDayNum[0])] : ''

      // معدل اليوم الحالي وغداً
      const dailyRate = parseFloat((smoothed * (dayCoefficients[todayDay]||1)).toFixed(2))
      const tomorrowRate = parseFloat((smoothed * (dayCoefficients[(todayDay+1)%7]||1)).toFixed(2))

      // حساب الأيام المتبقية بالموسمية
      let remaining = p.qty
      let daysLeft = 999
      for(let i=0;i<365;i++){
        const day = (todayDay+i)%7
        const rate = smoothed * (dayCoefficients[day]||1)
        remaining -= rate
        if(remaining <= 0) { daysLeft = i; break }
      }
      const daysLeftFinal = daysLeft === 999 ? null : daysLeft

      // الحالة
      let status = 'safe'
      if(p.qty <= p.reorder_point) status = 'critical'
      else if(daysLeftFinal !== null && daysLeftFinal <= 3) status = 'critical'
      else if(p.qty <= p.reorder_point*2) status = 'warning'
      else if(daysLeftFinal !== null && daysLeftFinal <= 7) status = 'warning'
      else if(p.qty <= p.reorder_point*3) status = 'watch'
      else if(daysLeftFinal !== null && daysLeftFinal <= 14) status = 'watch'

      const avgQtyPerDispense = parseFloat((totalQty/dispenseCount).toFixed(1))
      const firstDate = data.dates[0]
      const totalDays = Math.max((new Date().getTime()-firstDate.getTime())/(1000*60*60*24),1)
      const avgDaysBetween = parseFloat((dispenseCount>1?totalDays/(dispenseCount-1):totalDays).toFixed(1))

      return {
        name: p.name, unit: p.unit,
        currentQty: p.qty, reorderPoint: p.reorder_point,
        dailyRate, tomorrowRate, avgQtyPerDispense, avgDaysBetween,
        daysLeft: daysLeftFinal, dispenseCount, peakDay, status
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
