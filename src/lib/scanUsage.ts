// مسح الفواتير بالذكاء الاصطناعي بدون حد للعميل — بس لو منشأة تعدّت SCAN_ALERT_AT بالشهر ينبَّه صاحب المنصة (مرة وحدة بالشهر)
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export const SCAN_ALERT_AT = 300
const ADMIN_PHONE = () => process.env.ADMIN_ALERT_PHONE || '966594351667'

/** يتنادى بعد كل مسح فاتورة (مسودة عميل المشتريات) — ما يوقف الطلب أبداً */
export async function noteInvoiceScan(db: SupabaseClient, orgId: string): Promise<void> {
  try {
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()
    const { count } = await db.from('invoice_drafts').select('id', { count: 'exact', head: true }).eq('org_id', orgId).gte('created_at', monthStart)
    if (count !== SCAN_ALERT_AT) return
    const { data: org } = await db.from('organizations').select('name,plan').eq('id', orgId).maybeSingle()
    await sendWhatsAppMessage(ADMIN_PHONE(), `*تنبيه استهلاك الذكاء الاصطناعي*\n\nمنشأة «${(org as any)?.name || orgId}» (${(org as any)?.plan || '-'}) وصلت ${SCAN_ALERT_AT} مسح فاتورة هالشهر.\nتكلفة المسح التقريبية: ${Math.round(SCAN_ALERT_AT * 0.12)} ريال.\n\nما توقف عنده شي — راجع استخدامه لو تحتاج.`)
  } catch {}
}
