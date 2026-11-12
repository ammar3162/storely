'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, ShieldCheck, Wifi } from 'lucide-react'
import { A, Avatar, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, Row, Stack, adminFetch, fmtDate } from '../kit'
import { planLabel } from '../customers'
import { planKeyOf } from '@/lib/planPricing'

interface OrgGroup {
  ip_address: string
  organizations: { id: string; name: string; plan: string; created_at: string }[]
  first_seen: string
  last_seen: string
}

export default function DuplicateRegistrationsPage() {
  const [groups, setGroups] = useState<OrgGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    const d = await adminFetch('/api/admin/duplicate-registrations')
    if (d.success) setGroups(d.groups || [])
    else setError(d.error || 'تعذّر التحميل')
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <>
      <PageHeader title="تسجيلات مشبوهة" subtitle="منشآت متعددة سُجّلت من عنوان الشبكة (IP) نفسه"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      <Stack>
        <Notice tone="warning">
          مؤشر محتمل (غير مؤكد) على أن شخصاً واحداً يتجاوز حدود الباقة بإنشاء منشآت منفصلة بدلاً من «إضافة فرع». راجع كل حالة قبل اتخاذ أي إجراء،
          فقد يكون السبب طبيعياً مثل شبكة WiFi مشتركة في مكتب أو مقهى.
        </Notice>

      {error && <Notice tone="danger">{error}</Notice>}

      {loading ? <Loading /> : groups.length === 0 ? <Card><Empty icon={ShieldCheck} title="لا توجد حالات مشبوهة حالياً" /></Card> : (
        <Stack gap={16}>
          {groups.map(g => (
            <Card key={g.ip_address} pad={0}
              title={`${g.organizations.length} منشآت من نفس الشبكة`}
              subtitle={`من ${fmtDate(g.first_seen)} إلى ${fmtDate(g.last_seen)}`}
              actions={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: A.text2, padding: '4px 10px', borderRadius: 8, background: A.muted }}><Wifi size={13} /><span style={{ fontFamily: 'ui-monospace, Menlo, monospace', direction: 'ltr' }}>{g.ip_address}</span></span>}>
              {g.organizations.map(o => (
                <Row key={o.id}>
                  <Avatar name={o.name} size={32} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: A.text }}>{o.name}</span>
                  <span style={{ fontSize: 12.5, color: A.text3 }}>{fmtDate(o.created_at)}</span>
                  <Badge tone="info">{planLabel(planKeyOf(o.plan))}</Badge>
                </Row>
              ))}
            </Card>
          ))}
        </Stack>
      )}
      </Stack>
    </>
  )
}
