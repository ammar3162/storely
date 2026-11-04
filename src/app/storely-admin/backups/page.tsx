'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, Download, FileSpreadsheet } from 'lucide-react'
import { A, Btn, Card, Empty, Loading, Notice, PageHeader, adminFetch, fmtDate, useAdmin } from '../_admin/kit'

function fmtSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export default function BackupsPage() {
  const { can } = useAdmin()
  const allowed = can('manage_backups')
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    const d = await adminFetch('/api/admin/list-backups')
    if (!d.ok) setError(d.error || 'تعذّر جلب النسخ')
    else setBackups(d.backups || [])
    setLoading(false)
  }
  useEffect(() => { if (allowed) load() }, [allowed])

  if (!allowed) return <Card><Empty title="ما عندك صلاحية على هالصفحة" /></Card>

  return (
    <>
      <PageHeader title="النسخ الاحتياطية" subtitle="ملفات CSV لكل منشأة — للمراجعة والتحميل اليدوي"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      {error && <div style={{ marginBottom: 16 }}><Notice tone="danger">{error}</Notice></div>}

      {loading ? <Loading /> : backups.length === 0 ? <Card><Empty title="لا توجد نسخ احتياطية بعد" /></Card> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {backups.map((b, i) => (
            <Card key={i} title={b.org_name} subtitle={`${b.files.length} ملف`} pad={0}>
              {b.files.map((f: any, j: number) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${A.border}` }}>
                  <FileSpreadsheet size={18} color={A.text3} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: A.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: A.text3, marginTop: 2 }}>{fmtDate(f.created_at, true)} · {fmtSize(f.size)}</div>
                  </div>
                  {f.url && (
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: `1px solid ${A.borderStrong}`, color: A.text, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                      <Download size={14} /> تحميل
                    </a>
                  )}
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
