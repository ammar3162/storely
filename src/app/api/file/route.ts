import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { storedInvoicePath, orgOfInvoicePath } from '@/lib/invoiceUrl'
import { getCurrentProfile } from '@/lib/verifyOrgAccess'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { currentAccountant, accessFor } from '@/lib/accountantPortalAuth'
import { isSubscriptionActive } from '@/lib/subscription'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// صور الفواتير والإيصالات والمهام (مجلد خاص): تنفتح بس لأصحاب المنشأة —
// المالك ومدير الفرع (الجلسة)، موظف المنشأة (توكن الموظف)، أو المحاسب المربوط فيها.
// لو انرسل الرابط لأحد برا ما يفتح. بعد التحقق نحوّل لرابط موقّع صالح دقيقة وحدة.
const deny = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })

async function allowed(req: Request, orgId: string): Promise<boolean> {
  // المالك / مدير الفرع: نفس المنشأة، جهاز موثوق، وحسابه شغّال
  const profile = await getCurrentProfile().catch(() => null)
  if (profile && profile.orgId === orgId && profile.deviceTrusted !== false && profile.status !== 'suspended') return true
  // موظف المنشأة (تطبيق الموظفين)
  const staffTok = extractStaffToken(req)
  if (staffTok) {
    const s = await verifyStaffToken(staffTok).catch(() => null)
    if (s?.valid && s.data?.org_id === orgId) return true
  }
  // المحاسب المربوط بالمنشأة
  const db = sb()
  const acc = await currentAccountant(db, req).catch(() => null)
  if (acc) {
    const access = await accessFor(db, acc.id, orgId).catch(() => null)
    if (access && (access as any).org_id === orgId) return true
  }
  return false
}

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get('u') || ''
  const path = storedInvoicePath(u)
  const orgId = path ? orgOfInvoicePath(path) : null
  if (!path || !orgId) return deny(400, 'رابط غير صالح')
  if (!(await allowed(req, orgId))) return deny(403, 'غير مصرح — الملف يفتح بس لأصحاب المنشأة بعد تسجيل الدخول')
  const db = sb()
  if (!(await isSubscriptionActive(db, orgId).catch(() => true))) return deny(403, 'اشتراك المنشأة متوقف حالياً')
  const { data, error } = await db.storage.from('invoices').createSignedUrl(path, 60)
  if (error || !data?.signedUrl) return deny(404, 'الملف غير موجود')
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'private, no-store' } })
}
