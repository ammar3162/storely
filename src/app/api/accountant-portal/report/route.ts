import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentAccountant, accessFor } from '@/lib/accountantPortalAuth'
import { loadAccountantReport } from '@/lib/accountantData'
import { buildAccountantWorkbook, summarize } from '@/lib/accountantExport'
import { customPeriod, saudiToday } from '@/lib/accountantSchedule'
import { isSubscriptionActive } from '@/lib/subscription'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// تقرير منشأة للمحاسب (قراءة فقط) — بس الأقسام والفرع اللي سمح فيها المالك
export async function GET(req: Request) {
  try {
    const db = sb()
    const me = await currentAccountant(db, req)
    if (!me) return NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const access = await accessFor(db, me.id, searchParams.get('org_id') || '')
    if (!access) return NextResponse.json({ error: 'ما عندك صلاحية على هالمنشأة' }, { status: 403 })
    if (!(await isSubscriptionActive(db, access.org_id))) return NextResponse.json({ error: 'اشتراك المنشأة متوقف حالياً' }, { status: 403 })
    const today = saudiToday()
    const p = customPeriod(searchParams.get('from') || `${today.slice(0, 8)}01`, searchParams.get('to') || today, today)
    if (typeof p === 'string') return NextResponse.json({ error: p }, { status: 400 })

    const report = await loadAccountantReport(db, { orgId: access.org_id, branchId: access.branch_id, period: p, sections: access.sections, vatRegistered: access.vat_registered })
    const xlsx = searchParams.get('format') === 'xlsx'
    await Promise.all([
      db.from('accountant_access').update({ last_view_at: new Date().toISOString() } as any).eq('id', access.id),
      db.from('accountant_view_logs').insert({ org_id: access.org_id, accountant_id: me.id, action: xlsx ? 'download' : 'view', period_start: p.start, period_end: p.end } as any),
    ])
    const headers = { 'Cache-Control': 'no-store' }
    if (xlsx) {
      const name = `تقرير ${report.orgName} - ${report.label}.xlsx`.replace(/[\\/:*?"<>|]/g, '')
      return new NextResponse(new Uint8Array(await buildAccountantWorkbook(report)), { headers: { ...headers,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="report.xlsx"; filename*=UTF-8''${encodeURIComponent(name)}` } })
    }
    return NextResponse.json({ success: true, report, totals: summarize(report) }, { headers })
  } catch {
    return NextResponse.json({ error: 'تعذر تحميل التقرير، حاول مرة ثانية' }, { status: 500 })
  }
}
