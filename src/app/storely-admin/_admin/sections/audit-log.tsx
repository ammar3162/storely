'use client'
import { useEffect, useState } from 'react'
import { ScrollText, ChevronDown } from 'lucide-react'
import { A, Avatar, Badge, Btn, Card, Empty, Loading, NoAccess, Notice, PageHeader, Row, SearchBox, Stack, Toolbar, adminFetch, fmtDate, useAdmin } from '../kit'

export default function AuditLogPage() {
  const { can } = useAdmin()
  const allowed = can('view_audit_log')
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  async function load(q = search) {
    setLoading(true); setError('')
    const d = await adminFetch(`/api/admin/audit-log${q ? `?search=${encodeURIComponent(q)}` : ''}`)
    if (!d.ok || !d.success) setError(d.error || 'تعذّر جلب البيانات')
    else setLogs(d.logs || [])
    setLoading(false)
  }
  useEffect(() => { if (allowed) load() }, [allowed])

  if (!allowed) return <NoAccess />

  return (
    <>
      <PageHeader title="سجل التدقيق" subtitle="من نفّذ ماذا ومتى، لكل إجراء إداري حساس مثل التفعيل والحذف والتعديل" />

      <Stack>
      {error && <Notice tone="danger">{error}</Notice>}

      <Card pad={0}>
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} onSubmit={() => load(search)} placeholder="ابحث باسم المشرف أو نوع الإجراء أو اسم المنشأة" />
          <Btn kind="primary" loading={loading} onClick={() => load(search)}>بحث</Btn>
        </Toolbar>
        {loading ? <Loading /> : logs.length === 0 ? <Empty icon={ScrollText} title={search ? 'لا توجد نتائج مطابقة' : 'لا توجد إجراءات مسجّلة بعد'} /> : logs.map(l => (
          <div key={l.id} className="adm-list-row" style={{ borderBottom: `1px solid ${A.border}` }}>
            <Row onClick={l.details ? () => setOpen(open === l.id ? null : l.id) : undefined} style={{ alignItems: 'flex-start', borderBottom: 'none' }}>
              <Avatar name={l.admin_name} size={34} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: A.text }}>{l.admin_name}</span>
                  <Badge tone="neutral"><span dir="ltr">{l.action}</span></Badge>
                </div>
                <div style={{ fontSize: 12.5, color: A.text3, marginTop: 4 }}>{fmtDate(l.created_at, true)}{l.target_org_name ? ` · المنشأة: ${l.target_org_name}` : ''}</div>
              </div>
              {l.details && <ChevronDown size={16} color={A.text3} style={{ transform: open === l.id ? 'rotate(180deg)' : 'none', transition: 'transform .15s', marginTop: 4 }} />}
            </Row>
            {open === l.id && l.details && (
              <pre style={{ margin: '0 20px 16px', padding: '12px 14px', borderRadius: 12, background: A.muted, fontSize: 12, color: A.text2, direction: 'ltr', textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{JSON.stringify(l.details, null, 2)}</pre>
            )}
          </div>
        ))}
      </Card>
      </Stack>
    </>
  )
}
