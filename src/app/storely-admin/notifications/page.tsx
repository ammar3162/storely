'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useMemo } from 'react'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { Bell, Megaphone, Check, Send, History, Building2, SearchX, FileText, Copy, Users, Info, AlertTriangle, CircleCheck, OctagonAlert, type LucideIcon } from 'lucide-react'
import { A, Avatar, Badge, Btn, Card, Empty, Field, Loading, NoAccess, PageHeader, Row, SearchBox, Stack, Tabs, adminFetch, daysLeft, fmtDate, inputStyle, useAdmin, type Tone } from '../_admin/kit'
import { mapCustomer, STATUS, type Customer } from '../_admin/customers'

// إشعارات العملاء: إشعار داخلي (جرس الإشعارات) أو بانر عام أعلى لوحة التحكم — لكل المنشآت أو لفئة أو لمنشآت محددة
type NType = 'info' | 'warning' | 'success' | 'danger'
const TC: Record<NType, { label: string; tone: Tone; color: string; bg: string; icon: LucideIcon }> = {
  info: { label: 'معلومة', tone: 'info', color: A.info, bg: A.infoSoft, icon: Info },
  success: { label: 'نجاح', tone: 'primary', color: A.primary, bg: A.primarySoft, icon: CircleCheck },
  warning: { label: 'تنبيه', tone: 'warning', color: A.warning, bg: A.warningSoft, icon: AlertTriangle },
  danger: { label: 'هام', tone: 'danger', color: A.danger, bg: A.dangerSoft, icon: OctagonAlert },
}
const BANNER_COLOR: Record<NType, string> = { danger: '#ef4444', warning: '#f59e0b', success: '#203640', info: '#7c3aed' }

const TEMPLATES: { name: string; type: NType; title: string; message: string }[] = [
  { name: 'ميزة جديدة', type: 'success', title: 'ميزة جديدة في Storely', message: 'أضفنا ميزة جديدة تساعدك في إدارة منشأتك بسهولة أكبر. اطّلع عليها من القائمة، وتواصل معنا إن كان لديك أي سؤال.' },
  { name: 'صيانة مجدولة', type: 'warning', title: 'صيانة مجدولة للنظام', message: 'سيخضع النظام لصيانة قصيرة يوم … من الساعة … حتى الساعة …، وقد يتوقف الوصول خلالها لدقائق. نعتذر عن أي إزعاج.' },
  { name: 'تذكير بالتجديد', type: 'info', title: 'تذكير بتجديد الاشتراك', message: 'يقترب موعد انتهاء اشتراكك. جدّد اشتراكك قبل انتهائه لتستمر في استخدام جميع المزايا دون انقطاع.' },
]

// فئات المستلمين — تُحسب من بيانات العملاء (حالة الحساب ونوع الاشتراك)
type Seg = 'all' | 'active' | 'paid' | 'trial' | 'expiring' | 'pending' | 'custom'
const SEGMENTS: { k: Seg; l: string; test?: (c: Customer) => boolean }[] = [
  { k: 'all', l: 'كل المنشآت' },
  { k: 'active', l: 'المفعّلة', test: c => c.status === 'active' },
  { k: 'paid', l: 'المدفوعة', test: c => c.status === 'active' && c.subscription_type === 'paid' },
  { k: 'trial', l: 'في التجربة', test: c => c.status === 'active' && c.subscription_type === 'trial' },
  { k: 'expiring', l: 'تنتهي خلال 7 أيام', test: c => { const d = daysLeft(c.subscription_ends_at); return c.status === 'active' && d !== null && d > 0 && d <= 7 } },
  { k: 'pending', l: 'بانتظار التفعيل', test: c => c.status === 'pending' },
]

export default function AdminNotificationsPage() {
  const { admin } = useAdmin()
  const allowed = admin.role === 'super_admin'
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([])
  const [owners, setOwners] = useState<Record<string, Customer>>({})
  const [selected, setSelected] = useState<string[]>([])
  const [seg, setSeg] = useState<Seg>('all')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<NType>('info')
  const [deliveryType, setDeliveryType] = useState<'internal' | 'banner'>('internal')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'send' | 'history'>('send')
  const [orgSearch, setOrgSearch] = useState('')
  const [histSearch, setHistSearch] = useState('')

  async function load() {
    setLoading(true)
    const [o, n, u] = await Promise.all([adminFetch('/api/admin/list-orgs'), adminFetch('/api/admin/notifications'), adminFetch('/api/admin/list-users')])
    setOrgs(o.orgs || []); setSent(n.notifications || [])
    const map: Record<string, Customer> = {}
    for (const p of u.users || []) { const c = mapCustomer(p); if (c.org_id && !map[c.org_id]) map[c.org_id] = c }
    setOwners(map)
    setLoading(false)
  }
  useEffect(() => { if (allowed) load() }, [allowed])

  const segIds = (k: Seg) => {
    const s = SEGMENTS.find(x => x.k === k)
    return !s?.test ? orgs.map(o => o.id) : orgs.filter(o => owners[o.id] && s.test!(owners[o.id])).map(o => o.id)
  }
  const segCount = useMemo(() => Object.fromEntries(SEGMENTS.map(s => [s.k, segIds(s.k).length])) as Record<Seg, number>, [orgs, owners]) // eslint-disable-line react-hooks/exhaustive-deps
  function pickSeg(k: Seg) {
    setSeg(k)
    if (k === 'custom') return
    setSelected(k === 'all' ? [] : segIds(k))
  }
  const toggleOrg = (id: string) => { setSeg('custom'); setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) }

  const shownOrgs = useMemo(() => {
    const q = orgSearch.trim()
    const list = orgs.filter(o => !q || o.name?.includes(q))
    // المحددة أولاً عشان يبان مين بيستلم
    return [...list].sort((a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)))
  }, [orgs, orgSearch, selected])
  const shownHistory = useMemo(() => sent.filter(n => !histSearch.trim() || `${n.title} ${n.message}`.includes(histSearch.trim())), [sent, histSearch])

  const targetCount = selected.length === 0 ? orgs.length : selected.length
  const targetLabel = selected.length === 0 ? 'كل المنشآت' : seg !== 'custom' ? `فئة «${SEGMENTS.find(s => s.k === seg)?.l}»` : 'المنشآت المحددة'

  async function sendNotification() {
    if (!title.trim() || !message.trim()) { toast('أدخل العنوان ونص الرسالة', 'warning'); return }
    if (seg !== 'all' && selected.length === 0) { toast('لا توجد منشآت في هذه الفئة', 'warning'); return }
    const isBanner = deliveryType === 'banner'
    if (!(await confirmDialog({
      title: `إرسال ${isBanner ? 'البانر' : 'الإشعار'} إلى ${targetCount} منشأة`,
      message: `سيُرسل «${title.trim()}» إلى ${targetLabel} (${targetCount} منشأة) ${isBanner ? 'بانراً أعلى لوحة التحكم' : 'إشعاراً في جرس الإشعارات'}.`,
      confirmText: 'إرسال الآن', type: 'warning',
    }))) return
    setSending(true)
    const targets = selected.length === 0 ? orgs.map(o => o.id) : selected
    const j = await adminFetch('/api/admin/notifications', { method: 'POST', body: { title: title.trim(), message: message.trim(), type, target_orgs: selected.length === 0 ? null : selected, org_ids: targets, with_org_notifications: !isBanner } })
    if (!j.success) { toast((j.stage === 'notifications' ? 'خطأ في الإشعارات: ' : 'خطأ: ') + (j.error || ''), 'error'); setSending(false); return }
    if (isBanner) await adminFetch('/api/admin/feature-announcement', { method: 'POST', body: { version: 'admin-' + Date.now(), title: title.trim(), description: message.trim(), type: 'banner', color: BANNER_COLOR[type], target_orgs: targets } })
    toast(isBanner ? `تم إرسال البانر إلى ${targets.length} منشأة` : `تم الإرسال إلى ${targets.length} منشأة`, 'success')
    setTitle(''); setMessage(''); setSelected([]); setSeg('all'); setSending(false); load()
  }

  function reuse(n: any) {
    setTitle(n.title || ''); setMessage(n.message || ''); if (TC[n.type as NType]) setType(n.type)
    setTab('send'); toast('نُسخ الإشعار إلى النموذج، راجعه قبل الإرسال', 'info')
  }

  if (!allowed) return <><PageHeader title="إشعارات العملاء" /><NoAccess title="هذه الصفحة للمشرف الكامل فقط" /></>

  const tc = TC[type]
  const TIcon = deliveryType === 'banner' ? Megaphone : tc.icon
  return (
    <>
      <PageHeader title="إشعارات العملاء" subtitle="أرسل إشعاراً يظهر للعملاء داخل Storely مباشرة، لكل المنشآت أو لفئة محددة أو لمنشآت تختارها"
        actions={<Tabs items={[{ k: 'send' as const, l: 'إرسال إشعار' }, { k: 'history' as const, l: 'السجل', n: sent.length }]} value={tab} onChange={setTab} />} />

      {tab === 'send' && (
        <div className="adm-two" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
          <Card title="تفاصيل الإشعار" actions={
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {TEMPLATES.map(t => <Btn key={t.name} small onClick={() => { setTitle(t.title); setMessage(t.message); setType(t.type) }}><FileText size={13} />{t.name}</Btn>)}
            </div>}>
            <Stack gap={18}>
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
              <Field label="العنوان" hint={`${title.length} / 120`}>
                <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="مثال: تحديث جديد في Storely" maxLength={120} />
              </Field>
              <Field label="الرسالة" hint={`${message.length} / 600`}>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} maxLength={600} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.8 }} placeholder="اكتب تفاصيل الإشعار هنا" />
              </Field>

              <div>
                <div style={{ fontSize: 12.5, color: A.text3, marginBottom: 8 }}>المعاينة كما تظهر للعميل</div>
                {deliveryType === 'banner' ? (
                  <div style={{ borderRadius: 12, background: BANNER_COLOR[type], color: 'white', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Megaphone size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{title || 'العنوان'}</div>
                      <div style={{ fontSize: 13, opacity: .92, marginTop: 2, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{message || 'نص الرسالة'}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ border: `1px solid ${A.border}`, borderRadius: 14, background: A.surface, boxShadow: A.shadowLg, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start', maxWidth: 380 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: tc.bg, color: tc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><TIcon size={17} /></div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: A.text }}>{title || 'العنوان'}</span>
                        <span style={{ fontSize: 11.5, color: A.text3, whiteSpace: 'nowrap' }}>الآن</span>
                      </div>
                      <div style={{ fontSize: 13, color: A.text2, marginTop: 3, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{message || 'نص الرسالة'}</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ paddingTop: 16, borderTop: `1px solid ${A.border}` }}>
                <Btn kind="primary" full loading={sending} disabled={!title.trim() || !message.trim() || (seg !== 'all' && !selected.length)} onClick={sendNotification}>
                  <Send size={15} /> {`إرسال إلى ${targetCount} منشأة`}
                </Btn>
                <div style={{ fontSize: 12.5, color: A.text3, marginTop: 8, textAlign: 'center' }}>المستلمون: {targetLabel}</div>
              </div>
            </Stack>
          </Card>

          <Card title="المستلمون" subtitle={selected.length === 0 ? `كل المنشآت (${orgs.length})` : `${selected.length} منشأة محددة`} pad={0}
            actions={selected.length > 0 && <Btn small kind="ghost" onClick={() => pickSeg('all')}>إلغاء التحديد</Btn>}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${A.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: A.text3, marginBottom: 8 }}><Users size={13} /> اختر فئة، أو حدّد منشآت بعينها من القائمة</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SEGMENTS.map(s => {
                  const on = seg === s.k
                  return (
                    <button key={s.k} type="button" onClick={() => pickSeg(s.k)} className="adm-btn"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', borderRadius: 99, fontSize: 12.5, fontWeight: on ? 600 : 500, fontFamily: 'inherit', cursor: 'pointer',
                        border: `1px solid ${on ? A.primary : A.border}`, background: on ? A.primarySoft : A.surface, color: on ? A.primaryHover : A.text2 }}>
                      {s.l}<span style={{ fontSize: 11.5, color: on ? A.primary : A.text3, fontVariantNumeric: 'tabular-nums' }}>{loading ? '…' : segCount[s.k]}</span>
                    </button>
                  )
                })}
              </div>
              <div style={{ marginTop: 12 }}><SearchBox value={orgSearch} onChange={setOrgSearch} placeholder="ابحث باسم المنشأة" /></div>
            </div>
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {loading ? <Loading /> : orgs.length === 0 ? <Empty icon={Building2} title="لا توجد منشآت" hint="تحقق من صلاحياتك أو حدّث الصفحة" />
                : shownOrgs.length === 0 ? <Empty icon={SearchX} title="لا توجد نتائج" />
                : shownOrgs.map(org => {
                  const on = selected.includes(org.id)
                  const c = owners[org.id]
                  const st = c ? (STATUS[c.status] || STATUS.pending) : null
                  return (
                    <Row key={org.id} onClick={() => toggleOrg(org.id)} style={{ padding: '10px 16px', background: on ? A.primarySoft : 'transparent' }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? A.primary : A.borderStrong}`, background: on ? A.primary : A.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {on && <Check size={12} color="white" strokeWidth={3} />}
                      </span>
                      <Avatar name={org.name} size={30} />
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: A.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</span>
                      {c && c.status === 'active' ? <Badge tone={c.subscription_type === 'paid' ? 'primary' : 'info'}>{c.subscription_type === 'paid' ? 'مدفوع' : 'تجربة'}</Badge> : st && <Badge tone={st.tone}>{st.label}</Badge>}
                    </Row>
                  )
                })}
            </div>
          </Card>
        </div>
      )}

      {tab === 'history' && (
        <Card title="سجل الإشعارات" subtitle="آخر 50 إشعاراً" pad={0}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${A.border}` }}><SearchBox value={histSearch} onChange={setHistSearch} placeholder="ابحث في العنوان أو الرسالة" /></div>
          {loading ? <Loading /> : sent.length === 0 ? <Empty icon={History} title="لم تُرسل أي إشعارات بعد" />
            : shownHistory.length === 0 ? <Empty icon={SearchX} title="لا توجد نتائج" />
            : shownHistory.map(n => {
              const t = TC[n.type as NType] || TC.info
              const Icon = t.icon
              return (
                <Row key={n.id} style={{ alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: A.text }}>{n.title}</span>
                      <Badge tone={t.tone}>{t.label}</Badge>
                    </div>
                    <div style={{ fontSize: 13, color: A.text2, marginTop: 3, lineHeight: 1.7 }}>{n.message}</div>
                    <div style={{ fontSize: 12, color: A.text3, marginTop: 4 }}>{fmtDate(n.created_at, true)} · أُرسل إلى {n.sent_to_count} منشأة</div>
                  </div>
                  <Btn small kind="ghost" onClick={() => reuse(n)} title="استخدامه نموذجاً لإشعار جديد"><Copy size={14} /> إعادة استخدام</Btn>
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
