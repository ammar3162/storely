'use client'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, adminFetch, fmtDate, useAdmin } from '../_admin/kit'

export default function NotificationHealthPage() {
  const { can } = useAdmin()
  const allowed = can('view_health')
  const [orgs, setOrgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    const d = await adminFetch('/api/admin/notification-health')
    if (!d.ok || !d.success) setError(d.error || 'تعذّر جلب البيانات')
    else setOrgs(d.orgs || [])
    setLoading(false)
  }
  useEffect(() => { if (allowed) load() }, [allowed])

  if (!allowed) return <Card><Empty title="ما عندك صلاحية على هالصفحة" /></Card>
  const problemOrgs = orgs.filter(o => o.failed > 0 && o.sent === 0)

  return (
    <>
      <PageHeader title="صحة واتساب" subtitle="توصيل إشعارات واتساب لكل عميل — آخر 7 أيام"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      {error && <div style={{ marginBottom: 16 }}><Notice tone="danger">{error}</Notice></div>}

      {problemOrgs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="danger">
            {problemOrgs.length === 1 ? 'عميل واحد' : `${problemOrgs.length} عملاء`} فشلت كل الرسائل لهم آخر 7 أيام — رقمهم غالباً غلط أو غير نشط، ويستحقون تواصل مباشر:
            {' '}{problemOrgs.map(o => o.org_name).join('، ')}
          </Notice>
        </div>
      )}

      {loading ? <Loading /> : (
        <Card pad={0}>
          {orgs.length === 0 ? <Empty title="ما فيه إشعارات مسجّلة آخر 7 أيام" /> : orgs.map(o => {
            const total = o.sent + o.failed
            const allFailed = o.sent === 0 && o.failed > 0
            return (
              <div key={o.org_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${A.border}`, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: A.text }}>{o.org_name}</div>
                  <div style={{ fontSize: 12, color: A.text3, marginTop: 2, direction: 'ltr', textAlign: 'right' }}>{o.phone}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <Badge tone={allFailed ? 'danger' : o.failed ? 'warning' : 'primary'}>وصلت {o.sent} من {total}</Badge>
                  <div style={{ fontSize: 11.5, color: A.text3, marginTop: 4 }}>آخر محاولة {fmtDate(o.last_at, true)}</div>
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </>
  )
}
