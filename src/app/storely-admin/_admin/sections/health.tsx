'use client'
import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, AlertTriangle, ShieldCheck, Clock, ListChecks } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Loading, NoAccess, Notice, PageHeader, Row, Stack, Stat, StatGrid, adminFetch, adminKey, fmtDate, useAdmin } from '../kit'

export default function HealthPage() {
  const { can } = useAdmin()
  const allowed = can('view_health')
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  async function load() {
    setLoading(true); setError('')
    const d = await adminFetch('/api/admin/health-logs')
    if (!d.ok || !d.success) setError(d.error || 'تعذّر جلب البيانات')
    else setLogs(d.logs || [])
    setLoading(false)
  }
  useEffect(() => { if (allowed) load() }, [allowed])

  async function runNow() {
    setRunning(true)
    try { await fetch('/api/health-check', { headers: { 'x-admin-key': adminKey() } }) } catch {}
    setRunning(false)
    load()
  }

  if (!allowed) return <NoAccess />
  const latest = logs[0]

  return (
    <>
      <PageHeader title="صحة النظام" subtitle="فحص تلقائي دوري لمشكلات البيانات، مثل منتجات بلا فرع، ومنشآت بلا فرع فعّال، والسجلات المكررة"
        actions={<Btn kind="primary" onClick={runNow} loading={running}><Activity size={14} /> فحص الآن</Btn>} />

      <Stack>
      {error && <Notice tone="danger">{error}</Notice>}

      {latest && (
        <StatGrid>
          <Stat icon={latest.issues_count > 0 ? AlertTriangle : ShieldCheck} label="الحالة الحالية" value={latest.issues_count > 0 ? `${latest.issues_count} مشكلة` : 'سليم'} tone={latest.issues_count > 0 ? 'danger' : 'primary'} />
          <Stat icon={Clock} label="آخر فحص" value={<span style={{ fontSize: 18 }}>{fmtDate(latest.checked_at, true)}</span>} />
          <Stat icon={ListChecks} label="الفحوصات المسجّلة" value={logs.length} hint={`${logs.filter(l => l.issues_count > 0).length} منها فيها مشكلات`} />
        </StatGrid>
      )}

      {loading ? <Loading /> : (
        <Card title="سجل الفحوصات" pad={0}>
          {logs.length === 0 ? <Empty icon={Activity} title="لا توجد سجلات فحص بعد" hint="اضغط «فحص الآن» لتشغيل أول فحص" /> : logs.map(log => (
            <Row key={log.id} style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {log.issues_count > 0 ? <AlertTriangle size={16} color={A.danger} /> : <CheckCircle2 size={16} color={A.primary} />}
                  <Badge tone={log.issues_count > 0 ? 'danger' : 'primary'}>{log.issues_count > 0 ? `${log.issues_count} مشكلة` : 'سليم'}</Badge>
                </span>
                <span style={{ fontSize: 12.5, color: A.text3 }}>{fmtDate(log.checked_at, true)}</span>
              </div>
              {(log.issues || []).map((issue: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: A.text, padding: '10px 12px', background: A.muted, borderRadius: 10, marginTop: 8, lineHeight: 1.7 }}>
                  <Badge tone={issue.severity === 'critical' ? 'danger' : 'warning'}>{issue.severity === 'critical' ? 'حرج' : 'تنبيه'}</Badge>
                  <span><b style={{ fontWeight: 600 }}>{issue.type}:</b> {issue.detail}</span>
                </div>
              ))}
            </Row>
          ))}
        </Card>
      )}
      </Stack>
    </>
  )
}
