'use client'
import { useEffect, useState } from 'react'
import { Download, FileCheck } from 'lucide-react'
import { A, Avatar, Badge, Btn, Card, Empty, Field, Loading, NoAccess, Notice, PageHeader, SearchBox, Stack, Table, Toolbar, adminFetch, fmtDate, inputStyle, td, useAdmin } from '../kit'

export default function ConsentLogsPage() {
  const { can } = useAdmin()
  const allowed = can('view_consent_logs')
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [currentVersion, setCurrentVersion] = useState('')
  const [newVersion, setNewVersion] = useState('')
  const [versionSaving, setVersionSaving] = useState(false)
  const [versionMsg, setVersionMsg] = useState<{ ok: boolean; t: string } | null>(null)

  async function loadVersion() {
    try {
      const d = await fetch('/api/terms-version').then(r => r.json())
      setCurrentVersion(d.version); setNewVersion(d.version)
    } catch {}
  }

  async function updateVersion() {
    if (!newVersion.trim() || newVersion === currentVersion) return
    setVersionSaving(true); setVersionMsg(null)
    const d = await adminFetch('/api/terms-version', { method: 'POST', body: { version: newVersion.trim() } })
    if (!d.ok) setVersionMsg({ ok: false, t: d.error || 'تعذّر التحديث' })
    else { setCurrentVersion(d.version); setVersionMsg({ ok: true, t: 'تم التحديث، وستظهر نافذة الموافقة لجميع المالكين عند أول دخول لهم' }) }
    setVersionSaving(false)
  }

  async function load(q = search) {
    setLoading(true); setError('')
    const d = await adminFetch(`/api/admin/consent-logs${q ? `?search=${encodeURIComponent(q)}` : ''}`)
    if (!d.ok || !d.success) setError(d.error || 'تعذّر جلب البيانات')
    else setLogs(d.logs || [])
    setLoading(false)
  }
  useEffect(() => { if (allowed) { load(); loadVersion() } }, [allowed])

  function exportCSV() {
    if (logs.length === 0) return
    const headers = ['التاريخ والوقت', 'المنشأة', 'الاسم', 'الجوال', 'نسخة الشروط', 'عنوان IP', 'الجهاز']
    const rows = logs.map(l => [fmtDate(l.accepted_at, true), l.org_name, l.profile_name, l.profile_phone, l.terms_version, l.ip_address || '—', l.user_agent || '—'])
    const csv = '﻿' + [headers, ...rows].map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `consent-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  if (!allowed) return <NoAccess />
  const versionUnchanged = versionSaving || !newVersion.trim() || newVersion === currentVersion

  return (
    <>
      <PageHeader title="سجلات الموافقة" subtitle="توثيق قانوني لموافقة كل عميل على الشروط: الوقت ونسخة الشروط وعنوان IP والجهاز"
        actions={<Btn onClick={exportCSV} disabled={logs.length === 0}><Download size={14} /> تصدير CSV</Btn>} />

      <Stack>
        <Card title="نسخة الشروط" subtitle={`الحالية: ${currentVersion || '...'}`}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Field label="رقم النسخة الجديد" hint="تحديث النسخة يطلب من جميع المالكين الموافقة من جديد عند أول دخول، فحدّثها بعد نشر التعديل في صفحة /terms">
                <input value={newVersion} onChange={e => setNewVersion(e.target.value)} placeholder="مثلاً 2026-11" style={inputStyle} />
              </Field>
            </div>
            <div style={{ marginBottom: 22 }}><Btn kind="primary" onClick={updateVersion} loading={versionSaving} disabled={versionUnchanged}>تحديث النسخة</Btn></div>
          </div>
          {versionMsg && <div style={{ marginTop: 10 }}><Notice tone={versionMsg.ok ? 'primary' : 'danger'}>{versionMsg.t}</Notice></div>}
        </Card>

        {error && <Notice tone="danger">{error}</Notice>}

        <Card pad={0} title="سجل الموافقات" subtitle={loading ? undefined : `${logs.length} موافقة`}>
            <Toolbar>
              <SearchBox value={search} onChange={setSearch} onSubmit={() => load(search)} placeholder="ابحث بالاسم أو الجوال أو اسم المنشأة" />
              <Btn kind="primary" loading={loading} onClick={() => load(search)}>بحث</Btn>
            </Toolbar>
            {loading ? <Loading /> : logs.length === 0 ? <Empty icon={FileCheck} title={search ? 'لا توجد نتائج مطابقة' : 'لا توجد سجلات موافقة بعد'} /> : (
              <Table head={['التاريخ والوقت', 'المنشأة', 'الاسم', 'الجوال', 'نسخة الشروط', 'IP']}>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ ...td, color: A.text2, whiteSpace: 'nowrap' }}>{fmtDate(l.accepted_at, true)}</td>
                    <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={l.org_name} size={30} /><span style={{ fontWeight: 600 }}>{l.org_name}</span></div></td>
                    <td style={td}>{l.profile_name}</td>
                    <td style={{ ...td, direction: 'ltr', textAlign: 'right' }}>{l.profile_phone}</td>
                    <td style={td}><Badge tone={l.terms_version === currentVersion ? 'primary' : 'neutral'}>{l.terms_version}</Badge></td>
                    <td style={{ ...td, color: A.text3, fontSize: 12, direction: 'ltr', textAlign: 'right' }}>{l.ip_address || '—'}</td>
                  </tr>
                ))}
              </Table>
            )}
        </Card>
      </Stack>
    </>
  )
}
