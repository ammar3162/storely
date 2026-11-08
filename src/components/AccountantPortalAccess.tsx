'use client'
import DateField from '@/components/DateField'
import { useEffect, useState } from 'react'
import { UserPlus, Trash2, ShieldCheck, Clock, Send, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api-client'
import { colors, radius, font, inp, btnPrimary, btnSecondary } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { ACC_SECTIONS, type AccSection } from '@/lib/accountantSections'
import { groupLogs, timesAr } from '@/lib/accountantActivity'

// بوابة المحاسب (جهة المالك): يدعو محاسبه، يحدد الأقسام المتاحة، ويسحب الإذن متى ما بغى
const DEFAULT: AccSection[] = ['sales', 'purchases', 'vat', 'payables', 'expenses', 'cash_diff']
const box: React.CSSProperties = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 16, marginBottom: 12 }
const chip = (on: boolean): React.CSSProperties => ({ padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font.family,
  border: `1px solid ${on ? colors.primary : colors.border}`, background: on ? colors.primary : colors.surface, color: on ? '#fff' : colors.text3 })
const todaySA = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)
const fmtD = (d: string) => d && !isNaN(Date.parse(d)) ? new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short' }) : d
const ago = (iso: string) => {
  if (!iso || isNaN(Date.parse(iso))) return ''
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000)
  return m < 60 ? `قبل ${Math.max(1, m)} دقيقة` : m < 1440 ? `قبل ${Math.round(m / 60)} ساعة` : `قبل ${Math.round(m / 1440)} يوم`
}

export default function AccountantPortalAccess({ orgId, onChange }: { orgId: string; onChange?: () => void }) {
  const [list, setList] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [allLogs, setAllLogs] = useState(false)
  const [branches, setBranches] = useState<any[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', sections: DEFAULT, branch_id: '', vat_registered: true, expires_on: '' })
  const [busy, setBusy] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

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
    toast(j.email_sent ? 'تم إرسال الدعوة — يتفعّل الربط فور ضغط المحاسب على «قبول الدعوة» في بريده الإلكتروني' : 'تم حفظ الدعوة، لكن البريد الإلكتروني لم يصل — تأكد من العنوان', j.email_sent ? 'success' : 'warning')
    setAdding(false); setForm({ name: '', email: '', sections: DEFAULT, branch_id: '', vat_registered: true, expires_on: '' })
    load()
  }
  async function resend(a: any) {
    setBusy(true)
    const j = await api.post('/api/accountant-access', { org_id: orgId, action: 'resend', id: a.id })
    setBusy(false)
    if (!j.success) { toast(j.error || 'تعذر الإرسال', 'error'); return }
    toast(j.email_sent ? 'أرسلنا الدعوة مرة ثانية' : 'الإيميل ما وصل — تأكد من العنوان', j.email_sent ? 'success' : 'warning')
    load()
  }
  async function toggleSection(a: any, s: AccSection) {
    const next = a.sections.includes(s) ? a.sections.filter((x: string) => x !== s) : [...a.sections, s]
    if (!next.length) { toast('يجب أن يبقى قسم واحد على الأقل', 'warning'); return }
    setList(prev => prev.map(x => x.id === a.id ? { ...x, sections: next } : x))
    const j = await api.patch('/api/accountant-access', { org_id: orgId, id: a.id, sections: next })
    if (!j.success) { toast(j.error || 'تعذر الحفظ', 'error'); load() }
  }
  async function setExpiry(a: any, value: string) {
    const j = await api.patch('/api/accountant-access', { org_id: orgId, id: a.id, expires_on: value || null })
    if (!j.success) { toast(j.error || 'تعذر الحفظ', 'error'); return }
    setList(prev => prev.map(x => x.id === a.id ? { ...x, expires_on: value || null } : x))
    toast(value ? `الإذن حتى ${value}` : 'الإذن بدون نهاية')
  }
  async function revoke(a: any) {
    if (!(await confirmDialog({ title: 'سحب إذن المحاسب؟', message: `${a.name || a.email} لن يتمكن بعد ذلك من الاطلاع على بيانات منشأتك.`, confirmText: 'سحب الإذن', type: 'danger' }))) return
    const j = await api.del('/api/accountant-access', { org_id: orgId, id: a.id })
    if (!j.success) { toast(j.error || 'تعذر الحذف', 'error'); return }
    toast('تم سحب الإذن'); load()
  }

  const statusOf = (a: any) => {
    const expired = !!a.expires_on && todaySA() > a.expires_on
    return expired ? { t: 'انتهى الإذن', bg: '#fef2f2', c: '#b91c1c' } : a.status === 'active' ? { t: 'مفعّل', bg: '#ecfdf5', c: '#047857' } : { t: 'بانتظار القبول', bg: '#fffbeb', c: '#b45309' }
  }
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: colors.text3, marginBottom: 6 }
  const groups = groupLogs(logs)

  return (
    <div>
      {/* رأس القسم */}
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <ShieldCheck size={18} color={colors.text} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: colors.text }}>المحاسبون وصلاحياتهم</div>
            <div style={{ fontSize: 12.5, color: colors.text3, lineHeight: 1.7, marginTop: 2 }}>
              يطّلع المحاسب على بيانات منشأتك للقراءة فقط ويحمّلها بصيغة إكسل، ويمكنك سحب الإذن في أي وقت. الخدمة مجانية.
            </div>
          </div>
        </div>
      </div>

      {/* قائمة المحاسبين */}
      {list.map(a => {
        const isOpen = openId === a.id, st = statusOf(a)
        return (
        <div key={a.id} style={{ ...box, padding: 0, overflow: 'hidden' }}>
          <button type="button" onClick={() => setOpenId(isOpen ? null : a.id)} aria-expanded={isOpen}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, textAlign: 'right' as const }}>
            <span style={{ width: 34, height: 34, borderRadius: 99, background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text, fontSize: 13.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{((a.name || a.email || '؟').trim()[0] || '؟').toUpperCase()}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{a.name || a.email}</span>
              <span style={{ display: 'block', fontSize: 12, color: colors.text3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                {a.sections.length} {a.sections.length === 1 ? 'قسم' : a.sections.length === 2 ? 'قسمان' : 'أقسام'} · {a.status !== 'active' ? `الدعوة ${ago(a.invited_at)}` : a.last_view_at ? `آخر دخول ${ago(a.last_view_at)}` : 'لم يدخل بعد'}
              </span>
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: st.bg, color: st.c, flexShrink: 0, whiteSpace: 'nowrap' as const }}>{st.t}</span>
            <ChevronDown size={18} color={colors.text3} style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          {isOpen && (
          <div style={{ padding: '14px 16px 16px', borderTop: `1px solid ${colors.border}`, display: 'grid', gap: 14 }}>
            {a.name && a.email && <div style={{ fontSize: 13, color: colors.text, textAlign: 'right' as const }}><span dir="ltr">{a.email}</span></div>}
            <div>
              <div style={label}>الأقسام المتاحة له</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {ACC_SECTIONS.map(s => <button key={s.key} onClick={() => toggleSection(a, s.key)} style={chip(a.sections.includes(s.key))}>{s.label}</button>)}
              </div>
            </div>
            <div>
              <div style={label}>مدة الإذن</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                <DateField value={a.expires_on || ''} min={todaySA()} onChange={v => setExpiry(a, v)} placeholder="بدون نهاية" ariaLabel="الإذن حتى" width={160} />
                {a.expires_on ? <button onClick={() => setExpiry(a, '')} style={{ fontSize: 12, fontWeight: 700, color: colors.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, padding: 0 }}>بدون نهاية</button>
                  : <span style={{ fontSize: 12, color: colors.text3 }}>اختر تاريخاً لينتهي الإذن تلقائياً</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
              {a.status !== 'active' && <button onClick={() => resend(a)} disabled={busy} style={{ ...btnSecondary, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}><Send size={14} /> إعادة إرسال الدعوة</button>}
              <button onClick={() => revoke(a)} style={{ padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: colors.danger, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, marginInlineStart: 'auto' }}><Trash2 size={14} /> سحب الإذن</button>
            </div>
          </div>
          )}
        </div>
        )
      })}

      {/* دعوة محاسب */}
      {adding ? (
        <div style={box}>
          <div style={{ fontSize: 14, fontWeight: 800, color: colors.text, marginBottom: 12 }}>دعوة محاسب</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
            <label><div style={label}>البريد الإلكتروني</div><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@example.com" type="email" dir="ltr" style={inp()} /></label>
            <label><div style={label}>الاسم (اختياري)</div><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم المحاسب" maxLength={80} style={inp()} /></label>
          </div>
          <div style={{ ...label, marginTop: 14 }}>الأقسام المتاحة له</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {ACC_SECTIONS.map(s => <button key={s.key} onClick={() => setForm(f => ({ ...f, sections: f.sections.includes(s.key) ? f.sections.filter(x => x !== s.key) : [...f.sections, s.key] }))} style={chip(form.sections.includes(s.key))}>{s.label}</button>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginTop: 14 }}>
            {branches.length > 1 && (
              <label><div style={label}>الفرع</div>
                <select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))} style={inp()}>
                  <option value="">كل الفروع</option>
                  {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            )}
            <div><div style={label}>الإذن حتى (اختياري)</div>
              <DateField value={form.expires_on} min={todaySA()} onChange={v => setForm(f => ({ ...f, expires_on: v }))} placeholder="بدون نهاية" ariaLabel="الإذن حتى" width={160} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: colors.text3, lineHeight: 1.7, marginTop: 12 }}>يصل المحاسب رابط «قبول الدعوة» على بريده، ويتفعّل الإذن فور قبوله.</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={invite} disabled={busy || !form.email || !form.sections.length} style={{ ...btnPrimary, padding: '10px 18px', opacity: busy || !form.email ? .6 : 1 }}>{busy ? 'جارٍ الإرسال...' : 'أرسل الدعوة'}</button>
            <button onClick={() => setAdding(false)} style={{ ...btnSecondary, padding: '10px 16px' }}>إلغاء</button>
          </div>
        </div>
      ) : list.length < 3 && (
        <button onClick={() => setAdding(true)} style={{ width: '100%', marginBottom: 12, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: colors.surface, border: `1.5px dashed ${colors.border}`, borderRadius: radius.lg, color: colors.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>
          <UserPlus size={16} /> {list.length ? 'دعوة محاسب آخر' : 'دعوة محاسب'}
        </button>
      )}

      {/* آخر نشاط: مطوي */}
      {groups.length > 0 && (
        <div style={{ ...box, padding: 0 }}>
          <button type="button" onClick={() => setAllLogs(v => !v)} aria-expanded={allLogs}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, textAlign: 'right' as const }}>
            <Clock size={18} color={colors.text} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: colors.text }}>آخر نشاط <span style={{ fontSize: 12, color: colors.text3, fontWeight: 600 }}>({groups.length})</span></span>
              <span style={{ display: 'block', fontSize: 12, color: colors.text3, marginTop: 2 }}>آخر عملية {ago(groups[0].created_at)}</span>
            </span>
            <ChevronDown size={18} color={colors.text3} style={{ flexShrink: 0, transform: allLogs ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          {allLogs && <div style={{ padding: '4px 16px 8px', borderTop: `1px solid ${colors.border}` }}>
            {groups.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 0', borderTop: i ? `1px solid ${colors.border}` : 'none' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: colors.text }}>{l.accountant_users?.name || l.accountant_users?.email} {l.action === 'download' ? 'حمّل ملفاً' : 'اطّلع على التقرير'}</span>
                  <span style={{ display: 'block', fontSize: 12, color: colors.text3, marginTop: 2 }}>فترة {fmtD(l.period_start)} – {fmtD(l.period_end)} · {ago(l.created_at)}</span>
                </span>
                {l.count > 1 && <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: colors.text2, background: colors.bg, borderRadius: 999, padding: '2px 8px' }}>{timesAr(l.count)}</span>}
              </div>
            ))}
          </div>}
        </div>
      )}
    </div>
  )
}
