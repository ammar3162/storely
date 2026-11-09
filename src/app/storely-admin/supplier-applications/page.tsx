'use client'
import { useEffect, useState } from 'react'
import { MessageCircle, RefreshCw, Globe, Truck, Check, X, Trash2, Phone, Mail, User } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { A, Avatar, Badge, Btn, Card, Empty, LinkBtn, Loading, PageHeader, Stack, Tabs, adminFetch, fmtDate } from '../_admin/kit'

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
    if (!(await confirmDialog({ title: rejected ? 'رفض الطلب' : 'حذف الطلب', message: `${rejected ? 'رفض' : 'حذف'} طلب «${a.company_name}»؟ سيُحذف الطلب من القائمة.` }))) return
    setBusy(a.id)
    await adminFetch(`/api/admin/supplier-applications?id=${encodeURIComponent(a.id)}`, { method: 'DELETE' })
    await log(rejected ? 'supplier_application_rejected' : 'delete_supplier_application', a.company_name)
    setBusy(null); load()
  }

  const pending = apps.filter(a => a.status === 'pending')
  const shown = tab === 'pending' ? pending : apps

  return (
    <>
      <PageHeader title="طلبات الموردين" subtitle="موردون طلبوا الانضمام إلى سوق Storely"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      <Stack>
      <div><Tabs items={[{ k: 'pending' as const, l: 'بانتظار المراجعة', n: pending.length }, { k: 'all' as const, l: 'الكل', n: apps.length }]} value={tab} onChange={setTab} /></div>

      {loading ? <Loading /> : shown.length === 0 ? <Card><Empty icon={Truck} title={tab === 'pending' ? 'لا توجد طلبات بانتظار المراجعة' : 'لا توجد طلبات'} /></Card> : (
        <Stack gap={12}>
          {shown.map(a => {
            const st = STATUS[a.status as keyof typeof STATUS] || STATUS.pending
            const phone = String(a.phone || '').replace(/\D/g, '')
            return (
              <Card key={a.id}>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <Avatar name={a.company_name} size={44} />
                  <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{a.company_name}</div>
                      <Badge tone={st.t}>{st.l}</Badge>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: A.text2, marginTop: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><User size={13} color={A.text3} />{a.contact_name}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Phone size={13} color={A.text3} /><span dir="ltr">{a.phone}</span></span>
                      {a.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Mail size={13} color={A.text3} /><span dir="ltr">{a.email}</span></span>}
                      {isSafeUrl(a.website) && <a href={a.website} target="_blank" rel="noopener noreferrer" style={{ color: A.info, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Globe size={13} /> الموقع</a>}
                    </div>
                    {a.business_type?.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {a.business_type.map((t: string) => <Badge key={t}>{t}</Badge>)}
                      </div>
                    )}
                    {a.description && <div style={{ fontSize: 13.5, color: A.text2, marginTop: 12, lineHeight: 1.8, padding: '10px 12px', background: A.muted, borderRadius: 10 }}>{a.description}</div>}
                    <div style={{ fontSize: 12.5, color: A.text3, marginTop: 10 }}>{fmtDate(a.created_at, true)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {phone && <LinkBtn href={`https://wa.me/${phone}`}><MessageCircle size={14} /> واتساب</LinkBtn>}
                    {a.status === 'pending' && <>
                      <Btn kind="primary" loading={busy === a.id} onClick={() => approve(a)}><Check size={15} /> قبول</Btn>
                      <Btn kind="danger" disabled={busy === a.id} onClick={() => remove(a, true)}><X size={15} /> رفض</Btn>
                    </>}
                    {a.status !== 'pending' && <Btn kind="ghost" disabled={busy === a.id} onClick={() => remove(a, false)} title="حذف الطلب"><Trash2 size={14} /></Btn>}
                  </div>
                </div>
              </Card>
            )
          })}
        </Stack>
      )}
      </Stack>
    </>
  )
}
