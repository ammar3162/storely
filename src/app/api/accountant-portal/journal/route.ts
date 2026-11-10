import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentAccountant, accessFor } from '@/lib/accountantPortalAuth'
import { loadAccountantReport } from '@/lib/accountantData'
import { customPeriod, saudiToday, periodLabel } from '@/lib/accountantSchedule'
import { isSubscriptionActive } from '@/lib/subscription'
import { buildJournal, cleanMap, journalCsv } from '@/lib/journalExport'
import { buildJournalWorkbook } from '@/lib/journalWorkbook'
import type { AccSection } from '@/lib/accountantExport'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const JOURNAL_SECTIONS: AccSection[] = ['sales', 'purchases', 'expenses', 'cash_diff']

async function guard(req: Request, orgId: unknown) {
  const db = sb()
  const me = await currentAccountant(db, req)
  if (!me) return { error: NextResponse.json({ error: 'سجّل الدخول' }, { status: 401 }) }
  const access = await accessFor(db, me.id, String(orgId || ''))
  if (!access) return { error: NextResponse.json({ error: 'ليست لديك صلاحية على هذه المنشأة' }, { status: 403 }) }
  if (!(await isSubscriptionActive(db, access.org_id))) return { error: NextResponse.json({ error: 'اشتراك المنشأة متوقف حالياً' }, { status: 403 }) }
  return { db, me, access }
}

// GET ?org_id → دليل الحسابات المحفوظ؛ ?org_id&from&to&format=xlsx|csv → ملف القيود
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const g = await guard(req, searchParams.get('org_id')); if (g.error) return g.error
    const { db, me, access } = g
    const { data: saved } = await db.from('accountant_account_maps').select('map').eq('org_id', access.org_id).eq('accountant_id', me.id).maybeSingle()
    const map = cleanMap((saved as any)?.map)
    const format = searchParams.get('format')
    if (format !== 'xlsx' && format !== 'csv') return NextResponse.json({ success: true, map, saved: !!saved }, { headers: { 'Cache-Control': 'no-store' } })

    const sections = JOURNAL_SECTIONS.filter(s => (access.sections || []).includes(s))
    if (!sections.length) return NextResponse.json({ error: 'لا تشمل صلاحياتك المبيعات أو المشتريات' }, { status: 403 })
    const today = saudiToday()
    const p = customPeriod(searchParams.get('from') || `${today.slice(0, 8)}01`, searchParams.get('to') || today, today)
    if (typeof p === 'string') return NextResponse.json({ error: p }, { status: 400 })
    const report = await loadAccountantReport(db, { orgId: access.org_id, branchId: access.branch_id, period: p, sections, vatRegistered: access.vat_registered })
    const lines = buildJournal(report, map)
    await db.from('accountant_view_logs').insert({ org_id: access.org_id, accountant_id: me.id, action: 'download', period_start: p.start, period_end: p.end } as any)
    const name = `قيود ${report.orgName} - ${periodLabel(p)}`.replace(/[\\/:*?"<>|]/g, '')
    const headers = { 'Cache-Control': 'no-store' }
    if (format === 'csv') return new NextResponse(journalCsv(lines), { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="journal.csv"; filename*=UTF-8''${encodeURIComponent(name + '.csv')}` } })
    const buf = await buildJournalWorkbook(lines, { title: name, map })
    return new NextResponse(new Uint8Array(buf), { headers: { ...headers, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="journal.xlsx"; filename*=UTF-8''${encodeURIComponent(name + '.xlsx')}` } })
  } catch {
    return NextResponse.json({ error: 'تعذر تجهيز القيود، حاول مرة أخرى' }, { status: 500 })
  }
}

// POST { org_id, map } → يحفظ دليل الحسابات لهذا العميل
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}))
    const g = await guard(req, b.org_id); if (g.error) return g.error
    const map = cleanMap(b.map)
    const { error } = await g.db.from('accountant_account_maps').upsert({ org_id: g.access.org_id, accountant_id: g.me.id, map, updated_at: new Date().toISOString() } as any)
    if (error) return NextResponse.json({ error: 'تعذر الحفظ' }, { status: 500 })
    return NextResponse.json({ success: true, map })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
