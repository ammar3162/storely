'use client'
import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, AlertTriangle } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, adminFetch, adminKey, fmtDate, useAdmin } from '../_admin/kit'

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

  if (!allowed) return <Card><Empty title="ما عندك صلاحية على هالصفحة" /></Card>
  const latest = logs[0]

  return (
    <>
      <PageHeader title="صحة النظام" subtitle="فحص تلقائي دوري لمشاكل البيانات: منتجات بدون فرع، منشآت بدون فرع فعّال، تكرارات، وغيرها"
        actions={<Btn kind="primary" onClick={runNow} loading={running}><Activity size={14} /> فحص الآن</Btn>} />

      {error && <div style={{ marginBottom: 16 }}><Notice tone="danger">{error}</Notice></div>}

      {latest && (
        <div style={{ marginBottom: 20 }}>
          <Notice tone={latest.issues_count > 0 ? 'danger' : 'primary'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {latest.issues_count > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
              <span>{latest.issues_count > 0 ? `${latest.issues_count} مشكلة مكتشفة` : 'كل شي سليم'}</span>
              <span style={{ fontWeight: 500, color: A.text2, fontSize: 12 }}>· آخر فحص {fmtDate(latest.checked_at, true)}</span>
            </div>
          </Notice>
        </div>
      )}

      {loading ? <Loading /> : (
        <Card title="سجل الفحوصات" pad={0}>
          {logs.length === 0 ? <Empty title="ما فيه سجلات فحص بعد" /> : logs.map(log => (
            <div key={log.id} style={{ padding: '12px 20px', borderBottom: `1px solid ${A.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <Badge tone={log.issues_count > 0 ? 'danger' : 'primary'}>{log.issues_count > 0 ? `${log.issues_count} مشكلة` : 'سليم'}</Badge>
                <span style={{ fontSize: 12, color: A.text3 }}>{fmtDate(log.checked_at, true)}</span>
              </div>
              {(log.issues || []).map((issue: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: A.text, padding: '8px 10px', background: '#f9fafb', borderRadius: 8, marginTop: 8 }}>
                  <Badge tone={issue.severity === 'critical' ? 'danger' : 'warning'}>{issue.severity === 'critical' ? 'حرج' : 'تنبيه'}</Badge>
                  <span><b>{issue.type}:</b> {issue.detail}</span>
                </div>
              ))}
            </div>
          ))}
        </Card>
      )}
    </>
  )
}
