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
// لو انرسل الرابط لأحد برا ما يفتح. بعد التحقق نرجّع الملف نفسه (ما فيه رابط ثاني ينسخ).
// المتصفح (فتح الرابط مباشرة): صفحة رسمية توضح السبب — غير المتصفح: JSON
const PAGE = (title: string, body: string) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${title} — ستورلي</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f7f9;font-family:'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif;color:#111827;padding:20px;box-sizing:border-box}
.c{background:#fff;border:1px solid #e5e7eb;border-radius:18px;max-width:440px;width:100%;padding:32px 28px;text-align:center;box-shadow:0 10px 30px -18px rgba(15,23,42,.35)}
.i{width:56px;height:56px;border-radius:16px;background:#f0fdfa;color:#0f766e;display:grid;place-items:center;margin:0 auto 16px}
h1{font-size:20px;margin:0 0 10px}p{font-size:15px;line-height:1.9;color:#374151;margin:0 0 22px}
a{display:inline-block;background:#0f766e;color:#fff;text-decoration:none;font-weight:700;padding:12px 26px;border-radius:12px;font-size:15px}
.b{margin-top:22px;font-size:13px;color:#6b7280}</style></head><body><main class="c">
<div class="i"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
<h1>${title}</h1><p>${body}</p><a href="/login">تسجيل الدخول إلى ستورلي</a><div class="b">ستورلي — نظام إدارة المنشأة</div></main></body></html>`

const MESSAGES: Record<number, [string, string]> = {
  400: ['رابط غير صالح', 'تعذّر التعرف على هذا الرابط. يرجى فتح الفاتورة من داخل نظام ستورلي.'],
  403: ['هذا الرابط خاص', 'لا يمكن الاطلاع على هذا المستند عبر الرابط المباشر حفاظاً على خصوصية بيانات المنشأة. يمكن للمصرّح لهم عرض الفاتورة وتنزيلها من داخل نظام ستورلي بعد تسجيل الدخول.'],
  404: ['المستند غير متوفر', 'تعذّر العثور على هذا المستند. يرجى التحقق منه من داخل نظام ستورلي.'],
}

const deny = (req: Request, status: number, error: string) => {
  if ((req.headers.get('accept') || '').includes('text/html')) {
    const [t, b] = MESSAGES[status] || MESSAGES[403]
    return new NextResponse(PAGE(t, b), { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
  }
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
}

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
  if (!path || !orgId) return deny(req, 400, 'رابط غير صالح')
  if (!(await allowed(req, orgId))) return deny(req, 403, 'غير مصرح — يُفتح الملف لأصحاب المنشأة فقط بعد تسجيل الدخول')
  const db = sb()
  if (!(await isSubscriptionActive(db, orgId).catch(() => true))) return deny(req, 403, 'اشتراك المنشأة متوقف حالياً')
  // نرجّع الملف نفسه من رابطنا (بدون تحويل لرابط مؤقت) — عشان أي نسخة للرابط تمر بالتحقق دايماً
  const { data: blob, error } = await db.storage.from('invoices').download(path)
  if (error || !blob) return deny(req, 404, 'الملف غير موجود')
  return new NextResponse(blob.stream(), { status: 200, headers: {
    'Content-Type': blob.type || 'application/octet-stream',
    'Content-Length': String(blob.size),
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  } })
}
