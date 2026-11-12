'use client'
import { useEffect, useState } from 'react'
import { LifeBuoy, MessageCircle, ChevronDown, ChevronUp, Bot, User } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, Stack, Tabs, adminFetch, fmtDate, inputStyle } from '../kit'
import { planLabel } from '../customers'

// تذاكر الدعم الفني: العميل طلب الدعم من المساعد الذكي — التذكرة فيها المحادثة كاملة والصفحة اللي كان فيها.
// الرد يوصله إشعاراً داخل النظام (جرس الإشعارات)، والواتساب للحالات اللي تحتاج مكالمة.
const STATUS: Record<string, [string, 'warning' | 'primary' | 'neutral']> = { new: ['جديدة', 'warning'], open: ['تم الرد', 'primary'], resolved: ['محلولة', 'neutral'] }
const PAGES: Record<string, string> = { '/dashboard': 'الرئيسية', '/inventory': 'المخزون', '/dispense': 'الصرف', '/purchases': 'المشتريات', '/suppliers': 'الموردين', '/staff-management': 'الموظفون',
  '/hr-management': 'إدارة الموظفين', '/attendance': 'الحضور والانصراف', '/reports': 'التقارير', '/profitability': 'الربحية', '/settings': 'الإعدادات', '/branches': 'الفروع', '/notifications': 'الإشعارات' }
const pageName = (p?: string | null) => (p ? PAGES[p.split('?')[0]] || p : '—')
const wa = (phone: string | null, n: number) => phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`مرحباً، معك الدعم الفني في Storely بخصوص طلبك رقم ${n}.`)}` : null

export default function SupportPage() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [filter, setFilter] = useState<'active' | 'resolved'>('active')
  const [openId, setOpenId] = useState<string | null>(null)
  const [reply, setReply] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null)
  const load = () => adminFetch('/api/admin/support-tickets').then(j => setRows(j.tickets || [])).catch(() => setRows([]))
  useEffect(() => { load() }, [])

  async function act(t: any, action: 'reply' | 'resolve' | 'reopen', resolve = false) {
    setBusy(t.id + action + (resolve ? 'x' : ''))
    const j = await adminFetch('/api/admin/support-tickets', { method: 'POST', body: { id: t.id, action, reply: reply[t.id], resolve } })
    setBusy('')
    setMsg(j.success ? { t: action === 'reply' ? `أُرسل الرد للعميل (طلب ${t.number})` : action === 'resolve' ? `أُغلقت التذكرة ${t.number}` : `أُعيد فتح التذكرة ${t.number}` } : { t: j.error || 'تعذّر الحفظ', bad: true })
    if (j.success && action === 'reply') setReply(r => ({ ...r, [t.id]: '' }))
    load(); window.dispatchEvent(new Event('admin-counts-refresh'))
  }

  const all = rows || []
  const list = all.filter(t => filter === 'resolved' ? t.status === 'resolved' : t.status !== 'resolved')
  const fresh = all.filter(t => t.status === 'new').length
  return (
    <Stack>
      <PageHeader title="الدعم الفني" subtitle="طلبات الدعم من المساعد الذكي — فيها المحادثة كاملة والصفحة اللي كان فيها العميل، وردّك يوصله إشعاراً داخل النظام" />
      {msg && <Notice tone={msg.bad ? 'danger' : 'primary'}>{msg.t}</Notice>}
      <Tabs items={[{ k: 'active', l: 'المفتوحة', n: all.length - all.filter(t => t.status === 'resolved').length }, { k: 'resolved', l: 'المحلولة', n: all.filter(t => t.status === 'resolved').length }]} value={filter} onChange={setFilter} />
      {rows === null ? <Loading /> : !list.length ? (
        <Card><Empty icon={LifeBuoy} title={filter === 'active' ? 'لا توجد طلبات دعم مفتوحة' : 'لا توجد طلبات محلولة بعد'} hint={filter === 'active' && !fresh ? 'لما يطلب عميل الدعم من المساعد الذكي تظهر تذكرته هنا' : undefined} /></Card>
      ) : list.map(t => {
        const [sl, tone] = STATUS[t.status] || STATUS.new
        const expanded = openId === t.id, link = wa(t.requester_phone || t.org_phone, t.number)
        return (
          <Card key={t.id} pad={0}>
            <div style={{ padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: A.text3, fontWeight: 600 }}>#{t.number}</span>
                  <Badge tone={tone}>{sl}</Badge>
                  <span style={{ fontSize: 15, fontWeight: 700, color: A.text }}>{t.org_name}</span>
                  {t.plan && <span style={{ fontSize: 12.5, color: A.text3 }}>{planLabel(t.plan)}</span>}
                </div>
                <div style={{ fontSize: 15, color: A.text, lineHeight: 1.8, marginBottom: 6 }}>{t.subject}</div>
                <div style={{ fontSize: 12.5, color: A.text3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>{t.requester_name || '—'}{t.branch_name ? ` · ${t.branch_name}` : ''}</span>
                  <span>الصفحة: {pageName(t.page)}</span>
                  <span>{fmtDate(t.created_at, true)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {link && <a href={link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 9, border: `1px solid ${A.border}`, color: A.text, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}><MessageCircle size={15} /> واتساب</a>}
                <Btn small onClick={() => setOpenId(expanded ? null : t.id)}>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} المحادثة ({(t.conversation || []).length})</Btn>
                {t.status === 'resolved'
                  ? <Btn small onClick={() => act(t, 'reopen')} loading={busy === t.id + 'reopen'}>إعادة فتح</Btn>
                  : <Btn small onClick={() => act(t, 'resolve')} loading={busy === t.id + 'resolve'}>تم الحل</Btn>}
              </div>
            </div>
            {expanded && (
              <div style={{ borderTop: `1px solid ${A.border}`, background: A.bg, padding: '14px 20px', display: 'grid', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                {(t.conversation || []).map((m: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.role === 'user' ? A.primary : A.surface, color: m.role === 'user' ? '#fff' : A.text3, border: `1px solid ${A.border}` }}>{m.role === 'user' ? <User size={14} /> : <Bot size={14} />}</span>
                    <div style={{ fontSize: 13.5, lineHeight: 1.8, color: A.text, whiteSpace: 'pre-wrap', background: A.surface, border: `1px solid ${A.border}`, borderRadius: 10, padding: '8px 12px', flex: 1, minWidth: 0 }}>{m.text}</div>
                  </div>
                ))}
                {!(t.conversation || []).length && <span style={{ fontSize: 13, color: A.text3 }}>بدون محادثة</span>}
              </div>
            )}
            <div style={{ borderTop: `1px solid ${A.border}`, padding: '14px 20px', display: 'grid', gap: 10 }}>
              {t.admin_reply && (
                <div style={{ fontSize: 13.5, lineHeight: 1.8, background: A.muted, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, color: A.text3, marginBottom: 2 }}>ردّ {t.replied_by_name || 'الدعم'} · {fmtDate(t.replied_at, true)}</div>{t.admin_reply}
                </div>
              )}
              {t.status !== 'resolved' && (
                <>
                  <textarea value={reply[t.id] || ''} onChange={e => setReply(r => ({ ...r, [t.id]: e.target.value }))} rows={3} placeholder="اكتب الرد — يوصل العميل إشعاراً داخل النظام"
                    style={{ ...inputStyle, minHeight: 84, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.8 }} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Btn kind="primary" small onClick={() => act(t, 'reply')} loading={busy === t.id + 'reply'} disabled={!(reply[t.id] || '').trim()}>إرسال الرد</Btn>
                    <Btn small onClick={() => act(t, 'reply', true)} loading={busy === t.id + 'replyx'} disabled={!(reply[t.id] || '').trim()}>إرسال الرد وإغلاق التذكرة</Btn>
                  </div>
                </>
              )}
            </div>
          </Card>
        )
      })}
    </Stack>
  )
}
