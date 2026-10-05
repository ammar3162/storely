import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentAccountant } from '@/lib/accountantPortalAuth'
import { loadAccountantReport } from '@/lib/accountantData'
import { summarize, type AccSection } from '@/lib/accountantExport'
import { customPeriod, saudiToday } from '@/lib/accountantSchedule'
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

    const { data: rows } = await db.from('accountant_access').select('org_id,branch_id,sections,vat_registered,last_view_at,organizations(name),branches(name)')
      .eq('accountant_id', me.id).eq('status', 'active')
    const clients = await mapLimit((rows || []) as any[], 4, async a => {
      const base = { org_id: a.org_id, name: a.organizations?.name || '—', branch: a.branches?.name || null, sections: a.sections }
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
    return NextResponse.json({ success: true, accountant: me, period: p, clients })
  } catch {
    return NextResponse.json({ error: 'تعذر تحميل العملاء، حاول مرة ثانية' }, { status: 500 })
  }
}
