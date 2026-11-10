import type { SupabaseClient } from '@supabase/supabase-js'
import { accessExpired } from '@/lib/accountantPortalAuth'
import { loadAccountantReport } from '@/lib/accountantData'
import { summarize, type AccSection } from '@/lib/accountantExport'
import { closedMonths, monthName } from '@/lib/periodLock'
import { isSubscriptionActive } from '@/lib/subscription'
import { brandEmail } from '@/lib/emailTemplates'
import { sendEmail } from '@/lib/email'
import { siteUrl } from '@/lib/accountantSend'
import { mapLimit } from '@/lib/mapLimit'

// الملخص الأسبوعي للمحاسب (الأحد ٨ الصبح): لكل عميل وش ناقص في الشهر الماضي، والردود الجديدة، وهل الشهر مقفل
// ينرسل مرة بالأسبوع لكل محاسب — digest_week يمنع التكرار

const LIGHT: AccSection[] = ['purchases', 'vat']
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/** بداية الأسبوع (الأحد) بتوقيت السعودية */
export function digestWeek(now = Date.now()) {
  const t = new Date(now + 3 * 3600e3)
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() - t.getUTCDay())).toISOString().slice(0, 10)
}
/** الأحد الساعة ٨ صباحاً بتوقيت السعودية */
export const isDigestHour = (now = Date.now()) => { const t = new Date(now + 3 * 3600e3); return t.getUTCDay() === 0 && t.getUTCHours() === 8 }

export type DigestRow = { name: string; missing: number; mismatch: number; answered: number; open: number; locked: boolean }

/** نص الإيميل — منفصل عشان ينختبر */
export function digestEmail(o: { name?: string | null; month: string; rows: DigestRow[]; url: string }) {
  const need = o.rows.filter(r => r.missing || r.mismatch || r.answered)
  const unlocked = o.rows.filter(r => !r.locked).length
  const line = (r: DigestRow) => {
    const parts = [r.missing && `${r.missing} فاتورة ناقصة`, r.mismatch && `${r.mismatch} بمبلغ مختلف`, r.answered && `${r.answered} رد جديد`, r.open && `${r.open} طلب بانتظار الرد`].filter(Boolean)
    return `<tr><td style="padding:10px 12px;border-bottom:1px solid #E4E7EC;font-weight:600">${esc(r.name)}</td>`
      + `<td style="padding:10px 12px;border-bottom:1px solid #E4E7EC;color:${parts.length ? '#B42318' : '#067647'}">${parts.length ? parts.join(' · ') : 'مكتملة'}</td>`
      + `<td style="padding:10px 12px;border-bottom:1px solid #E4E7EC;color:${r.locked ? '#067647' : '#475467'};white-space:nowrap">${r.locked ? 'مقفل' : 'مفتوح'}</td></tr>`
  }
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:8px 0 4px;border:1px solid #E4E7EC;border-radius:10px">`
    + `<tr style="background:#F6F8F9;color:#475467;font-size:12px"><td style="padding:8px 12px">المنشأة</td><td style="padding:8px 12px">${esc(o.month)}</td><td style="padding:8px 12px">الإقفال</td></tr>`
    + o.rows.map(line).join('') + `</table>`
  return {
    subject: need.length ? `ملخص الأسبوع: ${need.length === 1 ? 'منشأة تحتاج' : `${need.length} منشآت تحتاج`} إجراء` : 'ملخص الأسبوع: عملاؤك مكتملون',
    html: brandEmail({
      title: 'ملخص عملائك هذا الأسبوع',
      preheader: need.length ? `${need.length} من ${o.rows.length} منشآت تحتاج إجراء في ${o.month}` : `كل عملائك مكتملون في ${o.month}`,
      greeting: o.name ? `مرحباً ${o.name}،` : 'مرحباً،',
      paragraphs: [need.length ? `هذه حالة عملائك في ${o.month}. المنشآت التي فيها نواقص أو ردود جديدة تحتاج مراجعتك.` : `جميع فواتير عملائك في ${o.month} مكتملة.`,
        ...(unlocked ? [`${unlocked === 1 ? 'منشأة واحدة لم يُقفل' : `${unlocked} منشآت لم يُقفل`} شهرها بعد.`] : [])],
      rawSections: table,
      button: { label: 'افتح بوابة المحاسب', rawUrl: o.url },
      small: 'يصلك هذا الملخص كل أحد. يمكنك إيقافه من صفحة «حسابي» في البوابة.',
    }),
  }
}

/** يجهّز ويرسل ملخص محاسب واحد — يرجع false لو ما عنده عملاء نشطين */
export async function sendDigest(db: SupabaseClient, acc: { id: string; email: string; name: string | null }) {
  const month = closedMonths(1)[0]
  const end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10)
  const { data: access } = await db.from('accountant_access').select('org_id,branch_id,sections,vat_registered,expires_on,organizations(name)').eq('accountant_id', acc.id).eq('status', 'active')
  const live = ((access || []) as any[]).filter(a => !accessExpired(a.expires_on))
  if (!live.length) return false
  const ids = live.map(a => a.org_id)
  const [{ data: reqs }, { data: locks }] = await Promise.all([
    db.from('accountant_requests').select('org_id,status').eq('accountant_id', acc.id).neq('status', 'resolved'),
    db.from('period_locks').select('org_id').eq('month', month).in('org_id', ids),
  ])
  const lockedSet = new Set(((locks || []) as any[]).map(l => l.org_id))
  const rows = (await mapLimit(live, 3, async a => {
    if (!(await isSubscriptionActive(db, a.org_id))) return null
    const sections = LIGHT.filter(s => (a.sections || []).includes(s))
    let missing = 0, mismatch = 0
    if (sections.length && a.vat_registered) {
      const t = summarize(await loadAccountantReport(db, { orgId: a.org_id, branchId: a.branch_id, period: { start: month, end }, sections, vatRegistered: a.vat_registered }))
      missing = t.taxInvoices - t.taxComplete; mismatch = t.taxMismatch
    }
    const rq = ((reqs || []) as any[]).filter(r => r.org_id === a.org_id)
    return { name: a.organizations?.name || '—', missing, mismatch, answered: rq.filter(r => r.status === 'answered').length, open: rq.filter(r => r.status === 'open').length, locked: lockedSet.has(a.org_id) } as DigestRow
  })).filter(Boolean) as DigestRow[]
  if (!rows.length) return false
  rows.sort((x, y) => (y.missing + y.mismatch + y.answered) - (x.missing + x.mismatch + x.answered))
  const { subject, html } = digestEmail({ name: acc.name, month: monthName(month), rows, url: `${siteUrl()}/accountant-portal` })
  await sendEmail({ to: acc.email, subject, html })
  return true
}

/** من مهمة الساعة: الأحد ٨ الصبح — كل محاسب مرة وحدة بالأسبوع */
export async function runDigests(db: SupabaseClient, now = Date.now()) {
  if (!isDigestHour(now)) return { sent: 0 }
  const week = digestWeek(now)
  const { data: accs } = await db.from('accountant_users').select('id,email,name').eq('digest_opt_out', false).or(`digest_week.is.null,digest_week.lt.${week}`)
  let sent = 0
  for (const a of (accs || []) as any[]) {
    // نعلّم الأسبوع قبل الإرسال — لو اشتغلت المهمة مرتين ما يتكرر
    const { data: claimed } = await db.from('accountant_users').update({ digest_week: week } as any).eq('id', a.id).or(`digest_week.is.null,digest_week.lt.${week}`).select('id')
    if (!claimed?.length) continue
    try { if (await sendDigest(db, a)) sent++ } catch (e) { console.error('ACCOUNTANT_DIGEST_FAILED', a.id, e) }
  }
  return { sent }
}
