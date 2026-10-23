'use client'
import { useEffect, useRef, useState } from 'react'
import { Send, Eye, FlaskConical, FileText } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { A, Badge, Btn, Card, Field, Loading, Notice, PageHeader, Table, adminFetch, fmtDate, inputStyle, td } from '../_admin/kit'

// إعلانات الإيميل: تكتب الحملة، تشوف معاينة، ترسل تجربة لإيميلك، وبعدها ترسلها لفئة من العملاء
// كل إيميل فيه رابط إلغاء اشتراك، واللي يلغي ما يوصله إعلان مرة ثانية

const TEMPLATES: { name: string; subject: string; title: string; body: string; button_label: string; button_url: string }[] = [{
  name: 'إعلان: منيو لكل فرع',
  subject: 'منيو منفصل لكل فرع في Storely',
  title: 'صار لكل فرع منيو خاص فيه',
  body: [
    'هلا {الاسم}،',
    'أضفنا تحديث على المنيو الإلكتروني في Storely، ويفيد بالذات المنشآت اللي عندها أكثر من فرع.',
    'الحين كل فرع له منيو مستقل برابطه ورمز QR خاص فيه، وأصناف وأسعار وأوقات دوام تخصه. والأصناف المشتركة تضيفها مرة وحدة وتظهر في كل الفروع.',
    'وصار تعديل المنيو أسهل: تضغط على الصنف وتعدّله، ومفتاح واحد يخلّيه متوفر أو نفد، وترتّب الأصناف والأقسام بالسحب. وتقدر تضيف أصنافك مباشرة من الوصفات بأسعار بيعها.',
    'إذا ودك تفعّل المنيو لفروع {المنشأة} أو عندك أي سؤال، كلمنا على واتساب ونساعدك.',
  ].join('\n'),
  button_label: 'افتح المنيو الإلكتروني',
  button_url: 'https://www.storely.dev/online-store',
}]

const EMPTY = { subject: '', title: '', body: '', button_label: '', button_url: '' }

export default function EmailCampaignsPage() {
  const [info, setInfo] = useState<any>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [segment, setSegment] = useState('all')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null)
  const [html, setHtml] = useState('')
  const timer = useRef<any>(null)

  async function load() {
    const j = await adminFetch('/api/admin/email-campaigns')
    if (j.success) setInfo(j)
    else setMsg({ t: j.error === 'unauthorized' ? 'هالصفحة للمشرف الكامل أو لمن عنده صلاحية إرسال الإعلانات' : (j.error || 'تعذر التحميل'), bad: true })
  }
  useEffect(() => { load() }, [])

  // معاينة تلقائية بعد ما توقف عن الكتابة
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const j = await adminFetch('/api/admin/email-campaigns', { method: 'POST', body: { action: 'preview', ...form } })
      if (j.success) setHtml(j.html)
    }, 500)
    return () => clearTimeout(timer.current)
  }, [form])

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }))
  const count = info?.counts?.[segment] ?? 0

  async function test() {
    setBusy('test'); setMsg(null)
    const j = await adminFetch('/api/admin/email-campaigns', { method: 'POST', body: { action: 'test', ...form } })
    setBusy('')
    setMsg(j.success ? { t: `أرسلنا تجربة إلى ${j.to} — شيك على صندوق الوارد (والسبام)` } : { t: j.error || 'فشل إرسال التجربة', bad: true })
  }

  async function send() {
    if (!count) return
    if (!(await confirmDialog({
      title: `إرسال الحملة لـ ${count} عميل`,
      message: `بترسل «${form.subject}» لفئة «${info.segments[segment]}» (${count} إيميل).\n\nما يمكن التراجع بعد الإرسال. تأكد إنك أرسلت تجربة لإيميلك وشيكت عليها.`,
      confirmText: 'أرسل الحين', type: 'warning',
    }))) return
    setBusy('send'); setMsg(null)
    const j = await adminFetch('/api/admin/email-campaigns', { method: 'POST', body: { action: 'send', segment, expected: count, ...form } })
    setBusy('')
    if (!j.success) { setMsg({ t: j.error || 'فشل الإرسال', bad: true }); load(); return }
    setMsg({ t: `انرسلت لـ ${j.sent} عميل${j.failed ? ` (فشل ${j.failed})` : ''}` })
    setForm({ ...EMPTY }); load()
  }

  if (!info && !msg) return <Loading />

  return (
    <>
      <PageHeader title="إعلانات الإيميل" subtitle="أرسل إعلان أو تحديث لعملاء Storely — كل إيميل فيه رابط إلغاء اشتراك" />
      {msg && <div style={{ marginBottom: 14 }}><Notice tone={msg.bad ? 'danger' : 'primary'}>{msg.t}</Notice></div>}

      {info && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16, alignItems: 'start' }}>
          <Card title="حملة جديدة" actions={
            <div style={{ display: 'flex', gap: 6 }}>
              {TEMPLATES.map(t => <Btn key={t.name} small onClick={() => setForm({ subject: t.subject, title: t.title, body: t.body, button_label: t.button_label, button_url: t.button_url })}><FileText size={14} />{t.name}</Btn>)}
            </div>
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: A.text2, marginBottom: 6 }}>لمين ترسل؟</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(info.segments as Record<string, string>).map(([k, label]) => (
                    <button key={k} onClick={() => setSegment(k)} style={{ padding: '7px 12px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                      border: `1px solid ${segment === k ? A.primary : A.borderStrong}`, background: segment === k ? A.primarySoft : A.surface, color: segment === k ? A.primary : A.text2 }}>
                      {label} <span style={{ opacity: .7 }}>({info.counts[k]})</span>
                    </button>
                  ))}
                </div>
                {info.optouts > 0 && <div style={{ fontSize: 11.5, color: A.text3, marginTop: 6 }}>{info.optouts} ألغوا الاشتراك بالإعلانات وما يوصلهم شي</div>}
              </div>
              <Field label="عنوان الإيميل (يظهر في صندوق الوارد)"><input style={inputStyle} value={form.subject} onChange={set('subject')} maxLength={150} /></Field>
              <Field label="العنوان الرئيسي داخل الإيميل"><input style={inputStyle} value={form.title} onChange={set('title')} maxLength={150} /></Field>
              <Field label="النص" hint="كل سطر فقرة. {الاسم} يتبدل باسم العميل، و{المنشأة} باسم منشأته">
                <textarea style={{ ...inputStyle, minHeight: 200, resize: 'vertical', lineHeight: 1.8 }} value={form.body} onChange={set('body')} maxLength={5000} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10 }}>
                <Field label="نص الزر (اختياري)"><input style={inputStyle} value={form.button_label} onChange={set('button_label')} /></Field>
                <Field label="رابط الزر"><input style={inputStyle} value={form.button_url} onChange={set('button_url')} dir="ltr" placeholder="https://www.storely.dev/..." /></Field>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: `1px solid ${A.border}`, paddingTop: 14 }}>
                <Btn onClick={test} loading={busy === 'test'} disabled={!!busy}><FlaskConical size={15} />أرسل تجربة لإيميلي</Btn>
                <Btn kind="primary" onClick={send} loading={busy === 'send'} disabled={!!busy || !count}><Send size={15} />أرسل لـ {count} عميل</Btn>
              </div>
              <div style={{ fontSize: 11.5, color: A.text3 }}>التجربة توصل إلى {info.adminEmail}. الإعلانات تطلع من عنوان منفصل عن إيميلات النظام.</div>
            </div>
          </Card>

          <Card title="المعاينة" actions={<Eye size={16} color={A.text3} />} pad={0}>
            {html
              ? <iframe title="معاينة الإيميل" srcDoc={html} style={{ width: '100%', height: 640, border: 'none', borderRadius: '0 0 12px 12px', background: '#eef4f4' }} sandbox="" />
              : <div style={{ padding: 20 }}><Loading label="جاري تجهيز المعاينة..." /></div>}
          </Card>
        </div>
      )}

      {info?.campaigns?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Card title="الحملات السابقة" pad={0}>
            <Table head={['التاريخ', 'العنوان', 'الفئة', 'انرسلت', 'الحالة', 'بواسطة']} minWidth={640}>
              {info.campaigns.map((c: any) => (
                <tr key={c.id}>
                  <td style={td}>{fmtDate(c.created_at, true)}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{c.subject}</td>
                  <td style={td}>{info.segments[c.segment] || c.segment}</td>
                  <td style={td}>{c.sent} من {c.recipients}{c.failed ? <span style={{ color: A.danger }}> · فشل {c.failed}</span> : null}</td>
                  <td style={td}><Badge tone={c.status === 'sent' ? 'primary' : c.status === 'failed' ? 'danger' : 'warning'}>{c.status === 'sent' ? 'انرسلت' : c.status === 'failed' ? 'فشلت' : 'جاري الإرسال'}</Badge></td>
                  <td style={td}>{c.created_by_name || '—'}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}
    </>
  )
}
