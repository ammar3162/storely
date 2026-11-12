'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, Download, FileSpreadsheet, HardDrive, ChevronDown, SearchX } from 'lucide-react'
import { A, Avatar, Btn, Card, Empty, LinkBtn, Loading, NoAccess, Notice, PageHeader, Row, SearchBox, Stack, Toolbar, adminFetch, fmtDate, useAdmin } from '../kit'

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
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<number | null>(null)

  async function load() {
    setLoading(true); setError('')
    const d = await adminFetch('/api/admin/list-backups')
    if (!d.ok) setError(d.error || 'تعذّر جلب النسخ')
    else setBackups(d.backups || [])
    setLoading(false)
  }
  useEffect(() => { if (allowed) load() }, [allowed])

  if (!allowed) return <NoAccess />

  return (
    <>
      <PageHeader title="النسخ الاحتياطية" subtitle="ملفات CSV لكل منشأة، للمراجعة والتحميل اليدوي"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      <Stack>
      {error && <Notice tone="danger">{error}</Notice>}

      {loading ? <Loading /> : backups.length === 0 ? <Card><Empty icon={HardDrive} title="لا توجد نسخ احتياطية بعد" /></Card> : (
        <Card pad={0} title="المنشآت" subtitle={`${backups.length} منشأة · ${backups.reduce((t, b) => t + b.files.length, 0)} ملف`}>
          <Toolbar><SearchBox value={q} onChange={setQ} placeholder="ابحث باسم المنشأة" /></Toolbar>
          {(() => {
            const list = backups.map((b, i) => ({ b, i })).filter(({ b }) => !q.trim() || b.org_name?.includes(q.trim()))
            if (!list.length) return <Empty icon={SearchX} title="لا توجد نتائج" />
            return list.map(({ b, i }) => {
              const last = b.files.reduce((m: string, f: any) => (f.created_at > m ? f.created_at : m), '')
              return (
                <div key={i} className="adm-list-row" style={{ borderBottom: `1px solid ${A.border}` }}>
                  <Row onClick={() => setOpen(open === i ? null : i)} style={{ borderBottom: 'none' }}>
                    <Avatar name={b.org_name} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{b.org_name}</div>
                      <div style={{ fontSize: 12.5, color: A.text3, marginTop: 2 }}>{b.files.length} ملف{last ? ` · آخر نسخة ${fmtDate(last, true)}` : ''}</div>
                    </div>
                    <ChevronDown size={16} color={A.text3} style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                  </Row>
                  {open === i && (
                    <div style={{ margin: '0 20px 16px', border: `1px solid ${A.border}`, borderRadius: 12, overflow: 'hidden' }}>
                      {b.files.map((f: any, j: number) => (
                        <Row key={j} style={{ padding: '10px 14px' }}>
                          <FileSpreadsheet size={18} color={A.text3} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: A.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="ltr">{f.name}</div>
                            <div style={{ fontSize: 12, color: A.text3, marginTop: 2 }}>{fmtDate(f.created_at, true)} · {fmtSize(f.size)}</div>
                          </div>
                          {f.url && <LinkBtn small href={f.url}><Download size={14} /> تحميل</LinkBtn>}
                        </Row>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </Card>
      )}
      </Stack>
    </>
  )
}
