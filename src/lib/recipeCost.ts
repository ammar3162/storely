// سعر الوحدة لكل مادة خام لحساب تكلفة الوصفات — مكان واحد لنافذة الوصفة وتقرير تقدير الإنتاج.
// متوسط مرجّح من مشتريات آخر 180 يوم (الأسعار القديمة جداً تشوّه التكلفة)،
// والمنشأة المسجّلة بالضريبة تسترد ضريبة المشتريات → التكلفة الحقيقية بدون الضريبة.
import type { SupabaseClient } from '@supabase/supabase-js'

const WINDOW_DAYS = 180

export async function componentPriceMap(db: SupabaseClient, orgId: string, branchId?: string | null): Promise<Record<string, number>> {
  const { data: org } = await db.from('organizations').select('vat_registered').eq('id', orgId).maybeSingle()
  const net = !!(org as any)?.vat_registered
  const since = new Date(Date.now() - WINDOW_DAYS * 864e5).toISOString()
  const load = async (sinceIso: string | null) => {
    let q = db.from('purchases').select('name,qty,amount,total_amount').eq('org_id', orgId).not('qty', 'is', null)
    if (branchId) q = q.eq('branch_id', branchId)
    if (sinceIso) q = q.gte('created_at', sinceIso)
    return ((await q).data || []) as any[]
  }
  let rows = await load(since)
  // مافيه مشتريات حديثة؟ نرجع لكل السجل بدل ما تطلع التكلفة صفر
  if (!rows.length) rows = await load(null)
  const totals: Record<string, { total: number; qty: number }> = {}
  for (const p of rows) {
    const qty = Number(p.qty) || 0
    const amt = Number(net ? p.amount : (p.total_amount ?? p.amount)) || 0
    if (!p.name || qty <= 0 || amt <= 0) continue
    totals[p.name] ??= { total: 0, qty: 0 }
    totals[p.name].total += amt
    totals[p.name].qty += qty
  }
  const out: Record<string, number> = {}
  for (const nm in totals) out[nm] = totals[nm].total / totals[nm].qty
  return out
}
