'use client'
import { useEffect, useState } from 'react'
import { UserPlus, Trash2, ShieldCheck, Clock, Send } from 'lucide-react'
import { api } from '@/lib/api-client'
import { colors, radius, font, inp, btnPrimary, btnSecondary } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { ACC_SECTIONS, type AccSection } from '@/lib/accountantExport'

// بوابة المحاسب (جهة المالك): يدعو محاسبه، يحدد وش يشوف، ويسحب الإذن متى ما بغى
const DEFAULT: AccSection[] = ['sales', 'purchases', 'vat', 'payables', 'expenses', 'cash_diff']
const box: React.CSSProperties = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 16, marginBottom: 12 }
const chip = (on: boolean): React.CSSProperties => ({ padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font.family,
  border: `1.5px solid ${on ? colors.primary : colors.border}`, background: on ? colors.primaryLight : colors.surface, color: on ? colors.primary : colors.text3 })
const todaySA = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)
const ago = (iso: string) => {
  if (!iso || isNaN(Date.parse(iso))) return ''
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000)
  return m < 60 ? `قبل ${Math.max(1, m)} دقيقة` : m < 1440 ? `قبل ${Math.round(m / 60)} ساعة` : `قبل ${Math.round(m / 1440)} يوم`
}

export default function AccountantPortalAccess({ orgId, onChange }: { orgId: string; onChange?: () => void }) {
  const [list, setList] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', sections: DEFAULT, branch_id: '', vat_registered: true, expires_on: '' })
  const [busy, setBusy] = useState(false)

  async function load() {
    const [j, b] = await Promise.all([api.get('/api/accountant-access', { org_id: orgId }), api.get('/api/branches', { org_id: orgId })])
    if (j.success) { setList(j.accountants || []); setLogs(j.logs || []) }
    onChange?.()
    setBranches((b.branches || []).filter((x: any) => x.is_active !== false))
  }
  useEffect(() => { if (orgId) load() }, [orgId])

  async function invite() {
    setBusy(true)
    const j = await api.post('/api/accountant-access', { org_id: orgId, ...form, branch_id: form.branch_id || null, expires_on: form.expires_on || null })
    setBusy(false)
    if (!j.success) { toast(j.error || 'تعذر إرسال الدعوة', 'error'); return }
    toast(j.email_sent ? '✅ أرسلنا الدعوة — يتفعل الربط أول ما المحاسب يضغط «قبول الدعوة» في إيميله' : 'انحفظت الدعوة، لكن الإيميل ما وصل — تأكد من العنوان', j.email_sent ? 'success' : 'warning')
    setAdding(false); setForm({ name: '', email: '', sections: DEFAULT, branch_id: '', vat_registered: true, expires_on: '' })
    load()
  }
  async function resend(a: any) {
    setBusy(true)
    const j = await api.post('/api/accountant-access', { org_id: orgId, action: 'resend', id: a.id })
    setBusy(false)
    if (!j.success) { toast(j.error || 'تعذر الإرسال', 'error'); return }
    toast(j.email_sent ? '✅ أرسلنا الدعوة مرة ثانية' : 'الإيميل ما وصل — تأكد من العنوان', j.email_sent ? 'success' : 'warning')
    load()
  }
  async function toggleSection(a: any, s: AccSection) {
    const next = a.sections.includes(s) ? a.sections.filter((x: string) => x !== s) : [...a.sections, s]
    if (!next.length) { toast('لازم يبقى قسم واحد على الأقل', 'warning'); return }
    setList(prev => prev.map(x => x.id === a.id ? { ...x, sections: next } : x))
    const j = await api.patch('/api/accountant-access', { org_id: orgId, id: a.id, sections: next })
    if (!j.success) { toast(j.error || 'تعذر الحفظ', 'error'); load() }
  }
  async function setExpiry(a: any, value: string) {
    const j = await api.patch('/api/accountant-access', { org_id: orgId, id: a.id, expires_on: value || null })
    if (!j.success) { toast(j.error || 'تعذر الحفظ', 'error'); return }
    setList(prev => prev.map(x => x.id === a.id ? { ...x, expires_on: value || null } : x))
    toast(value ? `✅ الإذن لين ${value}` : '✅ الإذن بدون نهاية')
  }
  async function revoke(a: any) {
    if (!(await confirmDialog({ title: 'سحب إذن المحاسب؟', message: `${a.name || a.email} ما عاد يقدر يشوف بيانات منشأتك.`, confirmText: 'سحب الإذن', type: 'danger' }))) return
    const j = await api.del('/api/accountant-access', { org_id: orgId, id: a.id })
    if (!j.success) { toast(j.error || 'تعذر الحذف', 'error'); return }
    toast('تم سحب الإذن'); load()
  }

  return (
    <div style={{ ...box, borderColor: colors.primaryBorder }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <ShieldCheck size={20} color={colors.primary} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>المحاسبين وصلاحياتهم</div>
          <div style={{ fontSize: 12.5, color: colors.text3, lineHeight: 1.7, marginTop: 2 }}>
            ادعُ محاسبك بإيميله — يوصله رابط «قبول الدعوة»، وأول ما يقبل يشوف بيانات منشأتك لأي فترة ويحمّلها إكسل. قراءة بس، وتسحب الإذن متى ما بغيت. مجانية.
          </div>
        </div>
      </div>

      {list.map(a => (
        <div key={a.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{a.name || a.email}</div>
              {a.name && <div style={{ fontSize: 12, color: colors.text4 }} dir="ltr">{a.email}</div>}
            </div>
            {(() => { const expired = !!a.expires_on && todaySA() > a.expires_on
              return <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: expired ? '#fef2f2' : a.status === 'active' ? '#ecfdf5' : '#fffbeb', color: expired ? '#b91c1c' : a.status === 'active' ? '#047857' : '#b45309' }}>
                {expired ? 'انتهى الإذن' : a.status === 'active' ? 'مفعّل' : 'بانتظار قبول المحاسب'}
              </span> })()}
            {a.status !== 'active' && <button onClick={() => resend(a)} disabled={busy} style={{ ...btnSecondary, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Send size={13} /> إعادة إرسال الدعوة</button>}
            <button onClick={() => revoke(a)} title="سحب الإذن" style={{ ...btnSecondary, padding: '6px 10px', color: colors.danger, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Trash2 size={13} /> سحب الإذن</button>
          </div>
          <div style={{ fontSize: 11.5, color: colors.text4, margin: '6px 0 8px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {a.status !== 'active' ? `أُرسلت الدعوة ${ago(a.invited_at)}` : a.last_view_at ? `آخر دخول ${ago(a.last_view_at)}` : 'قبل الدعوة — ما فتح التقارير للحين'}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              الإذن لين
              <input type="date" value={a.expires_on || ''} min={todaySA()} onChange={e => setExpiry(a, e.target.value)}
                style={{ fontSize: 11.5, padding: '2px 6px', border: `1px solid ${colors.border}`, borderRadius: 6, fontFamily: font.family }} />
              {a.expires_on ? <button onClick={() => setExpiry(a, '')} style={{ fontSize: 11, color: colors.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family }}>بدون نهاية</button> : <span>(بدون نهاية)</span>}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
            {ACC_SECTIONS.map(s => <button key={s.key} onClick={() => toggleSection(a, s.key)} style={chip(a.sections.includes(s.key))}>{s.label}</button>)}
          </div>
        </div>
      ))}

      {adding ? (
        <div style={{ border: `1.5px dashed ${colors.primaryBorder}`, borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8 }}>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم المحاسب (اختياري)" maxLength={80} style={inp()} />
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="إيميل المحاسب" type="email" dir="ltr" style={inp()} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.text2, margin: '10px 0 6px' }}>وش يشوف</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
            {ACC_SECTIONS.map(s => <button key={s.key} onClick={() => setForm(f => ({ ...f, sections: f.sections.includes(s.key) ? f.sections.filter(x => x !== s.key) : [...f.sections, s.key] }))} style={chip(form.sections.includes(s.key))}>{s.label}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'center', marginTop: 10 }}>
            {branches.length > 1 && (
              <select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))} style={{ ...inp(), width: 'auto' }}>
                <option value="">كل الفروع</option>
                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: colors.text2 }}>
              الإذن لين
              <input type="date" value={form.expires_on} min={todaySA()} onChange={e => setForm(f => ({ ...f, expires_on: e.target.value }))} style={{ ...inp(), width: 'auto', padding: '6px 8px' }} />
              <span style={{ color: colors.text4 }}>{form.expires_on ? '' : '(اختياري — فاضي = بدون نهاية)'}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: colors.text2, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.vat_registered} onChange={e => setForm(f => ({ ...f, vat_registered: e.target.checked }))} /> منشأتي مسجلة في الضريبة
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={invite} disabled={busy || !form.email || !form.sections.length} style={{ ...btnPrimary, padding: '10px 18px', opacity: busy || !form.email ? .6 : 1 }}>{busy ? 'جاري الإرسال...' : 'أرسل الدعوة'}</button>
            <button onClick={() => setAdding(false)} style={{ ...btnSecondary, padding: '10px 16px' }}>إلغاء</button>
          </div>
        </div>
      ) : list.length < 3 && (
        <button onClick={() => setAdding(true)} style={{ ...btnSecondary, padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}><UserPlus size={15} /> ادعُ محاسب</button>
      )}

      {logs.length > 0 && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${colors.border}`, paddingTop: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.text2, marginBottom: 6 }}>آخر نشاط</div>
          {logs.map((l, i) => (
            <div key={i} style={{ fontSize: 12, color: colors.text3, padding: '3px 0' }}>
              {l.accountant_users?.name || l.accountant_users?.email} {l.action === 'download' ? 'حمّل ملف' : 'شاف التقرير'} ({l.period_start} → {l.period_end}) · {ago(l.created_at)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
