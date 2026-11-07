'use client'
import StaffHeader, { staffHeaderBtn } from '@/components/StaffHeader'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Globe } from 'lucide-react'
import { C, card, paper, receiptEdge, receiptNum, cutLine, sectionLabel } from '../_ui/theme'
import { currencySymbol } from '@/lib/currencySymbol'
import { useStaffLang } from '@/lib/staffLang'
import { useLiveRefresh, liveStaffOrg } from '@/lib/useLiveRefresh'
import { PAYSLIP_LANGS, payslipT, normalizeLang, type PayslipLang } from '@/lib/payslipI18n'

type Payroll = {
  month: string
  basic: number
  allowances: { housing: number; transport: number; food: number }
  grossSalary: number
  overtime: { minutes: number; pay: number; hourRate: number; mode?: 'auto' | 'fixed' | 'off'; days: { date: string; minutes: number; pay: number }[] }
  deductions: { amount: number; reason: string | null; date: string; source: 'manual' | 'cashier_deficit' | 'late_bundle' }[]
  bonuses?: { amount: number; reason: string | null; date: string; source: string | null }[]
  bonusesTotal?: number
  latePenalties: { date: string; minutes: number; amount: number }[]
  latePenaltiesTotal: number
  deductionsTotal: number
  advances: { amount: number; reason: string | null; date: string }[]
  advancesTotal: number
  pendingAdvances: { amount: number; date: string }[]
  pendingDeficits: { date: string; amount: number; reason: string | null }[]
  netSalary: number
  attendance: { daysPresent: number; daysInMonth: number; lateCount: number; lateMinutes: number; extraDays?: number }
}

const thisMonth = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 7)
const shiftMonth = (m: string, by: number) => { const [y, mo] = m.split('-').map(Number); return new Date(Date.UTC(y, mo - 1 + by, 1)).toISOString().slice(0, 7) }
const num = (n: number) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

// كشف الراتب — الموظف يشوف مستحقاته وكل خصم بسببه وتاريخه وصافي راتبه، بلغته
export default function PayslipPage() {
  const router = useRouter()
  const { lang, setLang } = useStaffLang()
  const [showLang, setShowLang] = useState(false)
  const [month, setMonth] = useState(thisMonth())
  const [data, setData] = useState<Payroll | null>(null)
  const [name, setName] = useState('')
  const [curr, setCurr] = useState('⃁')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'' | 'disabled' | 'loadError' | 'network'>('')


  const t = payslipT(lang)
  const L = PAYSLIP_LANGS.find(l => l.code === lang)!
  const rtl = L.rtl
  const monthLabel = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString(L.locale, { month: 'long', year: 'numeric', calendar: 'gregory', numberingSystem: 'latn', timeZone: 'UTC' })
  // التاريخ: 'YYYY-MM-DD' يوم عمل، أو وقت كامل يُعرض بتوقيت السعودية
  const dayLabel = (d: string) => d.length === 10
    ? new Date(`${d}T12:00:00Z`).toLocaleDateString(L.locale, { weekday: 'short', day: 'numeric', month: 'short', calendar: 'gregory', numberingSystem: 'latn', timeZone: 'UTC' })
    : new Date(d).toLocaleDateString(L.locale, { weekday: 'short', day: 'numeric', month: 'short', calendar: 'gregory', numberingSystem: 'latn', timeZone: 'Asia/Riyadh' })
  const dur = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h}${t('h')} ${m}${t('m')}` : h ? `${h} ${t('hour')}` : `${m} ${t('minute')}` }

  function chooseLang(code: PayslipLang) { setLang(code); setShowLang(false) }


  const load = useCallback(async (m: string) => {
    setLoading(true); setError('')
    try {
      const token = localStorage.getItem('staff_token')
      if (!token) { router.push('/staff'); return }
      const res = await fetch(`/api/staff-my-salary?month=${m}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      if (res.status === 401) { router.push('/staff'); return }
      const j = await res.json()
      if (!j.success) { setError(j.reason === 'disabled' ? 'disabled' : 'loadError'); setData(null) }
      else { setData(j.payroll); setName(j.name || ''); if (j.currency) setCurr(currencySymbol(j.currency)) }
    } catch { setError('network') }
    setLoading(false)
  }, [router])

  useEffect(() => { load(month) }, [month, load])
  // تحديث فوري: خصم أو مكافأة أو حضور جديد يظهر بالكشف على طول
  useLiveRefresh(liveStaffOrg(), ['staff_payroll_adjustments','staff_attendance','staff_members'], () => load(month))

  const isCurrent = month === thisMonth()
  const money = (v: number, sign?: '+' | '−', color?: string) => (
    <span style={{ ...receiptNum, fontSize: 14, color: color || C.t1, whiteSpace: 'nowrap' }}>
      {sign === '−' ? '-' : sign || ''}{num(v)}
    </span>
  )
  // النص اللي كتبه المالك/الكاشير يبقى بلغته — <bdi> يمنعه يتلخبط مع التاريخ بالصفحات اللي من اليسار
  const subLine = (date: string, extra?: string | null, label?: string) => (
    <>{dayLabel(date)}{extra ? <> · {label ? `${label}: ` : ''}<bdi>{extra}</bdi></> : null}</>
  )
  // خصم عجز الكاشير ينحفظ بالشكل «عجز إقفال الكاشير YYYY-MM-DD — السبب» — نعرض تاريخ الإقفال وسببه بس
  const deficitParts = (reason: string | null) => {
    const m = /^عجز إقفال الكاشير (\d{4}-\d{2}-\d{2})(?: — (.*))?$/.exec(reason || '')
    return m ? { date: m[1], reason: m[2] || null } : null
  }
  const line = (key: string, label: string, value: number, opts: { sub?: React.ReactNode; sign?: '+' | '−'; color?: string; strong?: boolean; first?: boolean } = {}) => (
    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: opts.strong ? '8px 0 2px' : '5px 0' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: opts.strong ? 600 : 400, color: opts.strong ? C.t1 : C.t2 }}>{label}</div>
        {opts.sub && <div style={{ fontSize: 12, color: C.t3, marginTop: 2, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{opts.sub}</div>}
      </div>
      {money(value, opts.sign, opts.color)}
    </div>
  )
  const sectionTitle = (txt: string) => <div style={sectionLabel}>{txt}</div>
  const receiptHead = (txt: string) => <div style={{ fontSize: 12, color: C.t3, margin: '2px 0 4px' }}>{txt}</div>
  const deductionLabel = (src: string) => src === 'cashier_deficit' ? t('deficit') : src === 'late_bundle' ? t('lateBundle') : t('manual')

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', fontFamily: "'IBM Plex Sans Arabic',system-ui", direction: rtl ? 'rtl' : 'ltr', paddingBottom: 40 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <StaffHeader title={t('title')} subtitle={name} rtl={rtl} backLabel={t('back')} end={
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowLang(v => !v)} aria-label={t('language')} style={staffHeaderBtn}>
            <Globe size={16} strokeWidth={1.75} />{L.label}
          </button>
          {showLang && (
            <div style={{ position: 'absolute', top: '100%', insetInlineEnd: 0, marginTop: 6, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 12px 28px rgba(15,23,42,.16)', overflow: 'hidden', minWidth: 150, zIndex: 50 }}>
              {PAYSLIP_LANGS.map(l => (
                <button key={l.code} onClick={() => chooseLang(l.code)}
                  style={{ width: '100%', padding: '11px 14px', border: 'none', borderBottom: '1px solid #eceef1', background: lang === l.code ? '#e7f3f1' : 'white', color: lang === l.code ? '#0f766e' : '#111827', fontSize: 13, fontWeight: lang === l.code ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start', display: 'block' }}>
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
      } />

      <div style={{ maxWidth: 560, margin: '0 auto', padding: 16 }}>
        {/* الشهر */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8 }}>
          <button aria-label={t('prev')} onClick={() => setMonth(shiftMonth(month, -1))} style={{ width: 36, height: 36, border: 'none', borderRadius: 10, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.t1 }}>
            {rtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight:600, color: C.t1 }}>{monthLabel(month)}</div>
            {isCurrent && <div style={{ fontSize: 12, color: C.t3 }}>{t('current')}</div>}
          </div>
          <button aria-label={t('next')} disabled={isCurrent} onClick={() => setMonth(shiftMonth(month, 1))} style={{ width: 36, height: 36, border: 'none', borderRadius: 10, background: 'transparent', cursor: isCurrent ? 'default' : 'pointer', opacity: isCurrent ? .35 : 1, display: 'grid', placeItems: 'center', color: C.t1 }}>
            {rtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><div style={{ width: 30, height: 30, border: '3px solid #e5e7eb', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /></div>
        ) : error ? (
          <div style={{ ...card, marginTop: 16, padding: '36px 20px', textAlign: 'center', fontSize: 14, color: C.t2 }}>{t(error)}</div>
        ) : data && (
          <>
            {/* إيصال الراتب: الصافي فوق، وتحته المستحقات والخصومات بخط الإيصال */}
            <div style={{ ...paper, marginTop: 16 }}>
              <div style={{ fontSize: 14, color: C.t2 }}>{isCurrent ? t('netSoFar') : t('net')}</div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ ...receiptNum, fontSize: 34, fontWeight: 500, color: C.t1 }}>{num(data.netSalary)}</span>
                <span style={{ fontSize: 13, color: C.t3 }}>{curr}</span>
              </div>
              <div style={{ ...cutLine, margin: '16px 0 10px' }} />
              {receiptHead(t('earnings'))}
              {line('basic', t('basic'), data.basic, { first: true })}
              {data.allowances.housing > 0 && line('housing', t('housing'), data.allowances.housing, { sign: '+' })}
              {data.allowances.transport > 0 && line('transport', t('transport'), data.allowances.transport, { sign: '+' })}
              {data.allowances.food > 0 && line('food', t('food'), data.allowances.food, { sign: '+' })}
              {data.overtime.pay > 0 && line('ot', t('overtime'), data.overtime.pay, { sign: '+', sub: `${dur(data.overtime.minutes)} × ${num(data.overtime.hourRate)} ${curr} ${t('perHour')}` })}
              {(data.bonuses || []).map((b, i) => {
                const m = /^تعويض يوم إضافي (\d{4}-\d{2}-\d{2})$/.exec(b.reason || '')
                return line(`b${i}`, m ? t('extraPay') : t('bonus'), b.amount, { sign: '+', sub: m ? dayLabel(m[1]) : subLine(b.date, b.reason) })
              })}
              {line('te', t('totalEarnings'), data.grossSalary + data.overtime.pay + (data.bonusesTotal || 0), { strong: true })}
              <div style={cutLine} />
              {receiptHead(t('deductions'))}
              {data.latePenalties.length + data.deductions.length + data.advances.length === 0 ? (
                <div style={{ padding: '6px 0', fontSize: 13, color: C.t3 }}>{t('noDeductions')}</div>
              ) : (
                <>
                  {[
                    ...data.latePenalties.map((p, i) => line(`l${i}`, t('late'), p.amount, { sign: '−', sub: <>{dayLabel(p.date)} · {t('lateBy', { m: dur(p.minutes) })}</>, first: i === 0 })),
                    ...data.deductions.map((d, i) => {
                      const df = d.source === 'cashier_deficit' ? deficitParts(d.reason) : null
                      const sub = df ? subLine(df.date, df.reason, t('reason'))
                        : d.source === 'late_bundle' ? subLine(d.date)
                        : subLine(d.date, d.reason, t('reason'))
                      return line(`d${i}`, deductionLabel(d.source), d.amount, { sign: '−', sub, first: i === 0 && !data.latePenalties.length })
                    }),
                    ...data.advances.map((a, i) => line(`a${i}`, t('advance'), a.amount, { sign: '−', sub: subLine(a.date, a.reason), first: i === 0 && !data.latePenalties.length && !data.deductions.length })),
                  ]}
                  {line('td', t('totalDeductions'), data.deductionsTotal + data.advancesTotal, { sign: '−', strong: true })}
                </>
              )}
              <div style={cutLine} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.t1 }}>{t('net')}</span>
                <span style={{ ...receiptNum, fontSize: 20, fontWeight: 500, color: C.t1 }}>{num(data.netSalary)}</span>
              </div>
            </div>
            <div style={receiptEdge} />

            {/* بانتظار قرار الإدارة — ما ينخصم */}
            {data.pendingAdvances.length + data.pendingDeficits.length > 0 && (
              <>
                {sectionTitle(t('pending'))}
                <div style={{ ...card, padding: '6px 16px' }}>
                  {data.pendingDeficits.map((d, i) => line(`pd${i}`, t('pendingDeficit'), d.amount, { color: C.warn, sub: subLine(d.date, d.reason, t('reason')), first: i === 0 }))}
                  {data.pendingAdvances.map((a, i) => line(`pa${i}`, t('pendingAdvance'), a.amount, { color: C.warn, sub: subLine(a.date), first: i === 0 && !data.pendingDeficits.length }))}
                </div>
              </>
            )}

            {/* الحضور: ثلاث أرقام في بطاقة وحدة */}
            <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', marginTop: 24 }}>
              {[
                { v: `${data.attendance.daysPresent}`, l: data.attendance.extraDays ? `${t('daysPresent')} · ${t('extraDays', { n: String(data.attendance.extraDays) })}` : t('daysPresent') },
                { v: data.attendance.lateMinutes ? dur(data.attendance.lateMinutes) : '0', l: `${t('lateStat')} (${data.attendance.lateCount} ${t('times')})` },
                { v: data.overtime.minutes ? dur(data.overtime.minutes) : '0', l: t('overtimeStat') },
              ].map((k, i) => (
                <div key={i} style={{ padding: '12px 8px', textAlign: 'center', borderInlineStart: i ? `1px solid ${C.line}` : 'none' }}>
                  <div style={{ fontSize: 18, fontWeight: 500, color: C.t1, fontVariantNumeric: 'tabular-nums' }}>{k.v}</div>
                  <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>{k.l}</div>
                </div>
              ))}
            </div>

            {/* أيام الأوفر تايم */}
            {data.overtime.days.length > 0 && (
              <>
                {sectionTitle(t('overtimeDays'))}
                <div style={{ ...card, padding: '6px 16px' }}>
                  {data.overtime.days.map((d, i) => line(`o${i}`, dayLabel(d.date), d.pay, { sign: '+', sub: dur(d.minutes), first: i === 0 }))}
                </div>
              </>
            )}

            <p style={{ fontSize: 13, color: C.t3, textAlign: 'center', lineHeight: 1.7, marginTop: 16 }}>
              {data.overtime.mode === 'off' ? t('noteOff') : t(data.overtime.mode === 'fixed' ? 'noteFixed' : 'noteAuto', { rate: `${num(data.overtime.hourRate)} ${curr}` })}
              {isCurrent && <><br />{t('noteCurrent')}</>}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
