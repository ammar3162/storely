'use client'
import { useState, useEffect } from 'react'
import PageIcon from '@/components/PageIcon'
import { Download } from 'lucide-react'
import { api } from '@/lib/api-client'
import { colors, font, card, btnSecondary, inp, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'
import { ListSkeleton } from '@/components/PageSkeleton'
import { pdfOrgInfo } from './shared'

// تقرير الحضور — نفس بيانات صفحة الحضور والانصراف (/api/attendance-report) عشان الأرقام تطابق
const saudiToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)
const attTime = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString('ar-SA', { numberingSystem: 'latn', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh' }) : '—'
const attDay = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('ar-SA', { numberingSystem: 'latn', weekday: 'short', day: 'numeric', month: 'short', calendar: 'gregory', timeZone: 'UTC' })
const attMin = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}س ${r}د` : `${h} ساعة`) : `${r} دقيقة` }

export default function AttendanceDetail({ onBack }: { onBack:()=>void }) {
  const [summary, setSummary] = useState<any[]>([])      // ملخص كل الموظفين
  const [person, setPerson] = useState<any|null>(null)   // سجل موظف واحد يوم بيوم
  const [totalDays, setTotalDays] = useState(0)
  const [loading, setLoading] = useState(true)
  const [staffId, setStaffId] = useState('')
  const [dFrom, setDFrom] = useState(() => saudiToday().slice(0, 8) + '01')
  const [dTo, setDTo] = useState(() => saudiToday())
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      const orgId = sessionStorage.getItem('s_org_id')
      if (!orgId || dFrom > dTo) { setLoading(false); return }
      setLoading(true)
      const bid = sessionStorage.getItem('s_branch_id')
      const [all, one] = await Promise.all([
        api.get('/api/attendance-report', { org_id: orgId, branch_id: bid, from: dFrom, to: dTo }),
        staffId ? api.get('/api/attendance-report', { org_id: orgId, branch_id: bid, from: dFrom, to: dTo, staff_id: staffId }) : Promise.resolve(null),
      ])
      if (!alive) return
      if (all?.success) { setSummary(all.rows || []); setTotalDays(all.totalDays || 0) }
      else toast(all?.error || 'تعذر تحميل التقرير', 'error')
      setPerson(one?.success ? (one.rows?.[0] || null) : null)
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [dFrom, dTo, staffId])

  const rows = person ? [person] : summary
  const sum = (k: string) => rows.reduce((s: number, r: any) => s + Number(r[k] || 0), 0)
  const present = sum('days_present'), possible = rows.length * totalDays
  const rate = possible ? Math.round(present / possible * 100) : null
  const lateMin = sum('total_late_minutes'), penalty = Math.round(sum('total_penalty') * 100) / 100
  const otMin = sum('total_overtime_minutes'), otPay = Math.round(sum('total_overtime_pay') * 100) / 100

  async function exportPdf() {
    setExporting(true)
    try {
      const { exportReportPdf } = await import('@/lib/pdfExport')
      const { org } = await pdfOrgInfo()
      if (person) {
        await exportReportPdf({
          title: `سجل حضور ${person.name}`, subtitle: `من ${dFrom} إلى ${dTo}`, orgName: org?.name || '',
          columns: [
            { header: 'التاريخ', key: 'date' }, { header: 'الحضور', key: 'in', align: 'center' }, { header: 'الانصراف', key: 'out', align: 'center' },
            { header: 'الساعات', key: 'hours', align: 'center' }, { header: 'التأخير', key: 'late', align: 'center' }, { header: 'العمل الإضافي', key: 'ot', align: 'center' },
          ],
          rows: person.days.map((d: any) => ({ date: attDay(d.date), in: attTime(d.check_in), out: attTime(d.check_out), hours: d.hours_worked ?? '—', late: d.late_minutes ? attMin(d.late_minutes) : '—', ot: d.overtime_minutes ? `${attMin(d.overtime_minutes)} (${d.overtime_pay} ⃁)` : '—' })),
          totalsRow: { date: 'الإجمالي', in: `${person.days_present} يوم`, out: '', hours: '', late: lateMin ? attMin(lateMin) : '—', ot: otMin ? `${attMin(otMin)} (${otPay} ⃁)` : '—' },
          fileName: `حضور-${person.name}-${dFrom}-${dTo}`,
        })
      } else {
        await exportReportPdf({
          title: 'تقرير الحضور والانصراف', subtitle: `من ${dFrom} إلى ${dTo}`, orgName: org?.name || '',
          columns: [
            { header: 'الموظف', key: 'name' }, { header: 'أيام الحضور', key: 'days_present', align: 'center' }, { header: 'أيام الغياب', key: 'days_absent', align: 'center' },
            { header: 'التأخير (دقيقة)', key: 'total_late_minutes', align: 'center' }, { header: 'الخصومات (⃁)', key: 'total_penalty', align: 'center' },
            { header: 'العمل الإضافي (دقيقة)', key: 'total_overtime_minutes', align: 'center' }, { header: 'مبلغ العمل الإضافي (⃁)', key: 'total_overtime_pay', align: 'center' },
          ],
          rows: summary,
          totalsRow: { name: 'الإجمالي', days_present: present, days_absent: sum('days_absent'), total_late_minutes: lateMin, total_penalty: penalty, total_overtime_minutes: otMin, total_overtime_pay: otPay },
          fileName: `تقرير-الحضور-${dFrom}-${dTo}`,
        })
      }
    } catch { toast('فشل التصدير', 'error') }
    setExporting(false)
  }

  const th: React.CSSProperties = { padding:'11px 14px', textAlign:'right', fontSize:11, fontWeight:700, color:colors.text3, whiteSpace:'nowrap' }
  const td: React.CSSProperties = { padding:'12px 14px', fontSize:13, color:colors.text2, whiteSpace:'nowrap' }
  const pill = (txt: string, c: string, bg: string) => <span style={{ fontSize:11, fontWeight:700, color:c, background:bg, padding:'3px 10px', borderRadius:99 }}>{txt}</span>
  const label: React.CSSProperties = { fontSize:11, color:colors.text3, fontWeight:600, display:'block', marginBottom:5 }
  const stat = (title: string, value: string, sub: string, c: string, bg: string) => (
    <div style={{ ...card, padding:'14px 16px', background:bg, border:`1px solid ${colors.border}` }}>
      <div style={{ fontSize:11, color:colors.text3, fontWeight:600 }}>{title}</div>
      <div style={{ fontSize:22, fontWeight:900, color:c, marginTop:4 }}>{value}</div>
      <div style={{ fontSize:11, color:colors.text4, marginTop:2 }}>{sub}</div>
    </div>
  )

  return (
    <div style={{ fontFamily:font.family, direction:'rtl' }}>
      <button onClick={onBack} style={{ background:'none', border:'none', color:colors.primary, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginBottom:12, display:'flex', alignItems:'center', gap:4 }}>→ رجوع</button>
      <h1 style={pageTitle}><PageIcon/>تقرير الحضور والانصراف</h1>
      <p style={pageSub}>حضور الموظفين وتأخيرهم والعمل الإضافي خلال الفترة — اختر موظفاً لعرض سجله يوماً بيوم</p>

      <div style={{ ...card, padding:14, marginTop:16, marginBottom:14, display:'flex', gap:12, flexWrap:'wrap' as const, alignItems:'flex-end' }}>
        <div style={{ flex:'1 1 180px' }}>
          <label style={label}>الموظف</label>
          <select value={staffId} onChange={e => setStaffId(e.target.value)} style={inp()}>
            <option value="">كل الموظفين</option>
            {summary.map((s: any) => <option key={s.staff_id} value={s.staff_id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ flex:'1 1 140px' }}>
          <label style={label}>من تاريخ</label>
          <input type="date" value={dFrom} max={dTo} onChange={e => setDFrom(e.target.value)} style={inp()}/>
        </div>
        <div style={{ flex:'1 1 140px' }}>
          <label style={label}>إلى تاريخ</label>
          <input type="date" value={dTo} min={dFrom} onChange={e => setDTo(e.target.value)} style={inp()}/>
        </div>
        <button onClick={exportPdf} disabled={exporting || loading || rows.length === 0} style={{ ...btnSecondary, display:'flex', alignItems:'center', gap:6, padding:'10px 16px' }}>
          <Download size={15}/>{exporting ? 'جاري التصدير...' : 'تصدير PDF'}
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:10, marginBottom:14 }}>
        {stat('نسبة الحضور', rate === null ? '—' : `${rate}%`, `${present} يوم حضور من ${possible}`, colors.primary, colors.primaryLight)}
        {stat('التأخير', lateMin ? attMin(lateMin) : '—', penalty ? `خصومات ${penalty} ⃁` : 'بدون خصومات', colors.warning, colors.warningLight)}
        {stat('العمل الإضافي', otMin ? attMin(otMin) : '—', otPay ? `المستحق ${otPay} ⃁` : 'لا توجد ساعات إضافية', colors.info, colors.infoLight)}
      </div>

      {!loading && !person && summary.some((r: any) => r.shift_warning === 'none') && (
        <div style={{ ...card, padding:'10px 14px', marginBottom:14, background:colors.warningLight, border:`1px solid ${colors.warningBorder}`, color:colors.warning, fontSize:12, fontWeight:600 }}>
          ⚠️ {summary.filter((r: any) => r.shift_warning === 'none').length} موظف غير مرتبطين بوردية — لا يُحتسب لهم تأخير أو عمل إضافي. اربطهم من صفحة الحضور والانصراف ← الإعدادات.
        </div>
      )}
      <div style={{ ...card, padding:0, overflow:'hidden' }}>
        {loading ? (
          <ListSkeleton/>
        ) : person ? (
          <>
            {person.shift_warning && (
              <div style={{ padding:'10px 16px', background:colors.warningLight, borderBottom:`1px solid ${colors.warningBorder}`, color:colors.warning, fontSize:12, fontWeight:600 }}>
                ⚠️ {person.shift_warning === 'none' ? 'هذا الموظف غير مرتبط بوردية' : 'هذا الموظف على وردية 24 ساعة'} — لا يُحتسب له تأخير أو عمل إضافي. اربطه بوردية من صفحة الحضور والانصراف ← الإعدادات.
              </div>
            )}
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${colors.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' as const }}>
              <div style={{ fontWeight:800, fontSize:14, color:colors.text }}>{person.name}</div>
              <div style={{ display:'flex', gap:6 }}>
                {pill(`${person.days_present} حضور`, colors.primary, colors.primaryLight)}
                {pill(`${person.days_absent} غياب`, colors.danger, colors.dangerLight)}
              </div>
            </div>
            <div style={{ overflowX:'auto' as const }}>
              <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                <thead><tr style={{ background:colors.bg, borderBottom:`1px solid ${colors.border}` }}>
                  {['التاريخ','الحالة','الحضور','الانصراف','الساعات','التأخير','العمل الإضافي'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {[...person.days].reverse().map((d: any) => (
                    <tr key={d.date} style={{ borderBottom:`1px solid ${colors.border}`, background: d.check_in ? undefined : colors.bg }}>
                      <td style={{ ...td, fontWeight:700, color:colors.text }}>{attDay(d.date)}</td>
                      <td style={td}>{!d.check_in ? pill('غياب', colors.danger, colors.dangerLight) : d.check_out ? pill('انصرف', colors.primary, colors.primaryLight) : pill('حاضر', colors.info, colors.infoLight)}</td>
                      <td style={td}>{attTime(d.check_in)}</td>
                      <td style={td}>{attTime(d.check_out)}{d.is_excused && <span style={{ marginRight:6 }}>{pill('مستأذن', colors.warning, colors.warningLight)}</span>}</td>
                      <td style={{ ...td, fontWeight:600 }}>{d.hours_worked !== null ? `${d.hours_worked} ساعة` : '—'}</td>
                      <td style={{ ...td, color: d.late_minutes ? colors.warning : colors.text4, fontWeight: d.late_minutes ? 700 : 400 }}>
                        {d.late_minutes ? attMin(d.late_minutes) : '—'}{d.penalty_amount ? <div style={{ fontSize:11, color:colors.danger }}>خصم {d.penalty_amount} ⃁</div> : null}
                      </td>
                      <td style={{ ...td, color: d.overtime_minutes ? colors.info : colors.text4, fontWeight: d.overtime_minutes ? 700 : 400 }}>
                        {d.overtime_minutes ? attMin(d.overtime_minutes) : '—'}{d.overtime_pay ? <div style={{ fontSize:11, color:colors.text3 }}>{d.overtime_pay} ⃁</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : summary.length === 0 ? (
          <div style={{ textAlign:'center' as const, padding:48, color:colors.text4, fontSize:13 }}>لا يوجد موظفون نشطون في هذا الفرع</div>
        ) : (
          <div style={{ overflowX:'auto' as const }}>
            <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
              <thead><tr style={{ background:colors.bg, borderBottom:`1px solid ${colors.border}` }}>
                {['الموظف','الحضور','الغياب','التأخير','الخصومات','العمل الإضافي',''].map((h, i) => <th key={i} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {summary.map((r: any) => (
                  <tr key={r.staff_id} onClick={() => setStaffId(r.staff_id)} style={{ borderBottom:`1px solid ${colors.border}`, cursor:'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = colors.bg)} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ ...td, fontWeight:700, color:colors.text }}>{r.name}{r.shift_warning && <span title={r.shift_warning === 'none' ? 'الموظف غير مرتبط بوردية — لا يُحتسب له تأخير أو عمل إضافي' : 'وردية 24 ساعة — لا يُحتسب تأخير أو عمل إضافي'} style={{ marginRight: 6, fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' as const }}>{r.shift_warning === 'none' ? '⚠️ بدون وردية' : '⚠️ وردية 24 ساعة'}</span>}</td>
                    <td style={td}>{pill(`${r.days_present} يوم`, colors.primary, colors.primaryLight)}</td>
                    <td style={td}>{r.days_absent ? pill(`${r.days_absent} يوم`, colors.danger, colors.dangerLight) : '—'}</td>
                    <td style={{ ...td, color: r.total_late_minutes ? colors.warning : colors.text4, fontWeight:600 }}>{r.total_late_minutes ? attMin(r.total_late_minutes) : '—'}</td>
                    <td style={{ ...td, color: r.total_penalty ? colors.danger : colors.text4, fontWeight:600 }}>{r.total_penalty ? `${r.total_penalty} ⃁` : '—'}</td>
                    <td style={{ ...td, color: r.total_overtime_minutes ? colors.info : colors.text4, fontWeight:600 }}>
                      {r.total_overtime_minutes ? attMin(r.total_overtime_minutes) : '—'}{r.total_overtime_pay ? <div style={{ fontSize:11, color:colors.text3 }}>{r.total_overtime_pay} ⃁</div> : null}
                    </td>
                    <td style={{ ...td, color:colors.primary, fontSize:12, fontWeight:700 }}>السجل ←</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
