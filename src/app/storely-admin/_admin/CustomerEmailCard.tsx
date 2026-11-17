'use client'
// مراسلة العميل بالإيميل من ملفه — رسالة شخصية (مو إعلان): من بريد الدعم، والعميل يقدر يرد عليها، وتنحفظ هنا
// ورسائل جاهزة حسب حالته (تذكير التجربة/التجديد، انتهاء الاشتراك، تأكيد، ترحيب، متابعة): ضغطة تعبّي العنوان والنص والزر، ويراجع ويرسل
import { useEffect, useState } from 'react'
import { Mail, ChevronDown, ChevronUp, CornerDownLeft, FileText, X } from 'lucide-react'
import { A, Btn, Card, Field, Notice, adminFetch, fmtDate, inputStyle } from './kit'
import { confirmDialog } from '@/components/ConfirmDialog'
import { customerEmailTemplates, EMAIL_BUTTONS, type CustomerEmailTemplate, type EmailButtonKey, type TemplateCustomer } from '@/lib/customerEmailTemplates'

export default function CustomerEmailCard({ orgId, orgName, customer }: { orgId: string; orgName: string; customer?: TemplateCustomer }) {
  const [info, setInfo] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [button, setButton] = useState<EmailButtonKey | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null)
  const [shown, setShown] = useState<number | null>(null)
  const load = () => adminFetch(`/api/admin/customer-email?org_id=${orgId}`).then(j => setInfo(j.success ? j : { sent: [] }))
  useEffect(() => { load() }, [orgId])   // eslint-disable-line react-hooks/exhaustive-deps

  const templates = customer ? customerEmailTemplates(customer) : []
  // رسالة جاهزة: تعبّي العنوان والنص والزر (ولو كتب رسالة بنفسه نسأله قبل نستبدلها)
  async function applyTemplate(t: CustomerEmailTemplate) {
    const typed = open && body.trim() && !templates.some(x => x.body === body)
    if (typed && !(await confirmDialog({ title: 'استبدال الرسالة الحالية؟', message: 'ستُستبدل الرسالة التي كتبتها بالرسالة الجاهزة.', confirmText: 'استبدال' }))) return
    setSubject(t.subject); setBody(t.body); setButton(t.button || null); setMsg(null); setOpen(true)
  }

  async function send() {
    if (!(await confirmDialog({ title: `إرسال الإيميل إلى ${orgName}؟`, message: `يصل إلى ${info?.email || 'بريد المالك'} باسم «فريق Storely»، وردّه يظهر هنا وفي «البريد الوارد».`, confirmText: 'إرسال', type: 'success' }))) return
    setBusy(true); setMsg(null)
    const j = await adminFetch('/api/admin/customer-email', { method: 'POST', body: { org_id: orgId, subject, body, button } })
    setBusy(false)
    if (!j.success) { setMsg({ t: j.error || 'تعذّر الإرسال', bad: true }); return }
    setMsg({ t: 'أُرسل الإيميل' }); setSubject(''); setBody(''); setButton(null); setOpen(false); load()
  }

  const sent: any[] = [...(info?.sent || []).map((m: any) => ({ ...m, in: false })), ...(info?.received || []).map((m: any) => ({ ...m, in: true, by: 'رد العميل' }))]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  return (
    <Card title="مراسلة بالإيميل" subtitle={info?.email ? `إلى ${info.email} — يصله باسم «فريق Storely» من support@storely.dev، والرد يرجع لنفس البريد` : 'رسالة شخصية لهذا العميل'}
      actions={info?.sendable && !open ? <Btn small kind="primary" onClick={() => setOpen(true)}><Mail size={14} /> إيميل جديد</Btn> : undefined}>
      {msg && <div style={{ marginBottom: 10 }}><Notice tone={msg.bad ? 'danger' : 'primary'}>{msg.t}</Notice></div>}
      {info && !info.sendable && <div style={{ fontSize:15, color: A.danger }}>لا يوجد بريد صالح لمالك هذه المنشأة</div>}
      {info?.sendable && templates.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: A.text3, marginBottom: 8 }}>رسائل جاهزة</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {templates.map(t => (
              <Btn key={t.id} small kind={t.suggested ? 'primary' : 'secondary'} onClick={() => applyTemplate(t)} title={t.suggested ? `مقترحة لحالته: ${t.subject}` : t.subject}>
                <FileText size={14} />{t.name}
              </Btn>
            ))}
          </div>
        </div>
      )}
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: sent.length ? 14 : 0 }}>
          <Field label="العنوان"><input style={inputStyle} value={subject} onChange={e => setSubject(e.target.value)} maxLength={150} placeholder="مثال: متابعة تفعيل حسابك" /></Field>
          <Field label="النص" hint="كل سطر فقرة. يُستبدل {الاسم} باسم المالك و{المنشأة} باسم منشأته">
            <textarea style={{ ...inputStyle, minHeight: 220, resize: 'vertical', lineHeight: 1.8 }} value={body} onChange={e => setBody(e.target.value)} maxLength={5000} placeholder={'مرحباً {الاسم}،\n...'} />
          </Field>
          {button && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, color: A.text3 }}>
              <span>في الإيميل زر «{EMAIL_BUTTONS[button].label}» يفتح صفحة {EMAIL_BUTTONS[button].path === '/renew' ? 'التجديد' : 'الدخول'}</span>
              <button onClick={() => setButton(null)} aria-label="إزالة الزر من الإيميل" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, color: A.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <X size={13} /> إزالة الزر
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn kind="primary" onClick={send} loading={busy} disabled={!subject.trim() || !body.trim()}>إرسال</Btn>
            <Btn onClick={() => setOpen(false)} disabled={busy}>إلغاء</Btn>
          </div>
        </div>
      )}
      {sent.length > 0 ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize:13, fontWeight: 600, color: A.text3 }}>المراسلات</div>
          {sent.map((m, i) => (
            <div key={i} style={{ border: `1px solid ${A.border}`, borderRadius:12, padding: '10px 12px', background: m.in ? A.bg : undefined }}>
              <button onClick={() => setShown(shown === i ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
                {m.in && <CornerDownLeft size={14} color={A.primary} />}
                <span style={{ flex: 1, fontSize:15, fontWeight: 600, color: A.text }}>{m.subject || 'بدون عنوان'}</span>
                <span style={{ fontSize:13, color: A.text3, whiteSpace: 'nowrap' }}>{m.by} · {fmtDate(m.at, true)}</span>
                {shown === i ? <ChevronUp size={14} color={A.text3} /> : <ChevronDown size={14} color={A.text3} />}
              </button>
              {shown === i && <div style={{ marginTop: 8, fontSize:15, color: A.text2, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{m.body}</div>}
            </div>
          ))}
        </div>
      ) : !open && info?.sendable ? <div style={{ fontSize:15, color: A.text3 }}>لم تُرسل له أي رسالة بعد</div> : null}
    </Card>
  )
}
