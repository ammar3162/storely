import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashToken } from '@/lib/accountantSend'
import { loadAccountantReport } from '@/lib/accountantData'
import { buildAccountantWorkbook, summarize } from '@/lib/accountantExport'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// تقرير المحاسب برابط آمن (بدون تسجيل دخول) — الرابط ينتهي بعد ٧ أيام
//   ?token=…            → بيانات التقرير
//   ?token=…&format=xlsx → ملف الإكسل
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token') || ''
    if (!/^[A-Za-z0-9_-]{30,64}$/.test(token)) return NextResponse.json({ error: 'الرابط غير صحيح' }, { status: 404 })
    const db = sb()
    const { data: rep } = await db.from('accountant_reports').select('id,org_id,link_id,period_start,period_end,expires_at,opened_at').eq('token_hash', hashToken(token)).maybeSingle()
    if (!rep) return NextResponse.json({ error: 'الرابط غير صحيح' }, { status: 404 })
    if (Date.parse((rep as any).expires_at) < Date.now()) return NextResponse.json({ error: 'انتهت صلاحية الرابط — اطلب من المنشأة ترسل التقرير من جديد', expired: true }, { status: 410 })
    const { data: link } = await db.from('accountant_links').select('branch_id,sections,vat_registered,is_active').eq('id', (rep as any).link_id).maybeSingle()
    // المالك شال الربط = الرابط يوقف
    if (!link) return NextResponse.json({ error: 'أوقفت المنشأة الربط مع المحاسب' }, { status: 410 })

    const report = await loadAccountantReport(db, { orgId: (rep as any).org_id, branchId: (link as any).branch_id,
      period: { start: (rep as any).period_start, end: (rep as any).period_end }, sections: (link as any).sections, vatRegistered: (link as any).vat_registered })
    if (!(rep as any).opened_at && searchParams.get('src') !== 'wa') await db.from('accountant_reports').update({ opened_at: new Date().toISOString() } as any).eq('id', (rep as any).id)

    const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' }
    if (searchParams.get('format') === 'xlsx') {
      const buf = await buildAccountantWorkbook(report)
      const name = `تقرير ${report.orgName} - ${report.label}.xlsx`.replace(/[\\/:*?"<>|]/g, '')
      return new NextResponse(new Uint8Array(buf), { headers: { ...headers,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="report.xlsx"; filename*=UTF-8''${encodeURIComponent(name)}` } })
    }
    return NextResponse.json({ success: true, report, totals: summarize(report) }, { headers })
  } catch {
    return NextResponse.json({ error: 'تعذر فتح التقرير، حاول مرة ثانية' }, { status: 500 })
  }
}
