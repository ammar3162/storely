'use client'
// مراسلة العميل بالإيميل من ملفه — رسالة شخصية (مو إعلان): من بريد الدعم، والعميل يقدر يرد عليها، وتنحفظ هنا
import { useEffect, useState } from 'react'
import { Mail, ChevronDown, ChevronUp, CornerDownLeft } from 'lucide-react'
import { A, Btn, Card, Field, Notice, adminFetch, fmtDate, inputStyle } from './kit'
import { confirmDialog } from '@/components/ConfirmDialog'

export default function CustomerEmailCard({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [info, setInfo] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null)
  const [shown, setShown] = useState<number | null>(null)
  const load = () => adminFetch(`/api/admin/customer-email?org_id=${orgId}`).then(j => setInfo(j.success ? j : { sent: [] }))
  useEffect(() => { load() }, [orgId])   // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!(await confirmDialog({ title: `إرسال الإيميل إلى ${orgName}؟`, message: `يصل إلى ${info?.email || 'بريد المالك'} باسم «فريق Storely»، وردّه يظهر هنا وفي «البريد الوارد».`, confirmText: 'إرسال', type: 'success' }))) return
    setBusy(true); setMsg(null)
    const j = await adminFetch('/api/admin/customer-email', { method: 'POST', body: { org_id: orgId, subject, body } })
    setBusy(false)
    if (!j.success) { setMsg({ t: j.error || 'تعذّر الإرسال', bad: true }); return }
    setMsg({ t: 'أُرسل الإيميل' }); setSubject(''); setBody(''); setOpen(false); load()
  }

  const sent: any[] = [...(info?.sent || []).map((m: any) => ({ ...m, in: false })), ...(info?.received || []).map((m: any) => ({ ...m, in: true, by: 'رد العميل' }))]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  return (
    <Card title="مراسلة بالإيميل" subtitle={info?.email ? `إلى ${info.email} — يصله باسم «فريق Storely» من support@storely.dev، والرد يرجع لنفس البريد` : 'رسالة شخصية لهذا العميل'}
      actions={info?.sendable && !open ? <Btn small kind="primary" onClick={() => setOpen(true)}><Mail size={14} /> إيميل جديد</Btn> : undefined}>
      {msg && <div style={{ marginBottom: 10 }}><Notice tone={msg.bad ? 'danger' : 'primary'}>{msg.t}</Notice></div>}
      {info && !info.sendable && <div style={{ fontSize: 13, color: A.danger }}>لا يوجد بريد صالح لمالك هذه المنشأة</div>}
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: sent.length ? 14 : 0 }}>
          <Field label="العنوان"><input style={inputStyle} value={subject} onChange={e => setSubject(e.target.value)} maxLength={150} placeholder="مثال: متابعة تفعيل حسابك" /></Field>
          <Field label="النص" hint="كل سطر فقرة. يُستبدل {الاسم} باسم المالك و{المنشأة} باسم منشأته">
            <textarea style={{ ...inputStyle, minHeight: 140, resize: 'vertical', lineHeight: 1.8 }} value={body} onChange={e => setBody(e.target.value)} maxLength={5000} placeholder={'مرحباً {الاسم}،\n...'} />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn kind="primary" onClick={send} loading={busy} disabled={!subject.trim() || !body.trim()}>إرسال</Btn>
            <Btn onClick={() => setOpen(false)} disabled={busy}>إلغاء</Btn>
          </div>
        </div>
      )}
      {sent.length > 0 ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: A.text3 }}>المراسلات</div>
          {sent.map((m, i) => (
            <div key={i} style={{ border: `1px solid ${A.border}`, borderRadius: 10, padding: '10px 12px', background: m.in ? A.bg : undefined }}>
              <button onClick={() => setShown(shown === i ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
                {m.in && <CornerDownLeft size={14} color={A.primary} />}
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: A.text }}>{m.subject || 'بدون عنوان'}</span>
                <span style={{ fontSize: 12, color: A.text3, whiteSpace: 'nowrap' }}>{m.by} · {fmtDate(m.at, true)}</span>
                {shown === i ? <ChevronUp size={14} color={A.text3} /> : <ChevronDown size={14} color={A.text3} />}
              </button>
              {shown === i && <div style={{ marginTop: 8, fontSize: 13, color: A.text2, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{m.body}</div>}
            </div>
          ))}
        </div>
      ) : !open && info?.sendable ? <div style={{ fontSize: 13, color: A.text3 }}>لم تُرسل له أي رسالة بعد</div> : null}
    </Card>
  )
}
