import { createClient } from '@supabase/supabase-js'

// أرقام حقيقية من عملائنا للصفحة التسويقية — تتحدث مع كاش الصفحة (كل 5 دقايق)
// نستبعد حسابات التجربة الداخلية (رواد = حساب اختبار، Bold Burger = حساب عرض المالك) وحسابات الاختبارات الآلية
const EXCLUDED_ORGS = ['72a7006c-2ae4-4fc4-8f12-be4612ffe7f0', '28dc15f2-ae6a-4385-b4ba-f7affde64b2b']
const MIN_CLOSINGS = 50   // أقل من كذا ما نعرض أرقام (بيئة الاختبار مثلاً)

export type LandingStats = { closings: number; sales: number; deficits: number; moves: number; checkins: number; deficitRate: number }


export async function getLandingStats(): Promise<LandingStats | null> {
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: tests } = await db.from('organizations').select('id').like('name', '\\_\\_it%')
    const excluded = [...EXCLUDED_ORGS, ...((tests || []) as any[]).map(o => o.id)]
    const notIn = `(${excluded.join(',')})`
    const [cl, mv, at] = await Promise.all([
      db.from('cashier_closings').select('total_sales,difference').not('org_id', 'in', notIn).limit(50000),
      db.from('stock_movements').select('id', { count: 'exact', head: true }).not('org_id', 'in', notIn),
      db.from('staff_attendance').select('id', { count: 'exact', head: true }).not('org_id', 'in', notIn),
    ])
    const rows = (cl.data || []) as { total_sales: number | null; difference: number | null }[]
    if (cl.error || rows.length < MIN_CLOSINGS) return null
    const sales = rows.reduce((t, r) => t + (Number(r.total_sales) || 0), 0)
    const deficits = rows.reduce((t, r) => t + Math.max(0, -(Number(r.difference) || 0)), 0)
    return {
      closings: rows.length, sales: Math.round(sales), deficits: Math.round(deficits),
      moves: mv.count || 0, checkins: at.count || 0,
      deficitRate: sales > 0 ? deficits / sales : 0,
    }
  } catch { return null }
}
