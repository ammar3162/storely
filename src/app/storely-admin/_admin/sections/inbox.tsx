'use client'
import { useEffect, useState } from 'react'
import { Mail, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { A, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, Stack, Tabs, adminFetch, fmtDate, inputStyle } from '../kit'

// البريد الوارد: ردود العملاء على support@storely.dev — تظهر هنا، والرد يطلع من نفس العنوان باسم «فريق Storely».
// بعد الرد تنتقل الرسالة للأرشيف (وتبقى مع الرد في «المراسلات» بملف العميل)، والحذف للرسائل المزعجة فقط.
const STATUS: Record<string, [string, 'warning' | 'primary' | 'neutral']> = { new: ['جديدة', 'warning'], read: ['مقروءة', 'neutral'], replied: ['تم الرد', 'primary'] }

export default function InboxPage() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [filter, setFilter] = useState<'inbox' | 'archive'>('inbox')
  const [openId, setOpenId] = useState<string | null>(null)
  const [reply, setReply] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null)
  const load = () => adminFetch('/api/admin/inbound-emails').then(j => setRows(j.emails || [])).catch(() => setRows([]))
  useEffect(() => { load() }, [])

  async function act(e: any, action: 'read' | 'unread' | 'reply' | 'delete') {
    if (action === 'delete' && !(await confirmDialog({ title: 'حذف الرسالة؟', message: `رسالة ${e.from_email} تنحذف نهائياً ولا يمكن استرجاعها. استخدمه للرسائل المزعجة فقط — الرسائل اللي ترد عليها تنتقل للأرشيف تلقائياً.`, confirmText: 'حذف', type: 'danger' }))) return
    setBusy(e.id + action)
    const j = await adminFetch('/api/admin/inbound-emails', { method: 'POST', body: { id: e.id, action, reply: reply[e.id] } })
    setBusy('')
    if (action === 'reply') {
      setMsg(j.success ? { t: `أُرسل الرد إلى ${e.from_email} ونُقلت الرسالة إلى الأرشيف` } : { t: j.error || 'تعذّر الإرسال', bad: true })
      if (j.success) setReply(r => ({ ...r, [e.id]: '' }))
    }
    if (action === 'delete') setMsg(j.success ? { t: 'حُذفت الرسالة' } : { t: j.error || 'تعذّر الحذف', bad: true })
    load(); window.dispatchEvent(new Event('admin-counts-refresh'))
  }
  function toggle(e: any) {
    const next = openId === e.id ? null : e.id
    setOpenId(next)
    if (next && e.status === 'new') act(e, 'read')
  }

  const all = rows || []
  const list = all.filter(e => filter === 'archive' ? e.status === 'replied' : e.status !== 'replied')
  return (
    <Stack>
      <PageHeader title="البريد الوارد" subtitle="ردود العملاء على support@storely.dev — ردّك يوصلهم من نفس العنوان باسم «فريق Storely»، وبعد الرد تنتقل الرسالة إلى الأرشيف" />
      <Tabs items={[{ k: 'inbox', l: 'الوارد', n: all.filter(e => e.status !== 'replied').length }, { k: 'archive', l: 'الأرشيف', n: all.filter(e => e.status === 'replied').length }]} value={filter} onChange={setFilter} />
      {msg && <Notice tone={msg.bad ? 'danger' : 'primary'}>{msg.t}</Notice>}
      {rows === null ? <Loading /> : !list.length ? (
        <Card><Empty icon={Mail} title={filter === 'inbox' ? 'لا توجد رسائل تحتاج رد' : 'الأرشيف فارغ'} hint={filter === 'inbox' ? 'لما يرد عميل على إيميل من Storely تظهر رسالته هنا' : 'الرسائل اللي ترد عليها تنتقل هنا'} /></Card>
      ) : list.map(e => {
        const [sl, tone] = STATUS[e.status] || STATUS.new
        const expanded = openId === e.id
        return (
          <Card key={e.id} pad={0}>
            <button onClick={() => toggle(e)} style={{ width: '100%', padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <Badge tone={tone}>{sl}</Badge>
                  <span style={{ fontSize: 15, fontWeight: 700, color: A.text }}>{e.org_name || e.from_name || e.from_email}</span>
                  {!e.org_name && <span style={{ fontSize: 12.5, color: A.text3 }}>ليس عميلاً مسجلاً</span>}
                </div>
                <div style={{ fontSize: 15, color: A.text, lineHeight: 1.8, marginBottom: 4, fontWeight: e.status === 'new' ? 700 : 400 }}>{e.subject || 'بدون عنوان'}</div>
                <div style={{ fontSize: 12.5, color: A.text3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span dir="ltr">{e.from_email}</span>
                  <span>{fmtDate(e.received_at, true)}</span>
                </div>
              </div>
              {expanded ? <ChevronUp size={16} color={A.text3} /> : <ChevronDown size={16} color={A.text3} />}
            </button>
            {expanded && (
              <div style={{ borderTop: `1px solid ${A.border}`, padding: '14px 20px', display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 14, lineHeight: 1.9, color: A.text, whiteSpace: 'pre-wrap', background: A.bg, border: `1px solid ${A.border}`, borderRadius: 10, padding: '10px 14px' }}>
                  {e.body || 'تعذّر قراءة نص الرسالة — افتحها من بريدك'}
                </div>
                {e.reply_body && (
                  <div style={{ fontSize: 13.5, lineHeight: 1.8, background: A.muted, borderRadius: 10, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>
                    <div style={{ fontSize: 12, color: A.text3, marginBottom: 2 }}>ردّ {e.replied_by_name || 'الدعم'} · {fmtDate(e.replied_at, true)}</div>{e.reply_body}
                  </div>
                )}
                <textarea value={reply[e.id] || ''} onChange={ev => setReply(r => ({ ...r, [e.id]: ev.target.value }))} rows={3} placeholder={`اكتب الرد — يوصل ${e.from_email} بالإيميل، ثم تنتقل الرسالة إلى الأرشيف`}
                  style={{ ...inputStyle, minHeight: 84, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.8 }} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Btn kind="primary" small onClick={() => act(e, 'reply')} loading={busy === e.id + 'reply'} disabled={!(reply[e.id] || '').trim()}>إرسال الرد</Btn>
                  {e.status === 'read' && <Btn small onClick={() => act(e, 'unread')} loading={busy === e.id + 'unread'}>تعليم كغير مقروءة</Btn>}
                  {e.status !== 'replied' && <Btn small onClick={() => act(e, 'delete')} loading={busy === e.id + 'delete'}><Trash2 size={14} /> حذف (رسالة مزعجة)</Btn>}
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </Stack>
  )
}
