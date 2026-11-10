'use client'
import { useEffect, useState } from 'react'
import { Loader2, UserPlus, Trash2, Users, X, Mail, Bell, ShieldCheck, Check } from 'lucide-react'
import { colors, font, radius } from '@/lib/ds'
import { PortalShell, OrgLogo } from '@/components/accountant/PortalShell'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'

// «فريق المكتب»: المحاسب يضيف موظفيه مع المنشآت اللي يشتغلون عليها (منشأة وحدة على الأقل)
// الموظف يرى نفس أقسام المحاسب على المنشأة، والمنشأة يصلها إشعار وتقدر تشيله
type Member = { email: string; name: string | null; orgs: string[]; last_view_at: string | null }
type Client = { org_id: string; name: string; branch: string | null; sections: string[] }
type Pending = { name: string | null; email: string; orgs: Client[]; isNew: boolean }

const orgsLabel = (n: number) => n === 1 ? 'منشأة واحدة' : n === 2 ? 'منشأتان' : `${n} ${n <= 10 ? 'منشآت' : 'منشأة'}`

export default function PortalTeamPage() {
  const [data, setData] = useState<{ lead: boolean; members: Member[]; clients: Client[] } | null>(null)
  const [form, setForm] = useState<{ name: string; email: string; orgs: string[] }>({ name: '', email: '', orgs: [] })
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(''), [err, setErr] = useState('')
  const load = () => fetch('/api/accountant-portal/team').then(r => r.json()).then(j => j.success ? setData(j) : setErr(j.error || 'تعذر التحميل')).catch(() => setErr('تأكد من الإنترنت'))
  useEffect(() => { load() }, [])
  const post = (b: any) => fetch('/api/accountant-portal/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
  const clientOf = (id: string) => data?.clients.find(c => c.org_id === id)

  // ١) مراجعة قبل الإضافة
  function review() {
    setErr('')
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setErr('اكتب البريد الإلكتروني للموظف')
    if (!form.orgs.length) return setErr('اختر منشأة واحدة على الأقل يعمل عليها الموظف')
    setPending({ name: form.name.trim() || null, email: form.email.trim(), orgs: form.orgs.map(clientOf).filter(Boolean) as Client[], isNew: true })
  }
  // ٢) التنفيذ بعد التأكيد (إضافة موظف جديد، أو إسناد منشأة لموظف موجود)
  async function confirmPending() {
    if (!pending) return
    setBusy('confirm')
    const j = pending.isNew
      ? await post({ action: 'add', name: pending.name, email: pending.email, org_ids: pending.orgs.map(o => o.org_id) })
      : await post({ action: 'assign', email: pending.email, org_id: pending.orgs[0].org_id, on: true })
    setBusy('')
    if (!j.success) { toast(j.error || 'تعذر الحفظ', 'error'); return }
    if (j.errors?.length) toast(j.errors[0], 'warning')
    toast(pending.isNew ? `أُضيف ${pending.name || pending.email}، وأُرسل إليه بريد الدخول` : `أُسندت ${pending.orgs[0].name} إلى ${pending.name || pending.email}`)
    if (pending.isNew) setForm({ name: '', email: '', orgs: [] })
    setPending(null); load()
  }
  async function toggle(m: Member, c: Client) {
    if (!m.orgs.includes(c.org_id)) { setPending({ name: m.name, email: m.email, orgs: [c], isNew: false }); return }
    if (!(await confirmDialog({ title: `إلغاء إسناد ${c.name}؟`, message: `لن يتمكن ${m.name || m.email} بعد ذلك من الاطلاع على بيانات ${c.name}.`, confirmText: 'إلغاء الإسناد', type: 'warning' }))) return
    setBusy(m.email + c.org_id)
    const j = await post({ action: 'assign', email: m.email, org_id: c.org_id, on: false }); setBusy('')
    if (!j.success) toast(j.error || 'تعذر الحفظ', 'error'); else toast(`أُلغي إسناد ${c.name}`)
    load()
  }
  async function remove(m: Member) {
    if (!(await confirmDialog({ title: `إزالة ${m.name || m.email} من الفريق؟`, message: m.orgs.length ? `سيُسحب إذنه على ${orgsLabel(m.orgs.length)} فوراً.` : 'لا توجد منشآت مسندة إليه.', confirmText: 'إزالة', type: 'danger' }))) return
    setBusy('rm' + m.email)
    await fetch(`/api/accountant-portal/team?email=${encodeURIComponent(m.email)}`, { method: 'DELETE' }).catch(() => {})
    setBusy(''); toast('أُزيل الموظف من الفريق'); load()
  }

  const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 10, border: `1px solid ${colors.border}`, fontSize: 16, fontFamily: font.family, background: '#fff', minWidth: 0, boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: colors.text3, marginBottom: 6 }
  const chip = (on: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px', borderRadius: 99, cursor: 'pointer', fontFamily: font.family, fontSize: 13, fontWeight: on ? 600 : 500,
    border: `1px solid ${on ? colors.primary : colors.border}`, background: on ? colors.primary : '#fff', color: on ? '#fff' : colors.text })

  return (
    <PortalShell title="فريق المكتب" subtitle="أضف موظفي مكتبك وحدد المنشآت التي يعمل عليها كل موظف">
      {data && !data.lead ? (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: '36px 20px', textAlign: 'center', fontSize: 14, color: colors.text3, lineHeight: 1.8 }}>
          إدارة فريق المكتب متاحة للمحاسب الذي دعته المنشأة مباشرة فقط.
        </div>
      ) : <>
        {/* كيف يعمل */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 10, marginBottom: 16 }}>
          {[[UserPlus, 'أضف الموظف واختر منشآته', 'منشأة واحدة على الأقل — لا يُضاف موظف بلا عمل'],
            [Mail, 'يصله بريد الدخول', 'ويدخل برمز يصل إلى بريده، دون كلمة مرور'],
            [ShieldCheck, 'يرى ما تراه أنت فقط', 'نفس الأقسام المتاحة لك، وللمنشآت المسندة إليه فقط']].map(([Icon, t, d]: any, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: colors.bg, color: colors.text3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={16} /></span>
              <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{i + 1}. {t}</div><div style={{ fontSize: 12, color: colors.text3, marginTop: 2, lineHeight: 1.6 }}>{d}</div></div>
            </div>
          ))}
        </div>

        <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: 16, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>إضافة موظف</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 10 }}>
            <div><label style={lbl} htmlFor="tm-name">اسم الموظف</label><input id="tm-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: أحمد" style={{ ...inp, width: '100%' }} /></div>
            <div><label style={lbl} htmlFor="tm-email">البريد الإلكتروني</label><input id="tm-email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@office.sa" dir="ltr" type="email" style={{ ...inp, width: '100%' }} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={lbl}>المنشآت التي سيعمل عليها <span style={{ color: '#B42318' }}>*</span></div>
            {!data ? <Loader2 size={18} className="spin" color={colors.text3} /> : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {data.clients.map(c => {
                  const on = form.orgs.includes(c.org_id)
                  return <button key={c.org_id} type="button" aria-pressed={on} onClick={() => setForm(f => ({ ...f, orgs: on ? f.orgs.filter(x => x !== c.org_id) : [...f.orgs, c.org_id] }))} style={chip(on)}>
                    <OrgLogo name={c.name} size={22} />{c.name}{c.branch ? ` · ${c.branch}` : ''}{on && <Check size={14} />}</button>
                })}
              </div>
            )}
          </div>
          {err && <div style={{ marginTop: 10, fontSize: 13, color: '#B42318' }}>{err}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button onClick={review} className="ap-btn pri" disabled={!data}><UserPlus size={16} />مراجعة وإضافة</button>
          </div>
        </section>

        {!data ? <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 size={24} className="spin" color={colors.primary} /></div>
          : !data.members.length ? (
            <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: '36px 20px', textAlign: 'center' }}>
              <Users size={28} color={colors.text3} />
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>لا يوجد موظفون في فريقك بعد</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '4px 0 0' }}>الفريق ({data.members.length})</h2>
              {data.members.map(m => (
                <section key={m.email} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl }}>
                  <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${colors.border}` }}>
                    <span style={{ width: 36, height: 36, borderRadius: 99, background: colors.bg, border: `1px solid ${colors.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{(m.name || m.email).trim()[0].toUpperCase()}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600 }}>{m.name || m.email}</div>
                      <div style={{ fontSize: 12, color: colors.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.name && <><bdi dir="ltr">{m.email}</bdi>{' · '}</>}{m.orgs.length ? orgsLabel(m.orgs.length) : 'لم تُسند إليه منشآت'}
                      </div>
                    </div>
                    <button onClick={() => remove(m)} disabled={busy === 'rm' + m.email} aria-label={`إزالة ${m.name || m.email}`} title="إزالة من الفريق"
                      style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 9, padding: 8, cursor: 'pointer', color: colors.text3, display: 'inline-flex' }}><Trash2 size={15} /></button>
                  </header>
                  <div style={{ padding: '12px 16px' }}>
                    {!m.orgs.length && <div style={{ fontSize: 12.5, color: '#B54708', background: '#FFFAEB', borderRadius: 10, padding: '8px 12px', marginBottom: 10, lineHeight: 1.7 }}>
                      لا يستطيع الدخول حتى تسند إليه منشأة واحدة على الأقل.</div>}
                    <div style={{ fontSize: 12.5, color: colors.text3, marginBottom: 8 }}>المنشآت التي يعمل عليها — اضغط للإسناد أو الإلغاء</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {data.clients.map(c => {
                        const on = m.orgs.includes(c.org_id)
                        return <button key={c.org_id} onClick={() => toggle(m, c)} disabled={busy === m.email + c.org_id} aria-pressed={on} style={chip(on)}>
                          <OrgLogo name={c.name} size={22} />{c.name}{c.branch ? ` · ${c.branch}` : ''}{on && <Check size={14} />}</button>
                      })}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
      </>}

      {pending && <AssignConfirm p={pending} busy={busy === 'confirm'} onCancel={() => setPending(null)} onConfirm={confirmPending} />}
    </PortalShell>
  )
}

// نافذة التأكيد: مين، أي منشآت، وش بيشوف، ووش بيصير بعدها
function AssignConfirm({ p, busy, onCancel, onConfirm }: { p: Pending; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [busy, onCancel])
  const who = p.name || p.email
  const steps: [any, string][] = [
    ...(p.isNew ? [[Mail, `يصل إلى ${p.email} بريد الدخول، ويدخل برمز يصله دون كلمة مرور`] as [any, string]] : []),
    [Bell, p.orgs.length === 1 ? `يصل إلى ${p.orgs[0].name} إشعار باسم الموظف، ويستطيع مالكها إزالته في أي وقت` : 'يصل إلى كل منشأة إشعار باسم الموظف، ويستطيع مالكها إزالته في أي وقت'],
    [ShieldCheck, 'يرى البيانات للمراجعة وفق الأقسام أعلاه فقط، وتستطيع إلغاء الإسناد أو إزالته متى شئت'],
  ]
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ac-title" style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: font.family }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.45)' }} onClick={() => !busy && onCancel()} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,.25)' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ flex: 1 }}>
            <div id="ac-title" style={{ fontSize: 16, fontWeight: 700 }}>{p.isNew ? 'تأكيد إضافة موظف' : 'تأكيد إسناد منشأة'}</div>
            <div style={{ fontSize: 12.5, color: colors.text3, marginTop: 2 }}>راجع التفاصيل قبل التأكيد</div>
          </div>
          <button onClick={onCancel} aria-label="إغلاق" style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text3, padding: 4 }}><X size={20} /></button>
        </header>
        <div style={{ padding: '16px 20px', display: 'grid', gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: colors.text3, marginBottom: 4 }}>الموظف</div>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>{who}{p.name && <span style={{ fontWeight: 400, color: colors.text3 }}> · <bdi dir="ltr">{p.email}</bdi></span>}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: colors.text3, marginBottom: 6 }}>{p.orgs.length === 1 ? 'المنشأة وما سيطّلع عليه' : `المنشآت (${p.orgs.length}) وما سيطّلع عليه في كل منها`}</div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12 }}>
              {p.orgs.map((o, i) => (
                <div key={o.org_id} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderTop: i ? `1px solid ${colors.border}` : 'none' }}>
                  <OrgLogo name={o.name} size={28} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{o.name}{o.branch ? ` · ${o.branch}` : ''}</div>
                    <div style={{ fontSize: 12.5, color: colors.text3, marginTop: 2, lineHeight: 1.6 }}>{o.sections.join('، ') || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: colors.text3, marginBottom: 6 }}>بعد التأكيد</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {steps.map(([Icon, t], i) => <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.6 }}><Icon size={16} color={colors.text3} style={{ flexShrink: 0, marginTop: 2 }} />{t}</div>)}
            </div>
          </div>
        </div>
        <footer style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: `1px solid ${colors.border}` }}>
          <button onClick={onCancel} className="ap-btn sec" disabled={busy}>إلغاء</button>
          <button onClick={onConfirm} className="ap-btn pri" disabled={busy}>{busy ? 'جاري الحفظ...' : p.isNew ? 'تأكيد الإضافة' : 'تأكيد الإسناد'}</button>
        </footer>
      </div>
    </div>
  )
}
