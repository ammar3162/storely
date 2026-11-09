'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, MessageCircle, Send, XCircle, Percent, SearchX } from 'lucide-react'
import { A, Avatar, Badge, Btn, Card, Empty, Loading, NoAccess, Notice, PageHeader, Row, SearchBox, Stack, Stat, StatGrid, Tabs, Toolbar, adminFetch, fmtDate, useAdmin } from '../_admin/kit'

export default function NotificationHealthPage() {
  const { can } = useAdmin()
  const allowed = can('view_health')
  const [orgs, setOrgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [view, setView] = useState<'all' | 'problems'>('all')

  async function load() {
    setLoading(true); setError('')
    const d = await adminFetch('/api/admin/notification-health')
    if (!d.ok || !d.success) setError(d.error || 'تعذّر جلب البيانات')
    else setOrgs(d.orgs || [])
    setLoading(false)
  }
  useEffect(() => { if (allowed) load() }, [allowed])

  if (!allowed) return <NoAccess />
  const problemOrgs = orgs.filter(o => o.failed > 0 && o.sent === 0)
  const totSent = orgs.reduce((t, o) => t + (o.sent || 0), 0)
  const totFailed = orgs.reduce((t, o) => t + (o.failed || 0), 0)
  const rate = totSent + totFailed ? Math.round((totSent / (totSent + totFailed)) * 100) : 100
  const shown = orgs.filter(o => (view === 'all' || o.failed > 0) && (!q.trim() || o.org_name?.includes(q.trim()) || String(o.phone || '').includes(q.trim())))

  return (
    <>
      <PageHeader title="صحة واتساب" subtitle="نسبة وصول إشعارات واتساب لكل عميل خلال آخر 7 أيام"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      <Stack>
      {error && <Notice tone="danger">{error}</Notice>}

      {!loading && orgs.length > 0 && (
        <StatGrid>
          <Stat icon={Percent} label="نسبة الوصول" value={`${rate}%`} tone={rate >= 95 ? 'primary' : rate >= 80 ? 'warning' : 'danger'} />
          <Stat icon={Send} label="رسائل وصلت" value={totSent.toLocaleString('en')} />
          <Stat icon={XCircle} label="رسائل تعذّر وصولها" value={totFailed.toLocaleString('en')} tone={totFailed ? 'danger' : 'default'} />
          <Stat icon={MessageCircle} label="عملاء لم تصلهم أي رسالة" value={problemOrgs.length} tone={problemOrgs.length ? 'danger' : 'default'} onClick={problemOrgs.length ? () => setView('problems') : undefined} />
        </StatGrid>
      )}

      {problemOrgs.length > 0 && (
        <Notice tone="danger">
          {problemOrgs.length === 1 ? 'عميل واحد' : `${problemOrgs.length} عملاء`} تعذّر وصول كل الرسائل إليهم خلال آخر 7 أيام، وغالباً رقمهم غير صحيح أو غير نشط، فيُنصح بالتواصل معهم مباشرة:
          {' '}{problemOrgs.map(o => o.org_name).join('، ')}
        </Notice>
      )}

      {loading ? <Loading /> : (
        <Card pad={0}>
          <Toolbar>
            <SearchBox value={q} onChange={setQ} placeholder="ابحث باسم المنشأة أو الجوال" />
            <Tabs items={[{ k: 'all' as const, l: 'الكل', n: orgs.length }, { k: 'problems' as const, l: 'فيها تعذّر', n: orgs.filter(o => o.failed > 0).length }]} value={view} onChange={setView} />
          </Toolbar>
          {orgs.length === 0 ? <Empty icon={MessageCircle} title="لا توجد إشعارات مسجّلة خلال آخر 7 أيام" /> : shown.length === 0 ? <Empty icon={SearchX} title="لا توجد نتائج" /> : shown.map(o => {
            const total = o.sent + o.failed
            const allFailed = o.sent === 0 && o.failed > 0
            const pct = total ? Math.round((o.sent / total) * 100) : 0
            return (
              <Row key={o.org_id} style={{ flexWrap: 'wrap' }}>
                <Avatar name={o.org_name} size={34} />
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: A.text }}>{o.org_name}</div>
                  <div style={{ fontSize: 12.5, color: A.text3, marginTop: 2 }}><span dir="ltr">{o.phone}</span> · آخر محاولة {fmtDate(o.last_at, true)}</div>
                </div>
                <div style={{ width: 140, height: 6, borderRadius: 99, background: A.muted, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: allFailed ? A.danger : o.failed ? A.warning : A.primary, borderRadius: 99 }} />
                </div>
                <Badge tone={allFailed ? 'danger' : o.failed ? 'warning' : 'primary'}>وصلت {o.sent} من {total}</Badge>
              </Row>
            )
          })}
        </Card>
      )}
      </Stack>
    </>
  )
}
