'use client'
import { useEffect, useRef, useState } from 'react'
import { Send, Eye, FlaskConical, FileText, Users, MailX, History } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { EmailUsageLine } from '../EmailUsage'
import { A, Badge, Btn, Card, Empty, Field, Loading, Notice, PageHeader, Stack, Table, Tabs, adminFetch, fmtDate, inputStyle, td } from '../kit'

// إعلانات الإيميل: تكتب الحملة، تشوف معاينة، ترسل تجربة لإيميلك، وبعدها ترسلها لفئة من العملاء
// كل إيميل فيه رابط إلغاء اشتراك، واللي يلغي ما يوصله إعلان مرة ثانية

const TEMPLATES: { name: string; subject: string; title: string; body: string; button_label: string; button_url: string }[] = [{
  name: 'إعلان: طلب فرع إضافي',
  subject: 'اطلب فرعك الجديد من داخل Storely',
  title: 'فرع جديد؟ اطلبه بضغطة واحدة',
  body: [
    'مرحباً {الاسم}،',
    'أصبح بإمكانك طلب فرع إضافي لـ{المنشأة} من صفحة الفروع بضغطة واحدة، وسنفعّله لك سريعاً، ويأتي الفرع مع موظفين وموردين إضافيين.',
    'يُضاف سعر الفرع إلى فاتورتك ويُحتسب فقط عن الأيام المتبقية من اشتراكك.',
    'وإن كان لديك أي سؤال، تواصل معنا عبر واتساب وسنسعد بمساعدتك.',
  ].join('\n'),
  button_label: 'افتح صفحة الفروع',
  button_url: 'https://www.storely.dev/branches',
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
    else setMsg({ t: j.error === 'unauthorized' ? 'هذه الصفحة للمشرف الكامل أو لمن يملك صلاحية إرسال الإعلانات' : (j.error || 'تعذر التحميل'), bad: true })
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
    setMsg(j.success ? { t: `أُرسلت رسالة تجريبية إلى ${j.to}، تحقق من صندوق الوارد ومجلد الرسائل غير المرغوبة` } : { t: j.error || 'تعذّر إرسال الرسالة التجريبية', bad: true })
  }

  // رسائل الاشتراك التلقائية: نسخة تجريبية لبريد المشرف
  async function systemTest() {
    setBusy('sys'); setMsg(null)
    const j = await adminFetch('/api/admin/email-campaigns', { method: 'POST', body: { action: 'system_test' } })
    setBusy('')
    setMsg(j.success ? { t: `أُرسلت رسالتان إلى ${j.to}: «ينتهي اشتراكك خلال 3 أيام» و«انتهى اشتراكك». تأكد أنهما في الوارد وليس في الرسائل غير المرغوبة` } : { t: j.error || 'تعذّر الإرسال', bad: true })
  }

  async function send() {
    if (!count) return
    if (!(await confirmDialog({
      title: `إرسال الحملة إلى ${count} عميل`,
      message: `سيُرسل «${form.subject}» إلى فئة «${info.segments[segment]}» (${count} بريد).\n\nلا يمكن التراجع بعد الإرسال، فتأكد من إرسال رسالة تجريبية إلى بريدك ومراجعتها أولاً.`,
      confirmText: 'إرسال الآن', type: 'warning',
    }))) return
    setBusy('send'); setMsg(null)
    const j = await adminFetch('/api/admin/email-campaigns', { method: 'POST', body: { action: 'send', segment, expected: count, ...form } })
    setBusy('')
    if (!j.success) { setMsg({ t: j.error || 'تعذّر الإرسال', bad: true }); load(); return }
    setMsg({ t: `أُرسلت الحملة إلى ${j.sent} عميل${j.failed ? ` (تعذّر الإرسال إلى ${j.failed})` : ''}` })
    setForm({ ...EMPTY }); load()
  }

  if (!info && !msg) return <Loading />

  return (
    <>
      <PageHeader title="إعلانات الإيميل" subtitle="أرسل إعلاناً أو تحديثاً لعملاء Storely، ويتضمن كل بريد رابطاً لإلغاء الاشتراك في الإعلانات" />
      <Stack>
      <EmailUsageLine />
      {msg && <Notice tone={msg.bad ? 'danger' : 'primary'}>{msg.t}</Notice>}

      <Card title="رسائل الاشتراك التلقائية" subtitle="تصل للمالك قبل انتهاء اشتراكه بـ3 أيام ويوم الانتهاء، مع الواتساب" actions={
        <Btn small onClick={systemTest} disabled={busy === 'sys'}>{busy === 'sys' ? 'جاري الإرسال...' : 'أرسل لي نسخة تجريبية'}</Btn>}>
        <div style={{ fontSize: 13, color: A.text3, lineHeight: 1.8 }}>تُرسل النسختان إلى بريد حسابك في لوحة الأدمن للتأكد من شكلهما ووصولهما إلى الوارد.</div>
      </Card>

      {info && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 20, alignItems: 'start' }}>
          <Card title="حملة جديدة" actions={
            <div style={{ display: 'flex', gap: 6 }}>
              {TEMPLATES.map(t => <Btn key={t.name} small onClick={() => setForm({ subject: t.subject, title: t.title, body: t.body, button_label: t.button_label, button_url: t.button_url })}><FileText size={14} />{t.name}</Btn>)}
            </div>
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: A.text, marginBottom: 8 }}><Users size={15} color={A.text3} /> المستلمون</div>
                <Tabs items={Object.entries(info.segments as Record<string, string>).map(([k, label]) => ({ k, l: label, n: info.counts[k] }))} value={segment} onChange={setSegment} />
                {info.optouts > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: A.text3, marginTop: 8 }}><MailX size={13} /> {info.optouts} ألغوا الاشتراك في الإعلانات ولن تصلهم الحملة</div>}
              </div>
              <Field label="عنوان البريد (يظهر في صندوق الوارد)"><input style={inputStyle} value={form.subject} onChange={set('subject')} maxLength={150} /></Field>
              <Field label="العنوان الرئيسي داخل البريد"><input style={inputStyle} value={form.title} onChange={set('title')} maxLength={150} /></Field>
              <Field label="النص" hint="كل سطر فقرة مستقلة. يُستبدل {الاسم} باسم العميل، و{المنشأة} باسم منشأته">
                <textarea style={{ ...inputStyle, minHeight: 200, resize: 'vertical', lineHeight: 1.8 }} value={form.body} onChange={set('body')} maxLength={5000} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10 }}>
                <Field label="نص الزر (اختياري)"><input style={inputStyle} value={form.button_label} onChange={set('button_label')} /></Field>
                <Field label="رابط الزر"><input style={inputStyle} value={form.button_url} onChange={set('button_url')} dir="ltr" placeholder="https://www.storely.dev/..." /></Field>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: `1px solid ${A.border}`, paddingTop: 14 }}>
                <Btn onClick={test} loading={busy === 'test'} disabled={!!busy}><FlaskConical size={15} />إرسال رسالة تجريبية إلى بريدي</Btn>
                <Btn kind="primary" onClick={send} loading={busy === 'send'} disabled={!!busy || !count}><Send size={15} />إرسال إلى {count} عميل</Btn>
              </div>
              <div style={{ fontSize: 12, color: A.text3, lineHeight: 1.7 }}>تصل الرسالة التجريبية إلى {info.adminEmail}، وتُرسل الإعلانات من عنوان منفصل عن رسائل النظام.</div>
            </div>
          </Card>

          <Card title="المعاينة" actions={<Eye size={16} color={A.text3} />} pad={0}>
            {html
              ? <iframe title="معاينة الإيميل" srcDoc={html} style={{ width: '100%', height: 640, border: 'none', background:'#F5F3EF', display: 'block' }} sandbox="" />
              : <div style={{ padding: 20 }}><Loading label="جارٍ تجهيز المعاينة..." /></div>}
          </Card>
        </div>
      )}

      {info && (
        <div>
          <Card title="الحملات السابقة" subtitle={info.campaigns?.length ? `${info.campaigns.length} حملة` : undefined} pad={0}>
            {!info.campaigns?.length ? <Empty icon={History} title="لم تُرسل أي حملة بعد" /> : (
            <Table head={['التاريخ', 'العنوان', 'الفئة', 'المُرسلة', 'الحالة', 'بواسطة']} minWidth={640}>
              {info.campaigns.map((c: any) => (
                <tr key={c.id}>
                  <td style={{ ...td, color: A.text2, whiteSpace: 'nowrap' }}>{fmtDate(c.created_at, true)}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{c.subject}</td>
                  <td style={td}>{info.segments[c.segment] || c.segment}</td>
                  <td style={td}>{c.sent} من {c.recipients}{c.failed ? <span style={{ color: A.danger }}> · تعذّر {c.failed}</span> : null}</td>
                  <td style={td}><Badge tone={c.status === 'sent' ? 'primary' : c.status === 'failed' ? 'danger' : 'warning'}>{c.status === 'sent' ? 'أُرسلت' : c.status === 'failed' ? 'تعذّر الإرسال' : 'جارٍ الإرسال'}</Badge></td>
                  <td style={td}>{c.created_by_name || '—'}</td>
                </tr>
              ))}
            </Table>
            )}
          </Card>
        </div>
      )}
      </Stack>
    </>
  )
}
