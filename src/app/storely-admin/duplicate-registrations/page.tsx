'use client'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, adminFetch, fmtDate } from '../_admin/kit'

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
      <PageHeader title="تسجيلات مشبوهة" subtitle="منشآت متعددة انسجّلت من نفس عنوان الشبكة (IP)"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      <div style={{ marginBottom: 16 }}>
        <Notice tone="warning">
          مؤشر محتمل (مو مؤكد) إن شخص واحد يتحايل على حدود الباقة بمنشآت منفصلة بدل «إضافة فرع». راجع كل حالة قبل أي إجراء —
          ممكن يكون السبب طبيعي مثل شبكة WiFi مشتركة في مكتب أو كافيه.
        </Notice>
      </div>

      {error && <div style={{ marginBottom: 16 }}><Notice tone="danger">{error}</Notice></div>}

      {loading ? <Loading /> : groups.length === 0 ? <Card><Empty title="ما فيه أي حالة مشبوهة حالياً" /></Card> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map(g => (
            <Card key={g.ip_address} pad={0}
              title={`${g.organizations.length} منشآت من نفس الشبكة`}
              subtitle={`من ${fmtDate(g.first_seen)} إلى ${fmtDate(g.last_seen)}`}
              actions={<span style={{ fontSize: 12.5, color: A.text2, fontFamily: 'monospace', direction: 'ltr' }}>{g.ip_address}</span>}>
              {g.organizations.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${A.border}` }}>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: A.text }}>{o.name}</span>
                  <span style={{ fontSize: 12, color: A.text3 }}>{fmtDate(o.created_at)}</span>
                  <Badge tone="info">{o.plan}</Badge>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
