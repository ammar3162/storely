import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * يحسب تقييم تلقائي (5 نجوم) لكل مورد بناءً على بيانات فعلية:
 * 1. الالتزام: نسبة الطلبات المؤكدة مقابل (غير المتوفر/انتهاء المهلة) — من supplier_performance_log
 * 2. السرعة: متوسط وقت الاستجابة بالدقائق للطلبات المؤكدة
 * 3. الاستمرارية: عدد مرات التعامل الفعلي (من purchases)
 * كل معيار يُحوّل لنقاط من 5، والنتيجة النهائية متوسط الثلاثة.
 */
export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()

    const [{ data: suppliers }, { data: perfLogs }, { data: purchases }] = await Promise.all([
      db.from('suppliers').select('id,name').eq('org_id', org_id).eq('is_active', true),
      (db as any).from('supplier_performance_log').select('supplier_id,event_type,response_minutes').eq('org_id', org_id),
      db.from('purchases').select('supplier').eq('org_id', org_id).not('supplier', 'is', null),
    ])

    // عدد مرات التعامل الفعلي لكل مورد (بالاسم، لأن purchases.supplier نص حر)
    const dealCountByName: Record<string, number> = {}
    for (const p of (purchases || [])) {
      const name = (p.supplier || '').trim()
      if (!name) continue
      dealCountByName[name] = (dealCountByName[name] || 0) + 1
    }
    const maxDeals = Math.max(...Object.values(dealCountByName), 1)

    const ratings = (suppliers || []).map((s: any) => {
      const logs = (perfLogs || []).filter((l: any) => l.supplier_id === s.id)
      const confirmed = logs.filter((l: any) => l.event_type === 'confirmed')
      const failed = logs.filter((l: any) => l.event_type === 'unavailable' || l.event_type === 'timeout')
      const totalEvents = confirmed.length + failed.length

      // 1. نقاط الالتزام (0-5)
      const commitmentScore = totalEvents > 0 ? (confirmed.length / totalEvents) * 5 : null

      // 2. نقاط السرعة (0-5) — كل ما كان وقت الاستجابة أقصر، نقاط أعلى (نعتبر 60 دقيقة = ممتاز، 24 ساعة = ضعيف)
      const responseTimes = confirmed.map((l: any) => l.response_minutes).filter((m: any) => m != null)
      const avgResponseMin = responseTimes.length > 0 ? responseTimes.reduce((s: number, m: number) => s + m, 0) / responseTimes.length : null
      const speedScore = avgResponseMin != null ? Math.max(0, Math.min(5, 5 - (avgResponseMin / 288))) : null // 1440 دقيقة (24 ساعة) تعطي 0 نقطة تقريباً

      // 3. نقاط الاستمرارية (0-5) — نسبية لأكثر مورد تعامل معه
      const dealCount = dealCountByName[s.name.trim()] || 0
      const consistencyScore = (dealCount / maxDeals) * 5

      const scores = [commitmentScore, speedScore, consistencyScore].filter((v): v is number => v != null)
      const overall = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : null

      return {
        id: s.id,
        name: s.name,
        stars: overall != null ? Math.round(overall * 10) / 10 : null,
        hasData: totalEvents > 0 || dealCount > 0,
        details: {
          totalOrders: totalEvents,
          confirmedOrders: confirmed.length,
          avgResponseHours: avgResponseMin != null ? Math.round((avgResponseMin / 60) * 10) / 10 : null,
          dealCount,
        },
      }
    })

    return NextResponse.json({ success: true, ratings })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
