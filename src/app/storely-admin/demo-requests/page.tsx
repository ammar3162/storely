'use client'
import { useEffect, useState } from 'react'
import { Trash2, Building2, Store, Phone, Mail, MessageCircle, RefreshCw } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, adminFetch, fmtDate, inputStyle } from '../_admin/kit'

// حالات يدوية — تتحكم فيها أنت لمتابعة التواصل قبل التسجيل
const STATUS_LABELS: Record<string, string> = { new: 'جديد', contacted: 'تم التواصل', rejected: 'مرفوض' }

const digits = (p: string) => String(p || '').replace(/[^0-9]/g, '')

function inviteText(r: any) {
  return [
    `مرحباً ${r.first_name}،`,
    '',
    `شكراً لطلبك عرض ستورلي لإدارة "${r.business_name}".`,
    '',
    'ودّي أوريك النظام مباشرة وأجاوب على أي سؤال عندك — متى يناسبك اتصال سريع 5 دقائق؟',
    '',
    'ولو حاب تبدأ بنفسك، تقدر تسجّل حسابك المجاني (14 يوم بدون بطاقة) من هنا:',
    'https://storely.dev/login?mode=register',
    '',
    'فريق ستورلي',
  ].join('\n')
}

export default function DemoRequestsPage() {
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
    if (!confirm(`حذف طلب العرض من ${r.first_name} ${r.last_name} (${r.business_name})؟\n\nينحذف من القائمة — بياناته تبقى بسجل الإدارة.`)) return
    const d = await adminFetch(`/api/admin/demo-requests?id=${r.id}`, { method: 'DELETE' })
    if (!d.ok) { alert(d.error || 'فشل الحذف'); return }
    setRequests(prev => prev.filter(x => x.id !== r.id))
    window.dispatchEvent(new Event('admin-counts-refresh'))
  }

  async function updateStatus(id: string, status: string) {
    setRequests(prev => prev.map(x => x.id === id ? { ...x, status } : x))
    const d = await adminFetch('/api/admin/demo-requests', { method: 'PATCH', body: { id, status } })
    if (!d.ok) load()
    window.dispatchEvent(new Event('admin-counts-refresh'))
  }

  return (
    <>
      <PageHeader title="طلبات العرض" subtitle={`الطلبات من نموذج «اطلب عرض النظام» بالصفحة الرئيسية (${requests.length}) — لما يسجّل صاحب الطلب حساب، تنعرف حالته تلقائياً من رقم جواله`}
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      {error && <div style={{ marginBottom: 16 }}><Notice tone="danger">{error}</Notice></div>}

      {loading ? <Loading /> : requests.length === 0 ? <Card><Empty title="لا توجد طلبات بعد" /></Card> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map((r: any) => {
            const isPaid = r.liveStatus?.subscription_type && r.liveStatus.subscription_type !== 'trial'
            const phone = digits(r.phone)
            return (
              <Card key={r.id} style={r.matched_org_id ? { borderColor: A.primary } : undefined}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: A.text }}>{r.first_name} {r.last_name}</div>
                    <div style={{ fontSize: 12, color: A.text3, marginTop: 2 }}>{fmtDate(r.created_at, true)}</div>
                  </div>
                  {r.matched_org_id ? (
                    <Badge tone={isPaid ? 'primary' : 'info'}>{isPaid ? 'مشترك مدفوع' : 'أنشأ حساب — في فترة التجربة'}</Badge>
                  ) : (
                    <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)} aria-label="حالة الطلب"
                      style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: 12.5, fontWeight: 700 }}>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  )}
                  <Btn small kind="danger" onClick={() => remove(r)} title="حذف الطلب"><Trash2 size={13} /> حذف</Btn>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, fontSize: 13, marginBottom: r.matched_org_id ? 0 : 14 }}>
                  <Info icon={<Building2 size={15} />}>{r.business_name}</Info>
                  <Info icon={<Store size={15} />}>{r.branch_count || 'عدد الفروع غير محدد'}</Info>
                  <Info icon={<Phone size={15} />}><a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" style={{ color: A.info, direction: 'ltr' }}>{r.phone}</a></Info>
                  <Info icon={<Mail size={15} />}><a href={`mailto:${r.email}`} style={{ color: A.info }}>{r.email}</a></Info>
                </div>

                {!r.matched_org_id && (
                  <a href={`https://wa.me/${phone}?text=${encodeURIComponent(inviteText(r))}`} target="_blank" rel="noreferrer" className="adm-btn adm-btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A.primary, color: 'white', padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                    <MessageCircle size={15} /> تواصل معه عبر واتساب
                  </a>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}

function Info({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: A.text, minWidth: 0 }}>
      <span style={{ color: A.text3, display: 'flex', flexShrink: 0 }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
    </div>
  )
}
