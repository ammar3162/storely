import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * قاعدة طلب التوريد: طلب واحد فقط لكل "نزول" للصنف تحت الحد الأدنى.
 * بعد ما ينرسل طلب لصنف، ما ينرسل له طلب ثاني لين ينعاد تعبئته (أي حركة مخزون موجبة: شراء/إضافة/نقل وارد).
 * لو نزل تحت الحد مرة ثانية بعد التعبئة ← طلب جديد.
 *
 * يرجّع true لو فيه طلب منرسل لهذا الصنف ولسا ما صار له تعبئة بعده (يعني لا ترسل).
 */
export async function orderedSinceLastRestock(db: SupabaseClient, product_id: string): Promise<boolean> {
  const [{ data: log }, { data: order }] = await Promise.all([
    db.from('supplier_order_logs').select('created_at').eq('product_id', product_id).eq('status', 'sent')
      .order('created_at', { ascending: false }).limit(1),
    db.from('supplier_orders').select('created_at').eq('product_id', product_id)
      .order('created_at', { ascending: false }).limit(1),
  ])
  const times = [(log as any)?.[0]?.created_at, (order as any)?.[0]?.created_at].filter(Boolean) as string[]
  if (!times.length) return false
  const lastOrderAt = times.sort().at(-1)!

  const { data: restock } = await db.from('stock_movements').select('id')
    .eq('product_id', product_id).gt('qty_change', 0).gt('created_at', lastOrderAt).limit(1)
  return !restock?.length
}

/** محاولة إرسال فاشلة حديثة (رقم غلط مثلاً) — ما نعيد المحاولة كل نص ساعة */
export async function failedRecently(db: SupabaseClient, product_id: string, hours = 24): Promise<boolean> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const { data } = await db.from('supplier_order_logs').select('id')
    .eq('product_id', product_id).eq('status', 'failed').gte('created_at', since).limit(1)
  return !!data?.length
}

/** يسجّل إرسال طلب لصنف (يعتمد عليه orderedSinceLastRestock ومسار الجدولة) */
export async function logSupplierOrder(db: SupabaseClient, p: { product_id: string; supplier_id: string; qty_at_trigger: number; ok: boolean }) {
  await db.from('supplier_order_logs').insert({
    product_id: p.product_id, supplier_id: p.supplier_id, qty_at_trigger: p.qty_at_trigger, status: p.ok ? 'sent' : 'failed',
  } as any)
}
