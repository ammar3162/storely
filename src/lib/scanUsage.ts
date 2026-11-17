// مسح الفواتير بالذكاء الاصطناعي (استخدام عادل): ما نوقف العميل شهرياً — لو منشأة وصلت 300 (ثم 600، 900…) بالشهر
// ينبَّه صاحب المنصة. العدّ من سجل الذكاء (ai_usage) لكل طرق القراءة: عميل المشتريات + القراءة اليدوية.
// السقف اليومي الآمن في lib/rateLimit (aiScanOrgDay).
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export const SCAN_ALERT_AT = 300
const ADMIN_PHONE = () => process.env.ADMIN_ALERT_PHONE || '966594351667'

/** يتنادى بعد كل مسح فاتورة (مسودة عميل المشتريات) — ما يوقف الطلب أبداً */
export async function noteInvoiceScan(db: SupabaseClient, orgId: string): Promise<void> {
  try {
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()
    const { count } = await db.from('ai_usage').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
      .in('feature', ['invoice_scan', 'invoice_agent']).gte('created_at', monthStart)
    if (!count || count % SCAN_ALERT_AT !== 0) return
    const { data: org } = await db.from('organizations').select('name,plan').eq('id', orgId).maybeSingle()
    await sendWhatsAppMessage(ADMIN_PHONE(), `*تنبيه استهلاك الذكاء الاصطناعي*\n\nمنشأة «${(org as any)?.name || orgId}» (${(org as any)?.plan || '-'}) وصلت ${count} مسحاً للفواتير هذا الشهر.\nتكلفة المسح التقريبية: ${Math.round(count * 0.12)} ريال.\n\nلم يتوقف أي شيء لديه — راجع استخدامه عند الحاجة.`)
  } catch {}
}
