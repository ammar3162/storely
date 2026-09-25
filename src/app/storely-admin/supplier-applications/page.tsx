'use client'
import { useEffect, useState } from 'react'
import { MessageCircle, RefreshCw, Globe } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { A, Badge, Btn, Card, Empty, Loading, PageHeader, adminFetch, fmtDate } from '../_admin/kit'

const isSafeUrl = (u?: string | null) => !!u && /^https?:\/\//i.test(u.trim())
const STATUS = { pending: { l: 'بانتظار المراجعة', t: 'warning' }, approved: { l: 'مقبول', t: 'primary' }, rejected: { l: 'مرفوض', t: 'danger' } } as const

export default function SupplierApplicationsPage() {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const j = await adminFetch('/api/admin/supplier-applications')
    setApps(j.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function log(action: string, company?: string) {
    await adminFetch('/api/admin/log-action', { method: 'POST', body: { action, details: { company_name: company } } })
  }

  async function approve(a: any) {
    setBusy(a.id)
    await adminFetch('/api/admin/supplier-applications', { method: 'POST', body: { id: a.id, status: 'approved' } })
    await log('supplier_application_approved', a.company_name)
    setBusy(null); load()
  }

  async function remove(a: any, rejected: boolean) {
    if (!(await confirmDialog({ title: rejected ? 'رفض الطلب' : 'حذف الطلب', message: `${rejected ? 'رفض' : 'حذف'} طلب "${a.company_name}"؟ الطلب ينحذف من القائمة.` }))) return
    setBusy(a.id)
    await adminFetch(`/api/admin/supplier-applications?id=${encodeURIComponent(a.id)}`, { method: 'DELETE' })
    await log(rejected ? 'supplier_application_rejected' : 'delete_supplier_application', a.company_name)
    setBusy(null); load()
  }

  const pending = apps.filter(a => a.status === 'pending')
  const shown = tab === 'pending' ? pending : apps

  return (
    <>
      <PageHeader title="طلبات الموردين" subtitle="موردون طلبوا الانضمام لسوق Storely"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {([['pending', `بانتظار المراجعة (${pending.length})`], ['all', `الكل (${apps.length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className="adm-btn"
            style={{ padding: '7px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              border: `1px solid ${tab === k ? A.primary : A.border}`, background: tab === k ? A.primary : A.surface, color: tab === k ? 'white' : A.text2 }}>{l}</button>
        ))}
      </div>

      {loading ? <Loading /> : shown.length === 0 ? <Card><Empty title={tab === 'pending' ? 'ما فيه طلبات تنتظر المراجعة' : 'ما فيه طلبات'} /></Card> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shown.map(a => {
            const st = STATUS[a.status as keyof typeof STATUS] || STATUS.pending
            const phone = String(a.phone || '').replace(/\D/g, '')
            return (
              <Card key={a.id} pad={18}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>{a.company_name}</div>
                      <Badge tone={st.t}>{st.l}</Badge>
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: A.text2, marginTop: 8 }}>
                      <span>{a.contact_name}</span>
                      <span dir="ltr">{a.phone}</span>
                      {a.email && <span dir="ltr">{a.email}</span>}
                      {isSafeUrl(a.website) && <a href={a.website} target="_blank" rel="noopener noreferrer" style={{ color: A.info, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Globe size={13} /> الموقع</a>}
                    </div>
                    {a.business_type?.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {a.business_type.map((t: string) => <Badge key={t}>{t}</Badge>)}
                      </div>
                    )}
                    {a.description && <div style={{ fontSize: 13, color: A.text2, marginTop: 10, lineHeight: 1.7 }}>{a.description}</div>}
                    <div style={{ fontSize: 12, color: A.text3, marginTop: 10 }}>{fmtDate(a.created_at, true)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {phone && <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}><Btn><MessageCircle size={14} /> واتساب</Btn></a>}
                    {a.status === 'pending' && <>
                      <Btn kind="primary" loading={busy === a.id} onClick={() => approve(a)}>قبول</Btn>
                      <Btn kind="danger" disabled={busy === a.id} onClick={() => remove(a, true)}>رفض</Btn>
                    </>}
                    {a.status !== 'pending' && <Btn kind="ghost" disabled={busy === a.id} onClick={() => remove(a, false)}>حذف</Btn>}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
