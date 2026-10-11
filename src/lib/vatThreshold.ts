import type { SupabaseClient } from '@supabase/supabase-js'

// حدود التسجيل في ضريبة القيمة المضافة (السعودية) — على إيرادات آخر ١٢ شهر
export const VAT_MANDATORY = 375000   // إلزامي
export const VAT_VOLUNTARY = 187500   // اختياري
export const VAT_NEAR = 300000        // ننبّه قبل الإلزامي بمسافة

export type VatLevel = 'ok' | 'voluntary' | 'near' | 'over'
export function vatLevel(sales12m: number): VatLevel {
  if (sales12m >= VAT_MANDATORY) return 'over'
  if (sales12m >= VAT_NEAR) return 'near'
  if (sales12m >= VAT_VOLUNTARY) return 'voluntary'
  return 'ok'
}

// مبيعات آخر ١٢ شهر من إقفالات الكاشير (كل الفروع)
export async function sales12m(db: SupabaseClient, orgId: string, today: string): Promise<number> {
  const from = new Date(Date.parse(`${today}T12:00:00Z`) - 365 * 86400e3).toISOString().slice(0, 10)
  let total = 0
  for (let page = 0; ; page++) {
    const { data, error } = await db.from('cashier_closings').select('total_sales').eq('org_id', orgId).gt('closing_date', from).lte('closing_date', today)
      .order('id').range(page * 1000, page * 1000 + 999)
    if (error) throw error
    for (const r of data || []) total += Number((r as any).total_sales) || 0
    if (!data || data.length < 1000) break
  }
  return Math.round(total * 100) / 100
}
