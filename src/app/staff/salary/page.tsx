'use client'
import StaffHeader, { staffHeaderBtn } from '@/components/StaffHeader'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, CalendarCheck, Clock, TrendingUp, Globe } from 'lucide-react'
import { currencySymbol } from '@/lib/currencySymbol'
import { PAYSLIP_LANGS, payslipT, normalizeLang, type PayslipLang } from '@/lib/payslipI18n'

type Payroll = {
  month: string
  basic: number
  allowances: { housing: number; transport: number; food: number }
  grossSalary: number
  overtime: { minutes: number; pay: number; hourRate: number; mode?: 'auto' | 'fixed' | 'off'; days: { date: string; minutes: number; pay: number }[] }
  deductions: { amount: number; reason: string | null; date: string; source: 'manual' | 'cashier_deficit' | 'late_bundle' }[]
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
  const [lang, setLang] = useState<PayslipLang>('ar')
  const [showLang, setShowLang] = useState(false)
  const [month, setMonth] = useState(thisMonth())
  const [data, setData] = useState<Payroll | null>(null)
  const [name, setName] = useState('')
  const [curr, setCurr] = useState('ر.س')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'' | 'disabled' | 'loadError' | 'network'>('')

  useEffect(() => { try { setLang(normalizeLang(localStorage.getItem('staff_lang'))) } catch {} }, [])

  const t = payslipT(lang)
  const L = PAYSLIP_LANGS.find(l => l.code === lang)!
  const rtl = L.rtl
  const monthLabel = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString(L.locale, { month: 'long', year: 'numeric', calendar: 'gregory', numberingSystem: 'latn', timeZone: 'UTC' })
  // التاريخ: 'YYYY-MM-DD' يوم عمل، أو وقت كامل يُعرض بتوقيت السعودية
  const dayLabel = (d: string) => d.length === 10
    ? new Date(`${d}T12:00:00Z`).toLocaleDateString(L.locale, { weekday: 'short', day: 'numeric', month: 'short', calendar: 'gregory', numberingSystem: 'latn', timeZone: 'UTC' })
    : new Date(d).toLocaleDateString(L.locale, { weekday: 'short', day: 'numeric', month: 'short', calendar: 'gregory', numberingSystem: 'latn', timeZone: 'Asia/Riyadh' })
  const dur = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h}${t('h')} ${m}${t('m')}` : h ? `${h} ${t('hour')}` : `${m} ${t('minute')}` }

  function chooseLang(code: PayslipLang) {
    setLang(code); setShowLang(false)
    try { localStorage.setItem('staff_lang', code) } catch {}
    // نفس تفضيل اللغة لإشعارات الموظف
    const token = localStorage.getItem('staff_token')
    fetch('/api/staff-set-lang', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ lang: code }) }).catch(() => {})
  }

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

  const isCurrent = month === thisMonth()
  const card: React.CSSProperties = { background: 'white', border: '1px solid #e8ecf1', borderRadius: 16, boxShadow: '0 1px 2px rgba(16,24,40,.04)' }
  const money = (v: number, sign?: '+' | '−', color?: string) => (
    <span dir="ltr" style={{ fontSize: 14.5, fontWeight: 800, color: color || '#0f172a', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {sign || ''}{num(v)} <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{curr}</span>
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
    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: opts.first ? 'none' : '1px solid #f1f5f9' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: opts.strong ? 800 : 600, color: '#0f172a' }}>{label}</div>
        {opts.sub && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{opts.sub}</div>}
      </div>
      {money(value, opts.sign, opts.color)}
    </div>
  )
  const sectionTitle = (txt: string) => <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '18px 4px 8px' }}>{txt}</div>
  const deductionLabel = (src: string) => src === 'cashier_deficit' ? t('deficit') : src === 'late_bundle' ? t('lateBundle') : t('manual')

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f8', fontFamily: "'IBM Plex Sans Arabic',system-ui", direction: rtl ? 'rtl' : 'ltr', paddingBottom: 40 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <StaffHeader title={t('title')} subtitle={name} rtl={rtl} backLabel={t('back')} end={
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowLang(v => !v)} aria-label={t('language')} style={staffHeaderBtn}>
            <Globe size={15} strokeWidth={2.25} />{L.label}
          </button>
          {showLang && (
            <div style={{ position: 'absolute', top: '100%', insetInlineEnd: 0, marginTop: 6, background: 'white', borderRadius: 12, border: '1px solid #e8ecf1', boxShadow: '0 12px 28px rgba(15,23,42,.16)', overflow: 'hidden', minWidth: 150, zIndex: 50 }}>
              {PAYSLIP_LANGS.map(l => (
                <button key={l.code} onClick={() => chooseLang(l.code)}
                  style={{ width: '100%', padding: '11px 14px', border: 'none', borderBottom: '1px solid #f1f5f9', background: lang === l.code ? '#f0fdfa' : 'white', color: lang === l.code ? '#0f766e' : '#1e293b', fontSize: 13, fontWeight: lang === l.code ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start', display: 'block' }}>
                  {lang === l.code ? '✓ ' : ''}{l.label}
                </button>
              ))}
            </div>
          )}
        </div>
      } />

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '14px 16px' }}>
        {/* الشهر */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px' }}>
          <button aria-label={t('prev')} onClick={() => setMonth(shiftMonth(month, -1))} style={{ width: 38, height: 38, border: 'none', borderRadius: 10, background: '#f1f5f9', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#334155' }}>
            {rtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{monthLabel(month)}</div>
            {isCurrent && <div style={{ fontSize: 11, color: '#0f766e', fontWeight: 600 }}>{t('current')}</div>}
          </div>
          <button aria-label={t('next')} disabled={isCurrent} onClick={() => setMonth(shiftMonth(month, 1))} style={{ width: 38, height: 38, border: 'none', borderRadius: 10, background: '#f1f5f9', cursor: isCurrent ? 'default' : 'pointer', opacity: isCurrent ? .35 : 1, display: 'grid', placeItems: 'center', color: '#334155' }}>
            {rtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><div style={{ width: 30, height: 30, border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /></div>
        ) : error ? (
          <div style={{ ...card, marginTop: 14, padding: '36px 20px', textAlign: 'center', fontSize: 14, color: '#475569', fontWeight: 600 }}>{t(error)}</div>
        ) : data && (
          <>
            {/* الصافي */}
            <div style={{ background: 'linear-gradient(160deg,#0b3b3a,#0f766e)', borderRadius: 20, padding: '20px 22px', color: 'white', marginTop: 14 }}>
              <div style={{ fontSize: 13, opacity: .8, fontWeight: 600 }}>{isCurrent ? t('netSoFar') : t('net')}</div>
              <div style={{ fontSize: 38, fontWeight: 900, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}><span dir="ltr">{num(data.netSalary)} <span style={{ fontSize: 15, fontWeight: 700, opacity: .8 }}>{curr}</span></span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                <div style={{ background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: '9px 12px' }}>
                  <div style={{ fontSize: 11, opacity: .8 }}>{t('totalEarnings')}</div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}><span dir="ltr">+{num(data.grossSalary + data.overtime.pay)}</span></div>
                </div>
                <div style={{ background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: '9px 12px' }}>
                  <div style={{ fontSize: 11, opacity: .8 }}>{t('totalDeductions')}</div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}><span dir="ltr">−{num(data.deductionsTotal + data.advancesTotal)}</span></div>
                </div>
              </div>
            </div>

            {/* المستحقات */}
            {sectionTitle(t('earnings'))}
            <div style={{ ...card, padding: '0 16px' }}>
              {line('basic', t('basic'), data.basic, { first: true })}
              {data.allowances.housing > 0 && line('housing', t('housing'), data.allowances.housing, { sign: '+' })}
              {data.allowances.transport > 0 && line('transport', t('transport'), data.allowances.transport, { sign: '+' })}
              {data.allowances.food > 0 && line('food', t('food'), data.allowances.food, { sign: '+' })}
              {data.overtime.pay > 0 && line('ot', t('overtime'), data.overtime.pay, { sign: '+', color: '#047857', sub: `${dur(data.overtime.minutes)} × ${num(data.overtime.hourRate)} ${curr} ${t('perHour')}` })}
              {line('te', t('totalEarnings'), data.grossSalary + data.overtime.pay, { strong: true })}
            </div>

            {/* الخصومات — كل خصم بسببه وتاريخه */}
            {sectionTitle(t('deductions'))}
            <div style={{ ...card, padding: '0 16px' }}>
              {data.latePenalties.length + data.deductions.length + data.advances.length === 0 ? (
                <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{t('noDeductions')}</div>
              ) : (
                <>
                  {[
                    ...data.latePenalties.map((p, i) => line(`l${i}`, t('late'), p.amount, { sign: '−', color: '#dc2626', sub: <>{dayLabel(p.date)} · {t('lateBy', { m: dur(p.minutes) })}</>, first: i === 0 })),
                    ...data.deductions.map((d, i) => {
                      const df = d.source === 'cashier_deficit' ? deficitParts(d.reason) : null
                      const sub = df ? subLine(df.date, df.reason, t('reason'))
                        : d.source === 'late_bundle' ? subLine(d.date)
                        : subLine(d.date, d.reason, t('reason'))
                      return line(`d${i}`, deductionLabel(d.source), d.amount, { sign: '−', color: '#dc2626', sub, first: i === 0 && !data.latePenalties.length })
                    }),
                    ...data.advances.map((a, i) => line(`a${i}`, t('advance'), a.amount, { sign: '−', color: '#dc2626', sub: subLine(a.date, a.reason), first: i === 0 && !data.latePenalties.length && !data.deductions.length })),
                  ]}
                  {line('td', t('totalDeductions'), data.deductionsTotal + data.advancesTotal, { sign: '−', color: '#dc2626', strong: true })}
                </>
              )}
            </div>

            {/* الصافي */}
            <div style={{ ...card, marginTop: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdfa', borderColor: '#b2e3df' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{t('net')}</div>
              {money(data.netSalary, undefined, '#0f766e')}
            </div>

            {/* بانتظار قرار الإدارة — ما ينخصم */}
            {data.pendingAdvances.length + data.pendingDeficits.length > 0 && (
              <>
                {sectionTitle(t('pending'))}
                <div style={{ ...card, padding: '0 16px', background: '#fffbeb', borderColor: '#fde68a' }}>
                  {data.pendingDeficits.map((d, i) => line(`pd${i}`, t('pendingDeficit'), d.amount, { color: '#b45309', sub: subLine(d.date, d.reason, t('reason')), first: i === 0 }))}
                  {data.pendingAdvances.map((a, i) => line(`pa${i}`, t('pendingAdvance'), a.amount, { color: '#b45309', sub: subLine(a.date), first: i === 0 && !data.pendingDeficits.length }))}
                </div>
              </>
            )}

            {/* الحضور */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 18 }}>
              {[
                { icon: <CalendarCheck size={16} />, v: `${data.attendance.daysPresent}`, l: data.attendance.extraDays ? `${t('daysPresent')} · ${t('extraDays', { n: String(data.attendance.extraDays) })}` : t('daysPresent'), c: '#0f766e' },
                { icon: <Clock size={16} />, v: data.attendance.lateMinutes ? dur(data.attendance.lateMinutes) : '0', l: `${t('lateStat')} (${data.attendance.lateCount} ${t('times')})`, c: data.attendance.lateCount ? '#c2410c' : '#0f766e' },
                { icon: <TrendingUp size={16} />, v: data.overtime.minutes ? dur(data.overtime.minutes) : '0', l: t('overtimeStat'), c: '#4f46e5' },
              ].map((k, i) => (
                <div key={i} style={{ ...card, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ color: k.c, display: 'flex', justifyContent: 'center' }}>{k.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: k.c, marginTop: 4 }}>{k.v}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{k.l}</div>
                </div>
              ))}
            </div>

            {/* أيام الأوفر تايم */}
            {data.overtime.days.length > 0 && (
              <>
                {sectionTitle(t('overtimeDays'))}
                <div style={{ ...card, padding: '0 16px' }}>
                  {data.overtime.days.map((d, i) => line(`o${i}`, dayLabel(d.date), d.pay, { sign: '+', color: '#047857', sub: dur(d.minutes), first: i === 0 }))}
                </div>
              </>
            )}

            <p style={{ fontSize: 11.5, color: '#94a3b8', textAlign: 'center', lineHeight: 1.8, marginTop: 16 }}>
              {data.overtime.mode === 'off' ? t('noteOff') : t(data.overtime.mode === 'fixed' ? 'noteFixed' : 'noteAuto', { rate: `${num(data.overtime.hourRate)} ${curr}` })}
              {isCurrent && <><br />{t('noteCurrent')}</>}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
