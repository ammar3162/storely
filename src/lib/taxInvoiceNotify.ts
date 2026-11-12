// تنبيهات الفواتير الضريبية — خادم فقط (يرسل إشعار جوال). منفصل عن lib/taxInvoice لأن صفحات المتصفح تستورد ذاك
import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyInsert } from '@/lib/notify'

/** تنبيه المالك: مبلغ فاتورة مسجّل أكبر من الأصلي */
export async function notifyQrMismatch(db: SupabaseClient, orgId: string, branchId: string | null, alert: string, by?: string) {
  await notifyInsert(db, {
    org_id: orgId, branch_id: branchId, type: 'warning', read: false,
    title: 'فاتورة مبلغها أكبر من الأصلية', message: by ? `${alert} — سجّلها ${by}` : alert,
  } as any)
}
