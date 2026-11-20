// مكان واحد لإشعارات المنشأة: كل إشعار يدخل الجرس (جدول notifications) يوصل كإشعار جوال/متصفح تلقائياً.
// قبل: كل جزء لازم «يتذكر» يرسل الإشعار بنفسه، فأغلب الإشعارات (طلبات الموظفين، المحاسب، رد الدعم…) كانت بالجرس بس.
// الإرسال بعد الرد (after) عشان ما يأخّر الطلب، وفشله ما يأثر على حفظ الإشعار.
import { after } from 'next/server'
import { sendPushToOrg } from '@/lib/push'
import { SOUL_REF_KIND, soulPath } from '@/lib/soulDecisions'

type Row = Record<string, any>
// رمز الريال الجديد ما يظهر في إشعارات بعض الجوالات — في الإشعار الفوري نكتب «ر.س»
const plain = (t: unknown) => String(t || '').replace(/\s*⃁/g, ' ر.س')
// إشعار طلب ينتظر قرار (عجز، استئذان، إجازة، سلفة، يوم إضافي): الضغط عليه يفتح Soul على بطاقة القرار نفسها
export const pushUrl = (r: Row, fallback?: string) => (SOUL_REF_KIND[r.ref_type] && r.ref_id ? soulPath(SOUL_REF_KIND[r.ref_type], r.ref_id) : fallback || '/notifications')

export async function notifyInsert(db: any, rows: Row | Row[], opts: { url?: string; push?: boolean } = {}) {
  const res = await db.from('notifications').insert(rows)
  if (!res?.error && opts.push !== false) {
    const list = (Array.isArray(rows) ? rows : [rows]).filter(r => r && r.org_id && r.title)
    if (list.length) {
      const job = async () => {
        for (const r of list) await sendPushToOrg(String(r.org_id), plain(r.title), plain(r.message), pushUrl(r, opts.url), r.branch_id || null).catch(() => null)
      }
      try { after(job) } catch { void job() }
    }
  }
  return res
}
