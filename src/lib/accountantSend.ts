import { createHash, randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { loadAccountantReport } from '@/lib/accountantData'
import { buildAccountantWorkbook, type AccSection } from '@/lib/accountantExport'
import { accountantEmail, accountantWhatsapp } from '@/lib/accountantMessage'
import type { Period } from '@/lib/accountantSchedule'

export const REPORT_LINK_DAYS = 7
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex')
// رابط التقرير — الإنتاج على الدومين الرسمي، وغيره على التجربة
export const siteUrl = () => process.env.VERCEL_ENV === 'production' ? 'https://www.storely.dev' : 'https://staging.storely.dev'

export type AccountantLink = {
  id: string; org_id: string; branch_id: string | null; name: string; email: string | null; whatsapp: string | null
  channels: string[]; sections: AccSection[]; vat_registered: boolean
}

// يجمع التقرير ويرسله للمحاسب بالإيميل (مع الإكسل) والواتساب (ملخص + رابط)، ويسجّل النتيجة
export async function sendAccountantReport(db: SupabaseClient, link: AccountantLink, period: Period, opts: { isTest?: boolean } = {}) {
  const report = await loadAccountantReport(db, { orgId: link.org_id, branchId: link.branch_id, period, sections: link.sections, vatRegistered: link.vat_registered })
  const token = randomBytes(24).toString('base64url')
  const { data: row, error } = await db.from('accountant_reports').insert({
    org_id: link.org_id, link_id: link.id, period_start: period.start, period_end: period.end, token_hash: hashToken(token),
    expires_at: new Date(Date.now() + REPORT_LINK_DAYS * 86400e3).toISOString(), is_test: !!opts.isTest,
  } as any).select('id').single()
  if (error || !row) throw new Error('ACCOUNTANT_REPORT_INSERT_FAILED')
  const reportUrl = `${siteUrl()}/accountant/${token}`
  const msg = { accountantName: link.name, reportUrl, isTest: opts.isTest }

  let email_status: 'sent' | 'failed' | 'skipped' = 'skipped', whatsapp_status: 'sent' | 'failed' | 'skipped' = 'skipped'
  const errors: string[] = []

  if (link.channels.includes('email') && link.email) {
    try {
      const { data: owner } = await db.from('profiles').select('email').eq('org_id', link.org_id).eq('role', 'owner').maybeSingle()
      const { subject, html } = accountantEmail(report, msg)
      const xlsx = await buildAccountantWorkbook(report)
      const r = await sendEmail({
        to: link.email, subject, html, fromName: `${report.orgName} عبر Storely`, fromAddress: 'reports@storely.dev',
        replyTo: (owner as any)?.email || undefined,
        attachments: [{ filename: `تقرير ${report.orgName} - ${report.label}.xlsx`.replace(/[\\/:*?"<>|]/g, ''), content: xlsx }],
      })
      email_status = r.success ? 'sent' : 'failed'
      if (!r.success) errors.push('email: ' + (r as any).error)
    } catch (e: any) { email_status = 'failed'; errors.push('email: ' + (e?.message || 'error')) }
  }
  if (link.channels.includes('whatsapp') && link.whatsapp) {
    try {
      const r = await sendWhatsAppMessage(link.whatsapp, accountantWhatsapp(report, msg))
      whatsapp_status = r.ok ? 'sent' : 'failed'
      if (!r.ok) errors.push('whatsapp: ' + JSON.stringify(r.data).slice(0, 200))
    } catch (e: any) { whatsapp_status = 'failed'; errors.push('whatsapp: ' + (e?.message || 'error')) }
  }

  await db.from('accountant_reports').update({ email_status, whatsapp_status, error: errors.join(' | ').slice(0, 500) || null } as any).eq('id', (row as any).id)
  return { email_status, whatsapp_status, label: report.label }
}
