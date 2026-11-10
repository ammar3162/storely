'use client'
import { useEffect, useState } from 'react'
import { RefreshCcw, MessageCircle } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, Stack, Table, adminFetch, fmtDate, td } from '../_admin/kit'
import { confirmDialog } from '@/components/ConfirmDialog'

// طلبات تجديد الاشتراك: العميل ضغط «تجديد الاشتراك» وحسابه يشتغل — نتواصل معه للدفع ثم نفعّل من «العملاء»
const STATUS: Record<string, [string, 'warning' | 'primary' | 'neutral']> = { pending_payment: ['بانتظار الدفع', 'warning'], paid: ['مدفوع', 'primary'], cancelled: ['ملغي', 'neutral'] }
const wa = (phone: string | null, org: string) => phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`مرحباً، نتواصل معك من Storely بخصوص تجديد اشتراك ${org}.`)}` : null

export default function RenewalsPage() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [expired, setExpired] = useState<any[]>([])
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null)
  const [busy, setBusy] = useState('')
  const load = () => adminFetch('/api/admin/renewals').then(j => { setRows(j.renewals || []); setExpired(j.expired || []) }).catch(() => setRows([]))
  useEffect(() => { load() }, [])

  async function act(r: any, action: 'paid' | 'cancel') {
    const ok = await confirmDialog(action === 'paid'
      ? { title: `تسجيل الدفع لـ ${r.org_name}؟`, message: 'تأكد أنك فعّلت اشتراكه بالمدة الجديدة من «العملاء» — التفعيل هناك يحوّل الطلب إلى «مدفوع» تلقائياً، وهذا الزر للحالات الأخرى.', confirmText: 'تم الدفع', type: 'success' }
      : { title: `إلغاء طلب ${r.org_name}؟`, message: 'يبقى اشتراكه على تاريخه الحالي، ويستطيع العميل طلب التجديد مرة أخرى.', confirmText: 'إلغاء الطلب', type: 'warning' })
    if (!ok) return
    setBusy(r.id + action)
    const j = await adminFetch('/api/admin/renewals', { method: 'POST', body: { id: r.id, action } })
    setBusy('')
    setMsg(j.success ? { t: action === 'paid' ? 'سُجّل الطلب مدفوعاً' : 'أُلغي الطلب' } : { t: j.error || 'تعذّر الحفظ', bad: true })
    load(); window.dispatchEvent(new Event('admin-counts-refresh'))
  }

  // تذكير يدوي (واتساب + إيميل) — ما يغيّر الرسائل التلقائية
  const remindable = expired.filter(e => !e.pending)
  async function remind(e: any | null) {
    const n = e ? 1 : remindable.length
    const ok = await confirmDialog({ title: e ? `إرسال تذكير إلى ${e.org_name}؟` : `إرسال تذكير إلى ${n} ${n === 1 ? 'منشأة' : n === 2 ? 'منشأتين' : 'منشآت'}؟`,
      message: 'يصل إلى المالك واتساب وإيميل: «تذكير: جدّد اشتراكك في Storely… جدّد اشتراكك الآن ليُعاد تفعيل حسابك فوراً» مع رابط التجديد. الرسائل التلقائية تبقى كما هي.', confirmText: 'إرسال التذكير', type: 'success' })
    if (!ok) return
    setBusy(e ? 'n' + e.org_id : 'all')
    const j = await adminFetch('/api/admin/renewals', { method: 'POST', body: e ? { action: 'remind', org_id: e.org_id } : { action: 'remind_all', expected: n } })
    setBusy('')
    setMsg(j.success ? { t: `أُرسل التذكير إلى ${j.sent} ${j.sent === 1 ? 'منشأة' : 'منشآت'} (واتساب ${j.wa}، إيميل ${j.mail})${j.failed ? ` · تعذّر ${j.failed}` : ''}` } : { t: j.error || 'تعذّر الإرسال', bad: true })
    load()
  }

  const pending = (rows || []).filter(r => r.status === 'pending_payment').length
  return (
    <>
      <PageHeader title="طلبات التجديد" icon={RefreshCcw}
        subtitle="العميل ضغط «تجديد الاشتراك» وحسابه يعمل (يوم سماح لو كان منتهياً). تواصل معه للدفع، ثم فعّل اشتراكه من «العملاء» فيتحوّل الطلب إلى «مدفوع» تلقائياً" />
      <Stack>
        {msg && <Notice tone={msg.bad ? 'danger' : 'primary'}>{msg.t}</Notice>}
        {expired.length > 0 && (
          <Card title={`اشتراكات منتهية (${expired.length})`} subtitle="آخر 60 يوماً — التذكير اليدوي إضافة على الرسائل التلقائية ولا يغيّرها" pad={0}
            actions={remindable.length > 1 ? <Btn small kind="primary" onClick={() => remind(null)} disabled={!!busy}>{busy === 'all' ? 'جاري الإرسال...' : `أرسل تذكير للجميع (${remindable.length})`}</Btn> : undefined}>
            <Table head={['المنشأة', 'انتهى', 'الرسائل', 'تواصل', '']} minWidth={780}>
              {expired.map(e => {
                const link = wa(e.phone, e.org_name)
                return (
                  <tr key={e.org_id}>
                    <td style={td}><div style={{ fontWeight: 600 }}>{e.org_name}</div><div style={{ fontSize: 12, color: A.text3 }}>{e.owner_name || '—'} · {e.sub_type === 'trial' ? 'تجربة' : 'مدفوع'}</div></td>
                    <td style={td}>{fmtDate(e.ends_at)}</td>
                    <td style={td}>
                      {e.pending ? <Badge tone="warning">طلب التجديد</Badge> : <>
                        <div style={{ fontSize: 12.5 }}>تلقائي: {e.auto_at ? fmtDate(e.auto_at, true) : <span style={{ color: A.text3 }}>لم يُرسل بعد</span>}</div>
                        <div style={{ fontSize: 12.5, color: A.text3 }}>تذكير يدوي: {e.manual_at ? fmtDate(e.manual_at, true) : '—'}</div>
                      </>}
                    </td>
                    <td style={td}>{link ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: A.primary, fontWeight: 600, textDecoration: 'none' }}><MessageCircle size={15} /><span dir="ltr">{e.phone}</span></a> : '—'}</td>
                    <td style={{ ...td, textAlign: 'left' }}>{!e.pending && <Btn small onClick={() => remind(e)} disabled={!!busy}>{busy === 'n' + e.org_id ? 'جاري الإرسال...' : 'أرسل تذكير'}</Btn>}</td>
                  </tr>
                )
              })}
            </Table>
          </Card>
        )}
        {!rows ? <Loading /> : !rows.length ? <Card><Empty title="لا توجد طلبات تجديد" hint="تظهر هنا فور ضغط العميل «تجديد الاشتراك»" /></Card> : (
          <Card title={pending ? `${pending} بانتظار الدفع` : 'كل الطلبات'} pad={0}>
            <Table head={['المنشأة', 'الحالة', 'الطلب', 'يعمل حسابه حتى', 'تواصل', '']} minWidth={860}>
              {rows.map(r => {
                const [label, tone] = STATUS[r.status] || [r.status, 'neutral']
                const link = wa(r.phone, r.org_name)
                return (
                  <tr key={r.id}>
                    <td style={td}><div style={{ fontWeight: 600 }}>{r.org_name}</div><div style={{ fontSize: 12, color: A.text3 }}>{r.owner_name || '—'}{r.sub_type === 'trial' ? ' · تجربة' : ''}</div></td>
                    <td style={td}><Badge tone={tone as any}>{label}</Badge>{r.decided_by_name && r.status !== 'pending_payment' && <div style={{ fontSize: 11.5, color: A.text3, marginTop: 4 }}>{r.decided_by_name} · {fmtDate(r.decided_at)}</div>}</td>
                    <td style={td}>{fmtDate(r.created_at, true)}<div style={{ fontSize: 11.5, color: A.text3 }}>{r.grace_until ? 'كان منتهياً — يوم سماح' : 'قبل الانتهاء'}</div></td>
                    <td style={td}>{fmtDate(r.ends_at, true)}</td>
                    <td style={td}>{link ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: A.primary, fontWeight: 600, textDecoration: 'none' }}><MessageCircle size={15} /><span dir="ltr">{r.phone}</span></a> : '—'}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      {r.status === 'pending_payment' && <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <Btn small kind="primary" onClick={() => act(r, 'paid')} disabled={!!busy}>تم الدفع</Btn>
                        <Btn small onClick={() => act(r, 'cancel')} disabled={!!busy}>إلغاء</Btn>
                      </div>}
                    </td>
                  </tr>
                )
              })}
            </Table>
          </Card>
        )}
      </Stack>
    </>
  )
}
