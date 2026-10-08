import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentAccountant, accessExpired } from '@/lib/accountantPortalAuth'
import { loadAccountantReport } from '@/lib/accountantData'
import { summarize, buildClientsWorkbook, type AccSection } from '@/lib/accountantExport'
import { customPeriod, saudiToday, periodLabel } from '@/lib/accountantSchedule'
import { isSubscriptionActive } from '@/lib/subscription'
import { mapLimit } from '@/lib/mapLimit'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const LIGHT: AccSection[] = ['sales', 'purchases', 'vat', 'payables']   // ملخص البطاقات (بدون الرواتب — ثقيلة)

// عملاء المحاسب: كل منشأة أعطته إذن + ملخص الفترة
export async function GET(req: Request) {
  try {
    const db = sb()
    const me = await currentAccountant(db, req)
    if (!me) return NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const today = saudiToday()
    const p = customPeriod(searchParams.get('from') || `${today.slice(0, 8)}01`, searchParams.get('to') || today, today)
    if (typeof p === 'string') return NextResponse.json({ error: p }, { status: 400 })

    const { data: rows } = await db.from('accountant_access').select('org_id,branch_id,sections,vat_registered,last_view_at,expires_on,organizations(name,logo_url),branches(name)')
      .eq('accountant_id', me.id).eq('status', 'active')
    const { data: reqs } = await db.from('accountant_requests').select('org_id,status').eq('accountant_id', me.id).neq('status', 'resolved')
    const reqCount = (orgId: string, st: string) => ((reqs || []) as any[]).filter(r => r.org_id === orgId && r.status === st).length
    const clients = await mapLimit((rows || []) as any[], 4, async a => {
      const base = { org_id: a.org_id, name: a.organizations?.name || '—', logo_url: a.organizations?.logo_url || null, branch: a.branches?.name || null, sections: a.sections, expires_on: a.expires_on || null,
        requests: { open: reqCount(a.org_id, 'open'), answered: reqCount(a.org_id, 'answered') } }
      if (accessExpired(a.expires_on)) return { ...base, expired: true }
      if (!(await isSubscriptionActive(db, a.org_id))) return { ...base, inactive: true }
      const sections = LIGHT.filter(s => a.sections.includes(s))
      if (!sections.length) return { ...base, totals: null }
      const t = summarize(await loadAccountantReport(db, { orgId: a.org_id, branchId: a.branch_id, period: p, sections, vatRegistered: a.vat_registered }))
      const has = (s: string) => sections.includes(s as AccSection)
      return { ...base, totals: {
        sales: has('sales') ? t.sales : null, purchases: has('purchases') ? t.purTotal : null,
        vatNet: has('vat') && a.vat_registered ? t.vatNet : null, payables: has('payables') ? t.payablesTotal : null,
        taxInvoices: t.taxInvoices, incomplete: t.taxInvoices - t.taxComplete, mismatch: t.taxMismatch,
      } }
    })
    if (searchParams.get('format') === 'xlsx') {
      const label = periodLabel(p)
      const stamp = `نسخة ${me.name || me.email} · ${new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ')}`
      const buf = await buildClientsWorkbook((clients as any[]).map(c => ({ name: c.name, branch: c.branch, sales: c.totals?.sales ?? null, purchases: c.totals?.purchases ?? null,
        vatNet: c.totals?.vatNet ?? null, payables: c.totals?.payables ?? null, taxInvoices: c.totals?.taxInvoices || 0, incomplete: c.totals?.incomplete || 0, mismatch: c.totals?.mismatch || 0,
        note: c.expired ? 'انتهى الإذن' : c.inactive ? 'اشتراك المنشأة متوقف' : '' })), label, stamp)
      return new NextResponse(new Uint8Array(buf), { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="clients.xlsx"; filename*=UTF-8''${encodeURIComponent(`ملخص العملاء - ${label}.xlsx`)}` } })
    }
    return NextResponse.json({ success: true, accountant: me, period: p, clients })
  } catch {
    return NextResponse.json({ error: 'تعذر تحميل العملاء، حاول مرة ثانية' }, { status: 500 })
  }
}
