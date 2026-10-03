'use client'
import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import PageIcon from '@/components/PageIcon'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'
import { currencySymbol } from '@/lib/currencySymbol'
import { colors, font, card, btnSecondary, inp, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'

async function pdfOrgInfo() {
  const me = await getMe()
  const bid = sessionStorage.getItem('s_branch_id')
  const branchName = bid ? me?.branches.find(b => b.id === bid)?.name : null
  return { org: me?.org ? { name: me.org.name } : null, branchRow: branchName ? { name: branchName } : null }
}

// ═══ تقرير الموظف الشهري — نفس أرقام كشف راتب الموظف ═══
const smMonthNow = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 7)
const smMonthLabel = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric', calendar: 'gregory', numberingSystem: 'latn', timeZone: 'UTC' })
const smDay = (d: string | null) => d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'short', calendar: 'gregory', numberingSystem: 'latn', timeZone: 'UTC' }) : '—'
const smNum = (n: number) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
const smDur = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h}س ${m}د` : h ? `${h} ساعة` : `${m} دقيقة` }

export default function StaffMonthlyDetail({ onBack }: { onBack: () => void }) {
  const [month, setMonth] = useState(smMonthNow())
  const [staffId, setStaffId] = useState('')
  const [all, setAll] = useState<{ rows: any[]; totals: any } | null>(null)
  const [one, setOne] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [curr, setCurr] = useState('ر.س')
  useEffect(() => { getMe().then(me => { if (me?.org?.currency) setCurr(currencySymbol(me.org.currency)) }) }, [])

  useEffect(() => {
    let alive = true
    async function load() {
      const orgId = sessionStorage.getItem('s_org_id')
      if (!orgId) return
      setLoading(true); setError('')
      const bid = sessionStorage.getItem('s_branch_id')
      const [a, o] = await Promise.all([
        api.get('/api/staff-monthly-report', { org_id: orgId, month, branch_id: bid }),
        staffId ? api.get('/api/staff-monthly-report', { org_id: orgId, month, branch_id: bid, staff_id: staffId }) : Promise.resolve(null),
      ])
      if (!alive) return
      if (!a.success) { setError(a.error || 'تعذر تحميل التقرير'); setAll(null); setOne(null) }
      else { setAll({ rows: a.rows || [], totals: a.totals || {} }); setOne(o?.success ? (o.rows?.[0] || null) : null) }
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [month, staffId])

  const shiftMonth = (by: number) => { const [y, m] = month.split('-').map(Number); setMonth(new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7)) }
  const isCurrent = month === smMonthNow()

  async function exportPdf() {
    if (!all) return
    setExporting(true)
    try {
      const { exportReportPdf } = await import('@/lib/pdfExport')
      const { org, branchRow } = await pdfOrgInfo()
      const orgName = ((org as any)?.name || 'Storely') + ((branchRow as any)?.name ? ' — فرع ' + (branchRow as any).name : '')
      const money = (n: number) => `${smNum(n)} ${curr}`
      if (one) {
        const sec = { earning: 'المستحقات', deduction: 'الخصومات', pending: 'بانتظار القرار (ما انخصم)' } as Record<string, string>
        await exportReportPdf({
          title: `التقرير الشهري — ${one.name}`, subtitle: smMonthLabel(month), orgName, logoUrl: '/storely-logo.png',
          columns: [
            { header: 'القسم', key: 'section' }, { header: 'البند', key: 'label' }, { header: 'التاريخ', key: 'date' },
            { header: 'التفاصيل', key: 'detail' }, { header: 'المبلغ', key: 'amount', align: 'left' },
          ],
          rows: one.ledger.map((r: any) => ({ section: sec[r.section], label: r.label, date: r.date ? smDay(r.date) : '—', detail: r.detail || '—', amount: `${r.section === 'deduction' ? '−' : r.section === 'earning' ? '+' : ''}${money(r.amount)}` })),
          summaryStats: [
            { label: 'المستحقات', value: money(one.gross + one.overtime_pay + (one.bonus_total || 0)), color: '#047857' },
            { label: 'الخصومات والسلف', value: money(one.late_total + one.deductions_total + one.advances_total), color: '#dc2626' },
            { label: 'صافي الراتب', value: money(one.net), color: '#0f766e' },
          ],
          totalsRow: { section: 'صافي الراتب', label: '', date: '', detail: `${one.days_present} يوم حضور · ${one.late_count} تأخير`, amount: money(one.net) },
          fileName: `التقرير-الشهري-${one.name}-${month}.pdf`,
        })
      } else {
        await exportReportPdf({
          title: 'تقرير الموظفين الشهري', subtitle: smMonthLabel(month), orgName, logoUrl: '/storely-logo.png',
          columns: [
            { header: 'الموظف', key: 'name' }, { header: 'الراتب', key: 'gross', align: 'left' }, { header: 'أوفر تايم', key: 'ot', align: 'left' },
            { header: 'غرامات التأخير', key: 'late', align: 'left' }, { header: 'خصومات', key: 'ded', align: 'left' }, { header: 'سلف', key: 'adv', align: 'left' },
            { header: 'الصافي', key: 'net', align: 'left' },
          ],
          rows: all.rows.map(r => ({ name: r.name, gross: smNum(r.gross), ot: r.overtime_pay ? `+${smNum(r.overtime_pay)}` : '—', late: r.late_total ? `−${smNum(r.late_total)}` : '—', ded: r.deductions_total ? `−${smNum(r.deductions_total)}` : '—', adv: r.advances_total ? `−${smNum(r.advances_total)}` : '—', net: smNum(r.net) })),
          summaryStats: [
            { label: 'إجمالي الصافي', value: money(all.totals.net), color: '#0f766e' },
            { label: 'الأوفر تايم', value: money(all.totals.overtime_pay), color: '#047857' },
            { label: 'الخصومات والسلف', value: money(all.totals.late_total + all.totals.deductions_total + all.totals.advances_total), color: '#dc2626' },
          ],
          totalsRow: { name: 'الإجمالي', gross: smNum(all.totals.gross), ot: smNum(all.totals.overtime_pay), late: smNum(all.totals.late_total), ded: smNum(all.totals.deductions_total), adv: smNum(all.totals.advances_total), net: smNum(all.totals.net) },
          fileName: `تقرير-الموظفين-الشهري-${month}.pdf`,
        })
      }
    } catch { toast('تعذر تصدير التقرير', 'error') }
    setExporting(false)
  }

  const th: React.CSSProperties = { padding: '11px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: colors.text3, whiteSpace: 'nowrap', background: colors.bg }
  const td: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: colors.text2, whiteSpace: 'nowrap' }
  const label: React.CSSProperties = { fontSize: 11, color: colors.text3, fontWeight: 600, display: 'block', marginBottom: 5 }
  const stat = (title: string, value: string, c: string, bg: string, sub?: string) => (
    <div style={{ ...card, padding: '14px 16px', background: bg, border: `1px solid ${colors.border}` }}>
      <div style={{ fontSize: 11, color: colors.text3, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: c, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: colors.text4, marginTop: 2 }}>{sub}</div>}
    </div>
  )
  const money = (n: number, sign?: '+' | '−', color?: string) => <span dir="ltr" style={{ fontWeight: 700, color: color || colors.text, fontVariantNumeric: 'tabular-nums' as const }}>{sign || ''}{smNum(n)} <span style={{ fontSize: 10.5, color: colors.text4, fontWeight: 600 }}>{curr}</span></span>
  const section = (title: string, rows: any[], sign: '+' | '−' | '', color: string, total: number, totalLabel: string) => rows.length === 0 ? null : (
    <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '12px 16px', fontWeight: 800, fontSize: 13.5, color: colors.text, borderBottom: `1px solid ${colors.border}` }}>{title}</div>
      <div style={{ overflowX: 'auto' as const }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          <thead><tr>{['البند', 'التاريخ', 'التفاصيل', 'المبلغ'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${colors.border}` }}>
                <td style={{ ...td, fontWeight: 700, color: colors.text }}>{r.label}</td>
                <td style={td}>{smDay(r.date)}</td>
                <td style={{ ...td, whiteSpace: 'normal' as const, minWidth: 160, color: r.detail ? colors.text2 : colors.text4 }}>{r.detail || '—'}</td>
                <td style={td}>{money(r.amount, sign || undefined, color)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `1.5px solid ${colors.border2}`, background: colors.bg }}>
              <td style={{ ...td, fontWeight: 800, color: colors.text }} colSpan={3}>{totalLabel}</td>
              <td style={td}>{money(total, sign || undefined, color)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )

  const t = all?.totals
  return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 1000, margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: colors.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>→ رجوع</button>
      <h1 style={pageTitle}><PageIcon />تقرير الموظف الشهري</h1>
      <p style={pageSub}>الراتب والأوفر تايم وغرامات التأخير والخصومات والسلف — بنفس أرقام كشف راتب الموظف</p>

      <div style={{ ...card, padding: 14, marginTop: 16, marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={label}>الشهر</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => shiftMonth(-1)} aria-label="الشهر السابق" style={{ ...btnSecondary, padding: '9px 12px' }}>›</button>
            <div style={{ flex: 1, textAlign: 'center' as const, fontWeight: 800, fontSize: 14, color: colors.text }}>{smMonthLabel(month)}</div>
            <button onClick={() => shiftMonth(1)} disabled={isCurrent} aria-label="الشهر التالي" style={{ ...btnSecondary, padding: '9px 12px', opacity: isCurrent ? .4 : 1 }}>‹</button>
          </div>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={label}>الموظف</label>
          <select value={staffId} onChange={e => setStaffId(e.target.value)} style={inp()}>
            <option value="">كل الموظفين</option>
            {(all?.rows || []).map(r => <option key={r.staff_id} value={r.staff_id}>{r.name}</option>)}
          </select>
        </div>
        <button onClick={exportPdf} disabled={exporting || loading || !all?.rows.length} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px' }}>
          <Download size={15} />{exporting ? 'جاري التصدير...' : 'تصدير PDF'}
        </button>
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: 'center' as const, padding: 48, color: colors.text4, fontSize: 13 }}>جاري التحميل...</div>
      ) : error ? (
        <div style={{ ...card, textAlign: 'center' as const, padding: 40, color: colors.text3, fontSize: 13.5, fontWeight: 600 }}>{error}</div>
      ) : one ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 14 }}>
            {stat('صافي الراتب', `${smNum(one.net)} ${curr}`, colors.primary, colors.primaryLight, isCurrent ? 'حتى الآن' : undefined)}
            {stat('المستحقات', `${smNum(one.gross + one.overtime_pay + (one.bonus_total || 0))} ${curr}`, '#047857', '#ecfdf5', one.overtime_minutes ? `منها أوفر تايم ${smDur(one.overtime_minutes)}` : undefined)}
            {stat('الخصومات والسلف', `${smNum(one.late_total + one.deductions_total + one.advances_total)} ${curr}`, colors.danger, colors.dangerLight, one.late_count ? `${one.late_count} تأخير` : undefined)}
            {stat('الحضور', `${one.days_present} يوم`, colors.text, colors.surface, [one.extra_days ? `منها ${one.extra_days} يوم إضافي` : '', one.late_minutes ? `تأخير ${smDur(one.late_minutes)}` : 'بدون تأخير'].filter(Boolean).join(' · '))}
          </div>
          {section('المستحقات', one.ledger.filter((r: any) => r.section === 'earning'), '+', '#047857', one.gross + one.overtime_pay + (one.bonus_total || 0), 'إجمالي المستحقات')}
          {one.ledger.some((r: any) => r.section === 'deduction')
            ? section('الخصومات والسلف', one.ledger.filter((r: any) => r.section === 'deduction'), '−', colors.danger, one.late_total + one.deductions_total + one.advances_total, 'إجمالي الخصومات والسلف')
            : <div style={{ ...card, padding: '16px', marginBottom: 12, textAlign: 'center' as const, fontSize: 13, color: colors.text3, fontWeight: 600 }}>ما عليه أي خصومات أو سلف هذا الشهر</div>}
          {section('بانتظار القرار — ما انخصم', one.ledger.filter((r: any) => r.section === 'pending'), '', colors.warning, one.pending_total, 'الإجمالي')}
          <div style={{ ...card, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.primaryLight, border: `1px solid ${colors.primaryBorder}` }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: colors.text }}>صافي الراتب</div>
            <div style={{ fontSize: 17 }}>{money(one.net, undefined, colors.primary)}</div>
          </div>
        </>
      ) : !all?.rows.length ? (
        <div style={{ ...card, textAlign: 'center' as const, padding: 48, color: colors.text4, fontSize: 13 }}>ما فيه موظفين نشطين</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 14 }}>
            {stat('إجمالي صافي الرواتب', `${smNum(t.net)} ${curr}`, colors.primary, colors.primaryLight, `${all.rows.length} موظف`)}
            {stat('الأوفر تايم', `${smNum(t.overtime_pay)} ${curr}`, '#047857', '#ecfdf5')}
            {stat('غرامات التأخير', `${smNum(t.late_total)} ${curr}`, colors.warning, colors.warningLight)}
            {stat('الخصومات والسلف', `${smNum(t.deductions_total + t.advances_total)} ${curr}`, colors.danger, colors.dangerLight, t.pending_total ? `${smNum(t.pending_total)} بانتظار القرار` : undefined)}
          </div>
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' as const }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                <thead><tr>{['الموظف', 'الراتب', 'أوفر تايم', 'غرامات التأخير', 'خصومات', 'سلف', 'الصافي', ''].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {all.rows.map(r => (
                    <tr key={r.staff_id} onClick={() => setStaffId(r.staff_id)} style={{ borderTop: `1px solid ${colors.border}`, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = colors.bg)} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ ...td, fontWeight: 700, color: colors.text }}>{r.name}</td>
                      <td style={td}>{money(r.gross)}</td>
                      <td style={td}>{r.overtime_pay ? money(r.overtime_pay, '+', '#047857') : <span style={{ color: colors.text4 }}>—</span>}</td>
                      <td style={td}>{r.late_total ? <>{money(r.late_total, '−', colors.warning)} <span style={{ fontSize: 11, color: colors.text4 }}>({r.late_count})</span></> : <span style={{ color: colors.text4 }}>—</span>}</td>
                      <td style={td}>{r.deductions_total ? money(r.deductions_total, '−', colors.danger) : <span style={{ color: colors.text4 }}>—</span>}</td>
                      <td style={td}>{r.advances_total ? money(r.advances_total, '−', colors.danger) : <span style={{ color: colors.text4 }}>—</span>}</td>
                      <td style={td}>{money(r.net, undefined, colors.primary)}</td>
                      <td style={{ ...td, color: colors.primary, fontSize: 12, fontWeight: 700 }}>التفاصيل ←</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: `1.5px solid ${colors.border2}`, background: colors.bg }}>
                    <td style={{ ...td, fontWeight: 900, color: colors.text }}>الإجمالي</td>
                    <td style={td}>{money(t.gross)}</td>
                    <td style={td}>{money(t.overtime_pay, '+', '#047857')}</td>
                    <td style={td}>{money(t.late_total, '−', colors.warning)}</td>
                    <td style={td}>{money(t.deductions_total, '−', colors.danger)}</td>
                    <td style={td}>{money(t.advances_total, '−', colors.danger)}</td>
                    <td style={td}>{money(t.net, undefined, colors.primary)}</td>
                    <td style={td} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

