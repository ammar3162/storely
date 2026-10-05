'use client'
import { useEffect, useMemo, useState } from 'react'
import { Mail, MessageCircle, Send, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { api } from '@/lib/api-client'
import { colors, radius, font, inp, btnPrimary, btnSecondary } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { ACC_SECTIONS, type AccSection } from '@/lib/accountantExport'
import { nextSend, periodLabel, hourLabel, type AccFrequency, type ManualPeriodKey } from '@/lib/accountantSchedule'

// الربط مع المحاسب — المالك يحدد محاسبه، وش يوصله، ومتى، وبأي طريقة
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const dateLabel = (d: string) => `${WEEKDAYS[new Date(`${d}T12:00:00Z`).getUTCDay()]} ${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`
const NOW_PERIODS: { key: ManualPeriodKey; label: string }[] = [
  { key: 'scheduled', label: 'آخر فترة حسب الموعد' }, { key: 'last_month', label: 'الشهر اللي فات' },
  { key: 'this_month', label: 'هذا الشهر لين أمس' }, { key: 'last_week', label: 'آخر ٧ أيام' }, { key: 'yesterday', label: 'أمس' },
]
const FREQ: { key: AccFrequency; label: string }[] = [{ key: 'daily', label: 'يومي' }, { key: 'weekly', label: 'أسبوعي' }, { key: 'monthly', label: 'شهري' }]

type Form = { name: string; email: string; whatsapp: string; channels: string[]; sections: AccSection[]; frequency: AccFrequency; weekday: number; month_day: number; send_hour: number
  branch_id: string; vat_registered: boolean; is_active: boolean }
const EMPTY: Form = { name: '', email: '', whatsapp: '', channels: ['email'], sections: ['sales', 'purchases', 'vat', 'payables', 'payroll', 'expenses', 'cash_diff'],
  frequency: 'monthly', weekday: 0, month_day: 2, send_hour: 8, branch_id: '', vat_registered: true, is_active: true }

const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: colors.text2, display: 'block', marginBottom: 6 }
const chip = (on: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer',
  fontFamily: font.family, border: `1.5px solid ${on ? colors.primary : colors.border}`, background: on ? colors.primaryLight : colors.surface, color: on ? colors.primary : colors.text3 })
const box: React.CSSProperties = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 16, marginBottom: 12 }

export default function AccountantLinkSettings({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saved, setSaved] = useState<any>(null)        // آخر نسخة محفوظة
  const [reports, setReports] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState<'' | 'save' | 'test' | 'delete'>('')
  const [nowPeriod, setNowPeriod] = useState<ManualPeriodKey>('scheduled')

  async function load() {
    const [j, b] = await Promise.all([api.get('/api/accountant-link', { org_id: orgId }), api.get('/api/branches', { org_id: orgId })])
    if (j.success) {
      setReports(j.reports || [])
      setSaved(j.link)
      if (j.link) {
        const l = j.link
        setForm({ name: l.name, email: l.email || '', whatsapp: l.whatsapp ? '+' + l.whatsapp : '', channels: l.channels, sections: l.sections, frequency: l.frequency,
          weekday: l.weekday, month_day: l.month_day, send_hour: l.send_hour ?? 8, branch_id: l.branch_id || '', vat_registered: l.vat_registered, is_active: l.is_active })
        setConsent(l.channels.includes('whatsapp'))
      }
    }
    setBranches((b.branches || []).filter((x: any) => x.is_active !== false))
    setLoading(false)
  }
  useEffect(() => { if (orgId) load() }, [orgId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))
  const toggle = <T,>(arr: T[], v: T) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
  const dirty = useMemo(() => {
    if (!saved) return true
    const s = { name: saved.name, email: saved.email || '', whatsapp: saved.whatsapp ? '+' + saved.whatsapp : '', channels: saved.channels, sections: saved.sections, frequency: saved.frequency,
      weekday: saved.weekday, month_day: saved.month_day, send_hour: saved.send_hour ?? 8, branch_id: saved.branch_id || '', vat_registered: saved.vat_registered, is_active: saved.is_active }
    return JSON.stringify(s) !== JSON.stringify(form)
  }, [saved, form])
  const upcoming = saved?.is_active ? nextSend(saved, saved.last_period_end) : null

  async function save() {
    if (form.channels.includes('whatsapp') && !consent) { toast('أكّد إن المحاسب موافق يوصله التقرير على الواتساب', 'warning'); return }
    setBusy('save')
    const j = await api.put('/api/accountant-link', { org_id: orgId, ...form, branch_id: form.branch_id || null })
    setBusy('')
    if (!j.success) { toast(j.error || 'تعذر الحفظ', 'error'); return }
    toast('✅ تم حفظ الربط مع المحاسب')
    load()
  }
  async function test() {
    setBusy('test')
    const j = await api.post('/api/accountant-link', { org_id: orgId, period: nowPeriod })
    setBusy('')
    if (!j.success) { toast(j.error || 'تعذر الإرسال', 'error'); load(); return }
    toast(`✅ أرسلنا تقرير ${j.label} للمحاسب`)
    load()
  }
  async function remove() {
    const ok = await confirmDialog({ title: 'إيقاف الربط مع المحاسب؟', message: 'ما عاد يوصله أي تقرير، والروابط اللي وصلته تتوقف.', confirmText: 'إيقاف وحذف', type: 'danger' })
    if (!ok) return
    setBusy('delete')
    const j = await api.del('/api/accountant-link', { org_id: orgId })
    setBusy('')
    if (!j.success) { toast(j.error || 'تعذر الحذف', 'error'); return }
    setSaved(null); setForm(EMPTY); setReports([]); setConsent(false)
    toast('تم إيقاف الربط')
  }

  if (loading) return <div style={{ padding: 30, textAlign: 'center', color: colors.text4, fontSize: 13 }}>جاري التحميل...</div>

  const status = (s: string | null) => s === 'sent' ? <CheckCircle2 size={14} color="#059669" /> : s === 'failed' ? <XCircle size={14} color={colors.danger} /> : <span style={{ color: colors.text4 }}>—</span>

  return (
    <div style={{ fontFamily: font.family }}>
      <div style={{ ...box, background: colors.primaryLight, borderColor: colors.primaryBorder }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: colors.text }}>الربط مع المحاسب</div>
        <div style={{ fontSize: 12.5, color: colors.text3, marginTop: 4, lineHeight: 1.7 }}>
          يوصل محاسبك تقرير تلقائي فيه ملف إكسل بكل البيانات اللي تختارها — بالإيميل أو الواتساب — فيه بس البيانات اللي تختارها، بالموعد اللي تحدده.
        </div>
        {upcoming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12.5, fontWeight: 700, color: colors.primary }}>
            <Clock size={14} /> التقرير الجاي: {dateLabel(upcoming.date)} الساعة {hourLabel(saved.send_hour ?? 8)} — عن {periodLabel(upcoming.period)}
          </div>
        )}
        {saved && !saved.is_active && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: colors.warning }}>الربط موقوف مؤقتاً — ما يوصل المحاسب شي</div>}
      </div>

      {/* 1) المحاسب */}
      <div style={box}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>١. بيانات المحاسب</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
          <div><label style={label}>الاسم</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثلاً: أ. محمد" maxLength={80} style={inp()} /></div>
          <div><label style={label}>الإيميل</label><input value={form.email} onChange={e => set('email', e.target.value)} placeholder="accountant@example.com" dir="ltr" type="email" style={inp()} /></div>
          <div><label style={label}>رقم الواتساب</label><input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="05xxxxxxxx" dir="ltr" inputMode="tel" style={inp()} /></div>
        </div>
        <label style={{ ...label, marginTop: 14 }}>يوصله عن طريق</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          <button onClick={() => set('channels', toggle(form.channels, 'email'))} style={chip(form.channels.includes('email'))}><Mail size={15} /> إيميل + ملف إكسل</button>
          <button onClick={() => set('channels', toggle(form.channels, 'whatsapp'))} style={chip(form.channels.includes('whatsapp'))}><MessageCircle size={15} /> واتساب + ملف إكسل</button>
        </div>
        {form.channels.includes('whatsapp') && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12.5, color: colors.text2, cursor: 'pointer' }}>
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> المحاسب موافق يوصله التقرير على الواتساب
          </label>
        )}
      </div>

      {/* 2) وش يوصله */}
      <div style={box}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>٢. وش يوصله</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
          {ACC_SECTIONS.map(s => {
            const on = form.sections.includes(s.key)
            return (
              <label key={s.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${on ? colors.primary : colors.border}`, background: on ? colors.primaryLight : colors.surface }}>
                <input type="checkbox" checked={on} onChange={() => set('sections', toggle(form.sections, s.key))} style={{ marginTop: 3 }} />
                <span><span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: colors.text }}>{s.label}</span><span style={{ fontSize: 11.5, color: colors.text4 }}>{s.hint}</span></span>
              </label>
            )
          })}
        </div>
        {form.sections.includes('vat') && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12.5, color: colors.text2, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.vat_registered} onChange={e => set('vat_registered', e.target.checked)} /> منشأتي مسجلة في ضريبة القيمة المضافة
          </label>
        )}
        {branches.length > 1 && (
          <div style={{ marginTop: 12 }}>
            <label style={label}>الفرع</label>
            <select value={form.branch_id} onChange={e => set('branch_id', e.target.value)} style={{ ...inp(), maxWidth: 260 }}>
              <option value="">كل الفروع</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* 3) متى */}
      <div style={box}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>٣. متى يوصله</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {FREQ.map(f => <button key={f.key} onClick={() => set('frequency', f.key)} style={chip(form.frequency === f.key)}>{f.label}</button>)}
        </div>
        {form.frequency === 'weekly' && (
          <div style={{ marginTop: 12 }}>
            <label style={label}>يوم الإرسال</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {WEEKDAYS.map((d, i) => <button key={i} onClick={() => set('weekday', i)} style={{ ...chip(form.weekday === i), padding: '6px 12px', fontSize: 12.5 }}>{d}</button>)}
            </div>
          </div>
        )}
        {form.frequency === 'monthly' && (
          <div style={{ marginTop: 12 }}>
            <label style={label}>تاريخ الإرسال كل شهر</label>
            <select value={form.month_day} onChange={e => set('month_day', Number(e.target.value))} style={{ ...inp(), maxWidth: 200 }}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>يوم {d}</option>)}
            </select>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <label style={label}>ساعة الإرسال</label>
          <select value={form.send_hour} onChange={e => set('send_hour', Number(e.target.value))} style={{ ...inp(), maxWidth: 200 }}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 12, color: colors.text4, marginTop: 10, lineHeight: 1.7 }}>
          {form.frequency === 'daily' && `كل يوم الساعة ${hourLabel(form.send_hour)}، عن اليوم اللي قبله. الرواتب ما تطلع باليومي.`}
          {form.frequency === 'weekly' && `كل ${WEEKDAYS[form.weekday]} الساعة ${hourLabel(form.send_hour)}، عن الأسبوع اللي قبله. الرواتب ما تطلع بالأسبوعي.`}
          {form.frequency === 'monthly' && `يوم ${form.month_day} من كل شهر الساعة ${hourLabel(form.send_hour)}، عن الشهر اللي فات كامل.`}
        </div>
        {saved && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12.5, color: colors.text2, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} /> الربط شغّال
          </label>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 16 }}>
        <button onClick={save} disabled={!!busy || !dirty} style={{ ...btnPrimary, padding: '11px 22px', opacity: !dirty ? .6 : 1 }}>{busy === 'save' ? 'جاري الحفظ...' : saved ? 'حفظ التعديلات' : 'حفظ وتفعيل الربط'}</button>
        {saved && <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' as const }}>
          <select value={nowPeriod} onChange={e => setNowPeriod(e.target.value as ManualPeriodKey)} disabled={!!busy || dirty} style={{ ...inp(), width: 'auto', padding: '10px 12px', fontSize: 13 }}>
            {NOW_PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <button onClick={test} disabled={!!busy || dirty} title={dirty ? 'احفظ التعديلات أول' : ''} style={{ ...btnSecondary, padding: '11px 18px', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: dirty ? .6 : 1 }}>
            <Send size={15} /> {busy === 'test' ? 'جاري الإرسال...' : 'أرسل الحين'}</button>
        </span>}
        {saved && <button onClick={remove} disabled={!!busy} style={{ ...btnSecondary, padding: '11px 18px', color: colors.danger, display: 'inline-flex', alignItems: 'center', gap: 6, marginInlineStart: 'auto' }}>
          <Trash2 size={15} /> إيقاف الربط</button>}
      </div>

      {reports.length > 0 && (
        <div style={box}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>آخر التقارير المرسلة</div>
          {reports.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 12.5, flexWrap: 'wrap' as const }}>
              <span style={{ fontWeight: 700, color: colors.text, minWidth: 150 }}>{periodLabel({ start: r.period_start, end: r.period_end })}{r.is_test && <span style={{ color: colors.text4, fontWeight: 500 }}> (إرسال يدوي)</span>}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: colors.text3 }}><Mail size={13} /> {status(r.email_status)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: colors.text3 }}><MessageCircle size={13} /> {status(r.whatsapp_status)}</span>
              <span style={{ marginInlineStart: 'auto', color: colors.text4 }} dir="ltr">{new Date(r.created_at).toLocaleDateString('en-GB')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
