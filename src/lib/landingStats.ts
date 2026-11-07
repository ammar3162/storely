import { createClient } from '@supabase/supabase-js'

// أرقام حقيقية من عملائنا للصفحة التسويقية — تتحدث مع كاش الصفحة (كل 5 دقايق)
// نستبعد حسابات التجربة الداخلية (رواد = حساب اختبار، Bold Burger = حساب عرض المالك) وحسابات الاختبارات الآلية
const EXCLUDED_ORGS = ['72a7006c-2ae4-4fc4-8f12-be4612ffe7f0', '28dc15f2-ae6a-4385-b4ba-f7affde64b2b']
const MIN_CLOSINGS = 50   // أقل من كذا ما نعرض أرقام (بيئة الاختبار مثلاً)

// شريحة مبيعات يومية: كم مرة يطلع عجز، وكم غالباً لما يطلع، ومتوسطه لليوم — من الإقفالات الحقيقية
export type DeficitBand = { key: string; from: number; to: number | null; closings: number; shareWithDeficit: number; medianDeficit: number; perDay: number }
export type LandingStats = { closings: number; sales: number; deficits: number; moves: number; checkins: number; deficitRate: number; bands: DeficitBand[] }

const BANDS: { key: string; from: number; to: number | null }[] = [
  { key: 'small', from: 0, to: 1000 }, { key: 'mid', from: 1000, to: 2500 }, { key: 'big', from: 2500, to: null },
]
const MIN_BAND = 20   // أقل من كذا إقفال بالشريحة ما نعرضها (العيّنة صغيرة)
const median = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
function deficitBands(rows: { total_sales: number | null; difference: number | null }[]): DeficitBand[] {
  return BANDS.map(b => {
    const r = rows.filter(x => { const s = Number(x.total_sales) || 0; return s >= b.from && (b.to == null || s < b.to) })
    const defs = r.map(x => -(Number(x.difference) || 0)).filter(d => d > 0)
    return { ...b, closings: r.length, shareWithDeficit: r.length ? defs.length / r.length : 0, medianDeficit: Math.round(median(defs)),
      perDay: r.length ? defs.reduce((t, d) => t + d, 0) / r.length : 0 }
  }).filter(b => b.closings >= MIN_BAND)
}

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
      bands: deficitBands(rows),
    }
  } catch { return null }
}
