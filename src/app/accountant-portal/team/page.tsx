'use client'
import { useEffect, useState } from 'react'
import { Loader2, UserPlus, Trash2, Users } from 'lucide-react'
import { colors, font, radius } from '@/lib/ds'
import { PortalShell, OrgLogo } from '@/components/accountant/PortalShell'

// «فريق المكتب»: المحاسب يضيف موظفيه ويحدد لكل موظف العملاء اللي يشتغل عليهم
// الموظف يرى نفس أقسام المحاسب على المنشأة، والمالك يوصله إشعار ويقدر يشيله
type Member = { email: string; name: string | null; orgs: string[]; last_view_at: string | null }
type Client = { org_id: string; name: string; branch: string | null }

export default function PortalTeamPage() {
  const [data, setData] = useState<{ lead: boolean; members: Member[]; clients: Client[] } | null>(null)
  const [form, setForm] = useState({ name: '', email: '' })
  const [busy, setBusy] = useState(''), [err, setErr] = useState('')
  const load = () => fetch('/api/accountant-portal/team').then(r => r.json()).then(j => j.success ? setData(j) : setErr(j.error || 'تعذر التحميل')).catch(() => setErr('تأكد من الإنترنت'))
  useEffect(() => { load() }, [])
  const post = (b: any) => fetch('/api/accountant-portal/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))

  async function add() {
    setBusy('add'); setErr('')
    const j = await post({ action: 'add', ...form }); setBusy('')
    if (!j.success) return setErr(j.error || 'تعذر الإضافة')
    setForm({ name: '', email: '' }); load()
  }
  async function assign(m: Member, c: Client) {
    const on = !m.orgs.includes(c.org_id)
    if (on && !window.confirm(`سيطّلع ${m.name || m.email} على بيانات ${c.name} بنفس الأقسام المتاحة لك، ويصل إلى المنشأة إشعار بذلك. متابعة؟`)) return
    setBusy(m.email + c.org_id); setErr('')
    // تحديث فوري في الشاشة، ونرجعه لو فشل
    setData(d => d && { ...d, members: d.members.map(x => x.email === m.email ? { ...x, orgs: on ? [...x.orgs, c.org_id] : x.orgs.filter(o => o !== c.org_id) } : x) })
    const j = await post({ action: 'assign', email: m.email, org_id: c.org_id, on }); setBusy('')
    if (!j.success) { setErr(j.error || 'تعذر الحفظ'); load() }
  }
  async function remove(m: Member) {
    if (!window.confirm(`إزالة ${m.name || m.email} من فريقك؟ سيُسحب إذنه على كل المنشآت المسندة إليه.`)) return
    setBusy('rm' + m.email)
    await fetch(`/api/accountant-portal/team?email=${encodeURIComponent(m.email)}`, { method: 'DELETE' }).catch(() => {})
    setBusy(''); load()
  }

  const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 10, border: `1px solid ${colors.border}`, fontSize: 16, fontFamily: font.family, background: '#fff', minWidth: 0, boxSizing: 'border-box' }
  return (
    <PortalShell title="فريق المكتب" subtitle="أضف موظفي مكتبك وحدد العملاء الذين يعمل عليهم كل موظف">
      {data && !data.lead ? (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: '36px 20px', textAlign: 'center', fontSize: 14, color: colors.text3, lineHeight: 1.8 }}>
          إدارة فريق المكتب متاحة للمحاسب الذي دعته المنشأة مباشرة فقط.
        </div>
      ) : <>
      <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>إضافة موظف</h2>
        <p style={{ fontSize: 12.5, color: colors.text3, margin: '0 0 12px', lineHeight: 1.6 }}>لا يستطيع الموظف الدخول حتى تسند إليه منشأة، وعندها يصله بريد الدخول وتُبلَّغ المنشأة. يرى فقط المنشآت التي تسندها إليه.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم الموظف" aria-label="اسم الموظف" style={{ ...inp, flex: '1 1 160px' }} />
          <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@office.sa" dir="ltr" type="email" aria-label="البريد الإلكتروني" style={{ ...inp, flex: '2 1 220px' }}
            onKeyDown={e => e.key === 'Enter' && form.email && add()} />
          <button onClick={add} disabled={busy === 'add' || !form.email} className="ap-btn pri" style={{ opacity: !form.email ? .6 : 1 }}><UserPlus size={16} />{busy === 'add' ? 'جاري الإضافة...' : 'إضافة'}</button>
        </div>
        {err && <div style={{ marginTop: 10, fontSize: 13, color: '#B42318' }}>{err}</div>}
      </section>

      {!data ? <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 size={24} className="spin" color={colors.primary} /></div>
        : !data.members.length ? (
          <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: '36px 20px', textAlign: 'center' }}>
            <Users size={28} color={colors.text3} />
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>لا يوجد موظفون في فريقك بعد</div>
            <div style={{ fontSize: 13, color: colors.text3, marginTop: 4, lineHeight: 1.7 }}>أضف موظفاً بالأعلى، ثم اختر المنشآت التي يعمل عليها</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {data.members.map(m => (
              <section key={m.email} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl }}>
                <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${colors.border}` }}>
                  <span style={{ width: 36, height: 36, borderRadius: 99, background: colors.bg, border: `1px solid ${colors.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{(m.name || m.email).trim()[0].toUpperCase()}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{m.name || m.email}</div>
                    <div style={{ fontSize: 12, color: colors.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.name && <><bdi dir="ltr">{m.email}</bdi>{' · '}</>}{m.orgs.length ? `${m.orgs.length} ${m.orgs.length === 1 ? 'منشأة' : m.orgs.length === 2 ? 'منشأتان' : 'منشآت'}` : 'لم تُسند إليه منشآت'}
                    </div>
                  </div>
                  <button onClick={() => remove(m)} disabled={busy === 'rm' + m.email} aria-label={`إزالة ${m.name || m.email}`} title="إزالة من الفريق"
                    style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 9, padding: 8, cursor: 'pointer', color: colors.text3, display: 'inline-flex' }}><Trash2 size={15} /></button>
                </header>
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 12.5, color: colors.text3, marginBottom: 8 }}>المنشآت التي يعمل عليها</div>
                  {!data.clients.length ? <div style={{ fontSize: 13, color: colors.text3 }}>لا توجد لديك منشآت يمكن إسنادها</div> : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {data.clients.map(c => {
                        const on = m.orgs.includes(c.org_id)
                        return (
                          <button key={c.org_id} onClick={() => assign(m, c)} disabled={busy === m.email + c.org_id} aria-pressed={on}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px', borderRadius: 99, cursor: 'pointer', fontFamily: font.family, fontSize: 13, fontWeight: on ? 600 : 500,
                              border: `1px solid ${on ? colors.primary : colors.border}`, background: on ? colors.primary : '#fff', color: on ? '#fff' : colors.text }}>
                            <OrgLogo name={c.name} size={22} />{c.name}{c.branch ? ` · ${c.branch}` : ''}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </>}
    </PortalShell>
  )
}
