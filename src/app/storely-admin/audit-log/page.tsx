'use client'
import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { A, Btn, Card, Empty, Loading, Notice, PageHeader, adminFetch, fmtDate, inputStyle, useAdmin } from '../_admin/kit'

export default function AuditLogPage() {
  const { can } = useAdmin()
  const allowed = can('view_audit_log')
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  async function load(q = search) {
    setLoading(true); setError('')
    const d = await adminFetch(`/api/admin/audit-log${q ? `?search=${encodeURIComponent(q)}` : ''}`)
    if (!d.ok || !d.success) setError(d.error || 'تعذّر جلب البيانات')
    else setLogs(d.logs || [])
    setLoading(false)
  }
  useEffect(() => { if (allowed) load() }, [allowed])

  if (!allowed) return <Card><Empty title="ما عندك صلاحية على هالصفحة" /></Card>

  return (
    <>
      <PageHeader title="سجل التدقيق" subtitle="مين سوّى إيش ومتى — كل إجراء إداري حساس (تفعيل، حذف، تعديل)" />

      <form onSubmit={e => { e.preventDefault(); load(search) }} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم المشرف، نوع الإجراء، أو اسم المنشأة"
          style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
        <Btn kind="primary" type="submit" loading={loading}><Search size={14} /> بحث</Btn>
        {search && <Btn onClick={() => { setSearch(''); load('') }}><X size={14} /> مسح</Btn>}
      </form>

      {error && <div style={{ marginBottom: 16 }}><Notice tone="danger">{error}</Notice></div>}

      {loading ? <Loading /> : (
        <Card pad={0}>
          {logs.length === 0 ? <Empty title={search ? 'ما فيه نتائج مطابقة' : 'ما فيه إجراءات مسجّلة بعد'} /> : logs.map(l => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${A.border}`, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: A.text }}>{l.action}</div>
                <div style={{ fontSize: 12.5, color: A.text2, marginTop: 3 }}>{l.admin_name}{l.target_org_name ? ` · على منشأة: ${l.target_org_name}` : ''}</div>
                {l.details && <div style={{ fontSize: 11.5, color: A.text3, marginTop: 4, fontFamily: 'monospace', direction: 'ltr', textAlign: 'right', wordBreak: 'break-all' }}>{JSON.stringify(l.details)}</div>}
              </div>
              <span style={{ fontSize: 12, color: A.text3, whiteSpace: 'nowrap' }}>{fmtDate(l.created_at, true)}</span>
            </div>
          ))}
        </Card>
      )}
    </>
  )
}
