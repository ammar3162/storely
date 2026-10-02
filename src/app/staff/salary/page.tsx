'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, TrendingUp, TrendingDown, Clock, CalendarCheck, Wallet } from 'lucide-react'
import { currencySymbol } from '@/lib/currencySymbol'

type Payroll = {
  month: string
  basic: number
  allowances: { housing: number; transport: number; food: number }
  grossSalary: number
  overtime: { minutes: number; pay: number; hourRate: number; mode?: 'auto' | 'fixed' | 'off'; days: { date: string; minutes: number; pay: number }[] }
  deductions: { amount: number; reason: string | null; date: string }[]
  deductionsTotal: number
  advances: { amount: number; reason: string | null; date: string }[]
  advancesTotal: number
  pendingAdvances: { amount: number; date: string }[]
  netSalary: number
  attendance: { daysPresent: number; daysInMonth: number; lateCount: number; lateMinutes: number }
  leaveDaysTaken: number
}

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const thisMonth = () => { const d = new Date(Date.now() + 3 * 3600e3); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` }
const shiftMonth = (m: string, by: number) => { const [y, mo] = m.split('-').map(Number); const d = new Date(Date.UTC(y, mo - 1 + by, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` }
const monthLabel = (m: string) => { const [y, mo] = m.split('-').map(Number); return `${MONTHS[mo - 1]} ${y}` }
const num = (n: number) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
const hours = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h} س ${m} د` : h ? `${h} ساعة` : `${m} دقيقة` }
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('ar-SA', { numberingSystem: 'latn', weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Riyadh' })

export default function StaffSalaryPage() {
  const router = useRouter()
  const [month, setMonth] = useState(thisMonth())
  const [data, setData] = useState<Payroll | null>(null)
  const [name, setName] = useState('')
  const [curr, setCurr] = useState('ر.س')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (m: string) => {
    setLoading(true); setError('')
    try {
      const token = localStorage.getItem('staff_token')
      if (!token) { router.push('/staff'); return }
      const res = await fetch(`/api/staff-my-salary?month=${m}`, { headers: { Authorization: `Bearer ${token}` } })
      const j = await res.json()
      if (res.status === 401) { router.push('/staff'); return }
      if (!j.success) { setError(j.reason === 'disabled' ? 'صفحة الراتب غير مفعّلة من الإدارة' : (j.error || 'تعذر تحميل الراتب')); setData(null) }
      else { setData(j.payroll); setName(j.name || ''); if (j.currency) setCurr(currencySymbol(j.currency)) }
    } catch { setError('خطأ بالاتصال، حاول مرة ثانية') }
    setLoading(false)
  }, [router])

  useEffect(() => { load(month) }, [month, load])

  const isCurrent = month === thisMonth()
  const Row = ({ label, value, sign, sub, strong }: { label: string; value: number; sign?: '+' | '−'; sub?: string; strong?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '11px 0', borderBottom: '1px dashed #e7e5e0' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: strong ? 800 : 600, color: '#1c1c1a' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: sign === '−' ? '#dc2626' : sign === '+' ? '#047857' : '#1c1c1a', fontVariantNumeric: 'tabular-nums' }} dir="ltr">
        {sign === '−' ? '−' : sign === '+' ? '+' : ''}{num(value)} <span style={{ fontSize: 11, color: '#888780', fontWeight: 600 }}>{curr}</span>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', fontFamily: "'IBM Plex Sans Arabic',system-ui", direction: 'rtl', paddingBottom: 40 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ background: 'white', borderBottom: '1px solid #ece8e2', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1c1c1a', display: 'flex', alignItems: 'center', gap: 8 }}><Wallet size={18} color="#0f766e" /> راتبي</div>
          <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>{name}</div>
        </div>
        <button onClick={() => router.back()} style={{ background: '#f5f5f4', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#5f5e5a', cursor: 'pointer', fontFamily: 'inherit' }}>رجوع</button>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px' }}>
        {/* الشهر */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', border: '1.5px solid #ece8e2', borderRadius: 14, padding: '8px 10px', marginBottom: 14 }}>
          <button aria-label="الشهر السابق" onClick={() => setMonth(shiftMonth(month, -1))} style={{ width: 38, height: 38, border: 'none', borderRadius: 10, background: '#f5f5f4', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><ChevronRight size={18} /></button>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1c1c1a' }}>{monthLabel(month)}{isCurrent && <span style={{ fontSize: 11, color: '#0f766e', marginRight: 6 }}>· الشهر الحالي</span>}</div>
          <button aria-label="الشهر التالي" disabled={isCurrent} onClick={() => setMonth(shiftMonth(month, 1))} style={{ width: 38, height: 38, border: 'none', borderRadius: 10, background: '#f5f5f4', cursor: isCurrent ? 'default' : 'pointer', opacity: isCurrent ? .35 : 1, display: 'grid', placeItems: 'center' }}><ChevronLeft size={18} /></button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><div style={{ width: 30, height: 30, border: '3px solid #e5e5e2', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /></div>
        ) : error ? (
          <div style={{ background: 'white', border: '1.5px solid #ece8e2', borderRadius: 14, padding: '36px 20px', textAlign: 'center', fontSize: 14, color: '#5f5e5a', fontWeight: 600 }}>{error}</div>
        ) : data && (
          <>
            {/* الصافي */}
            <div style={{ background: 'linear-gradient(135deg,#0b3b3a,#0f766e)', borderRadius: 20, padding: '22px 22px 18px', color: 'white', marginBottom: 14 }}>
              <div style={{ fontSize: 13, opacity: .8, fontWeight: 600 }}>{isCurrent ? 'صافي الراتب المتوقع حتى الآن' : 'صافي الراتب'}</div>
              <div style={{ fontSize: 40, fontWeight: 900, marginTop: 4, fontVariantNumeric: 'tabular-nums' }} dir="ltr">{num(data.netSalary)} <span style={{ fontSize: 16, fontWeight: 700, opacity: .8 }}>{curr}</span></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {data.overtime.pay > 0 && <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,.14)', borderRadius: 99, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}><TrendingUp size={13} /> أوفر تايم +{num(data.overtime.pay)}</span>}
                {data.deductionsTotal + data.advancesTotal > 0 && <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,.14)', borderRadius: 99, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}><TrendingDown size={13} /> خصومات وسلف −{num(data.deductionsTotal + data.advancesTotal)}</span>}
              </div>
            </div>

            {/* التفاصيل */}
            <div style={{ background: 'white', border: '1.5px solid #ece8e2', borderRadius: 16, padding: '6px 16px 4px', marginBottom: 14 }}>
              <Row label="الراتب الأساسي" value={data.basic} />
              {data.allowances.housing > 0 && <Row label="بدل سكن" value={data.allowances.housing} sign="+" />}
              {data.allowances.transport > 0 && <Row label="بدل مواصلات" value={data.allowances.transport} sign="+" />}
              {data.allowances.food > 0 && <Row label="بدل طعام" value={data.allowances.food} sign="+" />}
              {data.overtime.pay > 0 && <Row label="الأوفر تايم" value={data.overtime.pay} sign="+" sub={`${hours(data.overtime.minutes)} × ${num(data.overtime.hourRate)} ${curr} للساعة`} />}
              {data.deductionsTotal > 0 && <Row label="الخصومات" value={data.deductionsTotal} sign="−" sub={`${data.deductions.length} خصم`} />}
              {data.advancesTotal > 0 && <Row label="السلف" value={data.advancesTotal} sign="−" />}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 12px' }}>
                <div style={{ fontSize: 15, fontWeight: 900 }}>صافي الراتب</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#0f766e', fontVariantNumeric: 'tabular-nums' }} dir="ltr">{num(data.netSalary)} <span style={{ fontSize: 11, color: '#888780' }}>{curr}</span></div>
              </div>
            </div>

            {/* الحضور */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { icon: <CalendarCheck size={16} />, v: `${data.attendance.daysPresent}`, l: 'يوم حضور', c: '#0f766e' },
                { icon: <Clock size={16} />, v: data.attendance.lateMinutes ? hours(data.attendance.lateMinutes) : '0', l: `تأخير (${data.attendance.lateCount} مرة)`, c: data.attendance.lateCount ? '#c2410c' : '#0f766e' },
                { icon: <TrendingUp size={16} />, v: data.overtime.minutes ? hours(data.overtime.minutes) : '0', l: 'أوفر تايم', c: '#4f46e5' },
              ].map((k, i) => (
                <div key={i} style={{ background: 'white', border: '1.5px solid #ece8e2', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ color: k.c, display: 'flex', justifyContent: 'center' }}>{k.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: k.c, marginTop: 4 }}>{k.v}</div>
                  <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{k.l}</div>
                </div>
              ))}
            </div>

            {/* القوائم */}
            {[
              { title: 'الخصومات', items: data.deductions.map(d => ({ date: d.date, text: d.reason || 'خصم', value: `−${num(d.amount)}`, color: '#dc2626' })) },
              { title: 'السلف', items: data.advances.map(d => ({ date: d.date, text: d.reason || 'سلفة', value: `−${num(d.amount)}`, color: '#dc2626' })) },
              { title: 'سلف بانتظار موافقة الإدارة', items: data.pendingAdvances.map(d => ({ date: d.date, text: 'بانتظار الموافقة', value: num(d.amount), color: '#d97706' })) },
              { title: 'أيام الأوفر تايم', items: data.overtime.days.map(d => ({ date: d.date + 'T12:00:00+03:00', text: hours(d.minutes), value: `+${num(d.pay)}`, color: '#047857' })) },
            ].filter(s => s.items.length).map(s => (
              <div key={s.title} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#888780', margin: '0 4px 8px' }}>{s.title}</div>
                <div style={{ background: 'white', border: '1.5px solid #ece8e2', borderRadius: 14, overflow: 'hidden' }}>
                  {s.items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderTop: i ? '1px solid #f1efe9' : 'none' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1a' }}>{it.text}</div>
                        <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{dayLabel(it.date)}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: it.color, fontVariantNumeric: 'tabular-nums' }} dir="ltr">{it.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <p style={{ fontSize: 11, color: '#a3a29c', textAlign: 'center', lineHeight: 1.8, marginTop: 6 }}>
              {data.overtime.mode === 'off' ? 'الأوفر تايم غير مفعّل في منشأتك.'
                : data.overtime.mode === 'fixed' ? `الأوفر تايم محسوب من وقت انصرافك بعد نهاية شفتك، بمبلغ ${num(data.overtime.hourRate)} ${curr} لكل ساعة.`
                : `الأوفر تايم محسوب من وقت انصرافك بعد نهاية شفتك: راتبك الأساسي ÷ 30 ÷ ساعات شفتك × المضاعف = ${num(data.overtime.hourRate)} ${curr} للساعة.`}
              {isCurrent && <><br />أرقام الشهر الحالي تتحدث مع كل حضور وانصراف.</>}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
