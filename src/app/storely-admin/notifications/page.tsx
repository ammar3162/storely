'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useMemo } from 'react'
import { toast } from '@/components/toast'
import { Bell, Megaphone, Check, Send, History, Building2, SearchX } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Field, Loading, NoAccess, PageHeader, Row, SearchBox, Stack, Tabs, adminFetch, fmtDate, inputStyle, useAdmin, type Tone } from '../_admin/kit'

// إشعارات المنشآت: إشعار داخلي (جرس الإشعارات) أو بانر عام أعلى لوحة التحكم — لكل المنشآت أو لمنشآت محددة
type NType = 'info' | 'warning' | 'success' | 'danger'
const TC: Record<NType, { label: string; tone: Tone; color: string; bg: string }> = {
  info: { label: 'معلومة', tone: 'info', color: A.info, bg: A.infoSoft },
  warning: { label: 'تنبيه', tone: 'warning', color: A.warning, bg: A.warningSoft },
  success: { label: 'نجاح', tone: 'primary', color: A.primary, bg: A.primarySoft },
  danger: { label: 'هام', tone: 'danger', color: A.danger, bg: A.dangerSoft },
}
const BANNER_COLOR: Record<NType, string> = { danger: '#ef4444', warning: '#f59e0b', success: '#029FA2', info: '#7c3aed' }

export default function AdminNotificationsPage() {
  const { admin } = useAdmin()
  const allowed = admin.role === 'super_admin'
  const [orgs, setOrgs] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<NType>('info')
  const [deliveryType, setDeliveryType] = useState<'internal' | 'banner'>('internal')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'send' | 'history'>('send')
  const [orgSearch, setOrgSearch] = useState('')

  async function load() {
    setLoading(true)
    const [o, n] = await Promise.all([adminFetch('/api/admin/list-orgs'), adminFetch('/api/admin/notifications')])
    setOrgs(o.orgs || []); setSent(n.notifications || [])
    setLoading(false)
  }
  useEffect(() => { if (allowed) load() }, [allowed])

  const shownOrgs = useMemo(() => orgs.filter((o: any) => !orgSearch.trim() || o.name?.includes(orgSearch.trim())), [orgs, orgSearch])
  const toggleOrg = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  async function sendNotification() {
    if (!title.trim() || !message.trim()) { toast('أدخل العنوان ونص الرسالة', 'warning'); return }
    setSending(true)
    const targets = selected.length === 0 ? orgs.map(o => o.id) : selected
    const isBanner = deliveryType === 'banner'
    const j = await adminFetch('/api/admin/notifications', { method: 'POST', body: { title: title.trim(), message: message.trim(), type, target_orgs: selected.length === 0 ? null : selected, org_ids: targets, with_org_notifications: !isBanner } })
    if (!j.success) { toast((j.stage === 'notifications' ? 'خطأ في الإشعارات: ' : 'خطأ: ') + (j.error || ''), 'error'); setSending(false); return }
    if (isBanner) {
      await adminFetch('/api/admin/feature-announcement', { method: 'POST', body: { version: 'admin-' + Date.now(), title: title.trim(), description: message.trim(), type: 'banner', color: BANNER_COLOR[type], target_orgs: targets } })
      toast('تم إرسال البانر', 'success'); setTitle(''); setMessage(''); setSending(false); return
    }
    toast(`تم الإرسال إلى ${targets.length} منشأة`, 'success')
    setTitle(''); setMessage(''); setSelected([]); setSending(false); load()
  }

  if (!allowed) return <><PageHeader title="إشعارات العملاء" /><NoAccess title="هذه الصفحة للمشرف الكامل فقط" /></>

  const tc = TC[type]
  return (
    <>
      <PageHeader title="إشعارات العملاء" subtitle="أرسل إشعاراً يظهر للعملاء داخل Storely مباشرة، لكل المنشآت أو لمنشآت محددة"
        actions={<Tabs items={[{ k: 'send' as const, l: 'إرسال إشعار' }, { k: 'history' as const, l: 'السجل', n: sent.length }]} value={tab} onChange={setTab} />} />

      {tab === 'send' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap: 20, alignItems: 'start' }}>
          <Card title="تفاصيل الإشعار">
            <Stack gap={16}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: A.text, marginBottom: 8 }}>طريقة الإرسال</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Choice on={deliveryType === 'internal'} onClick={() => setDeliveryType('internal')} icon={<Bell size={16} />} title="إشعار داخلي" sub="يظهر في جرس الإشعارات" />
                  <Choice on={deliveryType === 'banner'} onClick={() => setDeliveryType('banner')} icon={<Megaphone size={16} />} title="بانر عام" sub="شريط أعلى لوحة التحكم" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: A.text, marginBottom: 8 }}>النوع</div>
                <Tabs items={(Object.keys(TC) as NType[]).map(k => ({ k, l: TC[k].label }))} value={type} onChange={setType} />
              </div>
              <Field label="العنوان"><input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="مثال: تحديث جديد في Storely" maxLength={120} /></Field>
              <Field label="الرسالة">
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.8 }} placeholder="اكتب تفاصيل الإشعار هنا" />
              </Field>

              <div>
                <div style={{ fontSize: 12, color: A.text3, marginBottom: 6 }}>المعاينة</div>
                <div style={{ background: tc.bg, border: `1px solid ${tc.color}2e`, borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: tc.color, display: 'flex', marginTop: 2 }}>{deliveryType === 'banner' ? <Megaphone size={16} /> : <Bell size={16} />}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: A.text }}>{title || 'العنوان'}</div>
                    <div style={{ fontSize: 13, color: A.text2, marginTop: 2, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{message || 'نص الرسالة'}</div>
                  </div>
                </div>
              </div>

              <Btn kind="primary" full loading={sending} onClick={sendNotification}>
                <Send size={15} /> {selected.length === 0 ? `إرسال إلى كل المنشآت (${orgs.length})` : `إرسال إلى ${selected.length} منشأة`}
              </Btn>
            </Stack>
          </Card>

          <Card title="المنشآت" subtitle={selected.length === 0 ? 'سيُرسل إلى جميع المنشآت، أو اختر منشآت محددة' : `${selected.length} منشأة محددة`} pad={0}
            actions={<div style={{ display: 'flex', gap: 6 }}>
              <Btn small onClick={() => setSelected(shownOrgs.map(o => o.id))}>تحديد الكل</Btn>
              <Btn small kind="ghost" disabled={!selected.length} onClick={() => setSelected([])}>إلغاء التحديد</Btn>
            </div>}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${A.border}` }}>
              <SearchBox value={orgSearch} onChange={setOrgSearch} placeholder="ابحث باسم المنشأة" />
            </div>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {loading ? <Loading /> : orgs.length === 0 ? <Empty icon={Building2} title="لا توجد منشآت" hint="تحقق من صلاحياتك أو حدّث الصفحة" />
                : shownOrgs.length === 0 ? <Empty icon={SearchX} title="لا توجد نتائج" />
                : shownOrgs.map(org => {
                  const on = selected.includes(org.id)
                  return (
                    <Row key={org.id} onClick={() => toggleOrg(org.id)} style={{ padding: '11px 16px', background: on ? A.primarySoft : 'transparent' }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? A.primary : A.borderStrong}`, background: on ? A.primary : A.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {on && <Check size={12} color="white" strokeWidth={3} />}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: A.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</span>
                    </Row>
                  )
                })}
            </div>
          </Card>
        </div>
      )}

      {tab === 'history' && (
        <Card title="سجل الإشعارات" pad={0}>
          {loading ? <Loading /> : sent.length === 0 ? <Empty icon={History} title="لم تُرسل أي إشعارات بعد" /> : sent.map(n => {
            const t = TC[n.type as NType] || TC.info
            return (
              <Row key={n.id} style={{ alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Bell size={16} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: A.text }}>{n.title}</span>
                    <Badge tone={t.tone}>{t.label}</Badge>
                  </div>
                  <div style={{ fontSize: 13, color: A.text2, marginTop: 3, lineHeight: 1.7 }}>{n.message}</div>
                  <div style={{ fontSize: 12, color: A.text3, marginTop: 4 }}>{fmtDate(n.created_at, true)}</div>
                </div>
                <Badge tone="neutral">{n.sent_to_count} منشأة</Badge>
              </Row>
            )
          })}
        </Card>
      )}
    </>
  )
}

function Choice({ on, onClick, icon, title, sub }: { on: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button type="button" onClick={onClick} className="adm-hover"
      style={{ textAlign: 'right', padding: '12px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${on ? A.primary : A.border}`, background: on ? A.primarySoft : A.surface, boxShadow: on ? `0 0 0 3px ${A.primary}1a` : A.shadowSm }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: on ? A.primaryHover : A.text }}>{icon}{title}</div>
      <div style={{ fontSize: 12, color: A.text3, marginTop: 3 }}>{sub}</div>
    </button>
  )
}
