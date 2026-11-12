'use client'
import { useEffect, useState } from 'react'
import { Trash2, Building2, Store, Phone, Mail, MessageCircle, RefreshCw, Inbox } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'
import { A, Avatar, Badge, Btn, Card, Empty, LinkBtn, Loading, Notice, PageHeader, Stack, Tabs, adminFetch, fmtDate, inputStyle } from '../kit'

// حالات يدوية — تتحكم فيها أنت لمتابعة التواصل قبل التسجيل
const STATUS_LABELS: Record<string, string> = { new: 'جديد', contacted: 'تم التواصل', rejected: 'مرفوض' }

const digits = (p: string) => String(p || '').replace(/[^0-9]/g, '')

function inviteText(r: any) {
  return [
    `مرحباً ${r.first_name}،`,
    '',
    `شكراً لطلبك عرض نظام Storely لإدارة «${r.business_name}».`,
    '',
    'يسعدنا أن نعرض لك النظام مباشرة ونجيب عن أسئلتك، فما الوقت المناسب لاتصال قصير مدته 5 دقائق؟',
    '',
    'وإن رغبت في البدء بنفسك، يمكنك إنشاء حسابك المجاني (14 يوماً دون بطاقة) من هنا:',
    'https://storely.dev/login?mode=register',
    '',
    'فريق Storely',
  ].join('\n')
}

type View = 'open' | 'matched' | 'all'

export default function DemoRequestsPage() {
  const [view, setView] = useState<View>('open')
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    const d = await adminFetch('/api/admin/demo-requests')
    if (!d.ok) setError(d.error || 'تعذّر جلب الطلبات')
    setRequests(d.requests || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function remove(r: any) {
    if (!(await confirmDialog({ title: 'حذف طلب العرض', message: `حذف طلب العرض من ${r.first_name} ${r.last_name} (${r.business_name})؟\n\nسيُحذف من القائمة، وتبقى بياناته في سجل الإدارة.` }))) return
    const d = await adminFetch(`/api/admin/demo-requests?id=${r.id}`, { method: 'DELETE' })
    if (!d.ok) { toast(d.error || 'تعذّر الحذف', 'error'); return }
    setRequests(prev => prev.filter(x => x.id !== r.id))
    window.dispatchEvent(new Event('admin-counts-refresh'))
  }

  async function updateStatus(id: string, status: string) {
    setRequests(prev => prev.map(x => x.id === id ? { ...x, status } : x))
    const d = await adminFetch('/api/admin/demo-requests', { method: 'PATCH', body: { id, status } })
    if (!d.ok) load()
    window.dispatchEvent(new Event('admin-counts-refresh'))
  }

  const shown = requests.filter(r => view === 'all' ? true : view === 'matched' ? !!r.matched_org_id : !r.matched_org_id && r.status !== 'rejected')

  return (
    <>
      <PageHeader title="طلبات العرض" subtitle="الطلبات الواردة من نموذج «اطلب عرض النظام» في الصفحة الرئيسية. عندما ينشئ صاحب الطلب حساباً، تُعرف حالته تلقائياً من رقم جواله"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      <Stack>
      <div><Tabs items={[
        { k: 'open' as View, l: 'تحتاج متابعة', n: requests.filter(r => !r.matched_org_id && r.status !== 'rejected').length },
        { k: 'matched' as View, l: 'أنشأوا حساباً', n: requests.filter(r => r.matched_org_id).length },
        { k: 'all' as View, l: 'الكل', n: requests.length },
      ]} value={view} onChange={setView} /></div>

      {error && <Notice tone="danger">{error}</Notice>}

      {loading ? <Loading /> : shown.length === 0 ? <Card><Empty icon={Inbox} title={view === 'open' ? 'لا توجد طلبات تحتاج إلى متابعة' : 'لا توجد طلبات'} /></Card> : (
        <Stack gap={12}>
          {shown.map((r: any) => {
            const isPaid = r.liveStatus?.subscription_type && r.liveStatus.subscription_type !== 'trial'
            const phone = digits(r.phone)
            return (
              <Card key={r.id} style={r.matched_org_id ? { borderColor: `${A.primary}66` } : undefined}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                  <Avatar name={r.first_name} size={40} />
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: A.text }}>{r.first_name} {r.last_name}</div>
                    <div style={{ fontSize: 12.5, color: A.text3, marginTop: 2 }}>{fmtDate(r.created_at, true)}</div>
                  </div>
                  {r.matched_org_id ? (
                    <Badge tone={isPaid ? 'primary' : 'info'}>{isPaid ? 'مشترك مدفوع' : 'أنشأ حساباً، وهو في فترة التجربة'}</Badge>
                  ) : (
                    <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)} aria-label="حالة الطلب"
                      style={{ ...inputStyle, width: 'auto', minHeight: 34, padding: '5px 10px', fontSize: 13, fontWeight: 500 }}>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  )}
                  <Btn small kind="ghost" onClick={() => remove(r)} title="حذف الطلب"><Trash2 size={14} /></Btn>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, fontSize: 13, marginBottom: r.matched_org_id ? 0 : 14 }}>
                  <Info icon={<Building2 size={15} />}>{r.business_name}</Info>
                  <Info icon={<Store size={15} />}>{r.branch_count || 'عدد الفروع غير محدد'}</Info>
                  <Info icon={<Phone size={15} />}><a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" style={{ color: A.info, direction: 'ltr' }}>{r.phone}</a></Info>
                  <Info icon={<Mail size={15} />}><a href={`mailto:${r.email}`} style={{ color: A.info }}>{r.email}</a></Info>
                </div>

                {!r.matched_org_id && (
                  <div style={{ paddingTop: 16, borderTop: `1px solid ${A.border}` }}>
                    <LinkBtn kind="primary" href={`https://wa.me/${phone}?text=${encodeURIComponent(inviteText(r))}`}><MessageCircle size={15} /> التواصل عبر واتساب</LinkBtn>
                  </div>
                )}
              </Card>
            )
          })}
        </Stack>
      )}
      </Stack>
    </>
  )
}

function Info({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: A.text, minWidth: 0, fontSize: 13.5 }}>
      <span style={{ color: A.text3, display: 'flex', flexShrink: 0 }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
    </div>
  )
}
