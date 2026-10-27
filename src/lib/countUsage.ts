// الاستهلاك الحقيقي من الجرد: أول المدة + الوارد − المحوَّل للفروع − الهدر − آخر المدة.
// ما يعتمد على تسجيل الصرف (الموظف ياخذ كيس كامل)، فهو الأدق لتقدير الإنتاج على فترة.
import type { SupabaseClient } from '@supabase/supabase-js'

export type CountUsage = { used: number; from: string; to: string }

export async function usageFromCounts(db: SupabaseClient, orgId: string, productIds: string[], since: string, until: string | null): Promise<Record<string, CountUsage>> {
  if (!productIds.length) return {}
  const end = until || new Date().toISOString()
  const { data: counts } = await db.from('stock_counts').select('product_id,counted_qty,counted_at')
    .eq('org_id', orgId).in('product_id', productIds).lte('counted_at', end).order('counted_at', { ascending: true })
  const byProduct: Record<string, { counted_qty: number; counted_at: string }[]> = {}
  for (const c of (counts || []) as any[]) (byProduct[c.product_id] ??= []).push(c)

  // لكل صنف: جرد البداية = آخر جرد قبل بداية الفترة (أو أول جرد داخلها)، والنهاية = آخر جرد لين نهايتها
  const windows: Record<string, { open: any; close: any }> = {}
  for (const pid of productIds) {
    const list = byProduct[pid] || []
    const before = list.filter(c => c.counted_at <= since)
    const open = before.length ? before[before.length - 1] : list.find(c => c.counted_at > since)
    const close = list[list.length - 1]
    if (open && close && close.counted_at > open.counted_at) windows[pid] = { open, close }
  }
  const ids = Object.keys(windows)
  if (!ids.length) return {}
  const minAt = ids.map(id => windows[id].open.counted_at).sort()[0]
  const { data: moves } = await db.from('stock_movements').select('product_id,type,qty_change,recorded_at')
    .in('product_id', ids).in('type', ['in', 'transfer_in', 'transfer_out', 'waste']).gt('recorded_at', minAt).lte('recorded_at', end)
  const out: Record<string, CountUsage> = {}
  for (const pid of ids) {
    const { open, close } = windows[pid]
    let net = 0 // الوارد موجب، والمحوَّل والهدر سالب
    for (const m of (moves || []) as any[]) {
      if (m.product_id === pid && m.recorded_at > open.counted_at && m.recorded_at <= close.counted_at) net += Number(m.qty_change) || 0
    }
    out[pid] = { used: Math.max(0, open.counted_qty + net - close.counted_qty), from: open.counted_at, to: close.counted_at }
  }
  return out
}
