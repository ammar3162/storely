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

    // تأكيد الموردين عبر الواتساب انشال — المرجع الحين عدد التعاملات الفعلية (فواتير الشراء)
    const [{ data: suppliers }, { data: purchases }] = await Promise.all([
      db.from('suppliers').select('id,name').eq('org_id', org_id).eq('is_active', true),
      db.from('purchases').select('supplier').eq('org_id', org_id).not('supplier', 'is', null),
    ])
    const dealCountByName: Record<string, number> = {}
    for (const p of (purchases || []) as any[]) {
      const name = (p.supplier || '').trim()
      if (name) dealCountByName[name] = (dealCountByName[name] || 0) + 1
    }
    const ratings = (suppliers || []).map((s: any) => {
      const dealCount = dealCountByName[s.name.trim()] || 0
      return { id: s.id, name: s.name, stars: null, hasData: dealCount > 0, details: { dealCount } }
    })

    return NextResponse.json({ success: true, ratings })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
