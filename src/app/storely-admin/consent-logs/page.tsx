'use client'
import { useEffect, useState } from 'react'
import { Download, Search, X } from 'lucide-react'
import { A, Btn, Card, Empty, Field, Loading, Notice, PageHeader, Table, adminFetch, fmtDate, inputStyle, td, useAdmin } from '../_admin/kit'

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
    else { setCurrentVersion(d.version); setVersionMsg({ ok: true, t: 'تم التحديث — كل المالكين بيشوفون نافذة الموافقة بأول دخول لهم' }) }
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

  if (!allowed) return <Card><Empty title="ما عندك صلاحية على هالصفحة" /></Card>
  const versionUnchanged = versionSaving || !newVersion.trim() || newVersion === currentVersion

  return (
    <>
      <PageHeader title="سجلات الموافقة" subtitle="توثيق قانوني لموافقة كل عميل على الشروط: الوقت، نسخة الشروط، IP، الجهاز"
        actions={<Btn onClick={exportCSV} disabled={logs.length === 0}><Download size={14} /> تصدير CSV</Btn>} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="نسخة الشروط" subtitle={`الحالية: ${currentVersion || '...'}`}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Field label="رقم النسخة الجديد" hint="تحديث النسخة يطلب من كل المالكين الموافقة من جديد بأول دخول — بعد نشر التعديل في صفحة /terms">
                <input value={newVersion} onChange={e => setNewVersion(e.target.value)} placeholder="مثلاً 2026-11" style={inputStyle} />
              </Field>
            </div>
            <div style={{ marginBottom: 22 }}><Btn kind="primary" onClick={updateVersion} loading={versionSaving} disabled={versionUnchanged}>تحديث النسخة</Btn></div>
          </div>
          {versionMsg && <div style={{ marginTop: 10 }}><Notice tone={versionMsg.ok ? 'primary' : 'danger'}>{versionMsg.t}</Notice></div>}
        </Card>

        <form onSubmit={e => { e.preventDefault(); load(search) }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم، الجوال، أو اسم المنشأة" style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
          <Btn kind="primary" type="submit" loading={loading}><Search size={14} /> بحث</Btn>
          {search && <Btn onClick={() => { setSearch(''); load('') }}><X size={14} /> مسح</Btn>}
        </form>

        {error && <Notice tone="danger">{error}</Notice>}

        {loading ? <Loading /> : (
          <Card pad={0}>
            {logs.length === 0 ? <Empty title={search ? 'ما فيه نتائج مطابقة' : 'ما فيه سجلات موافقة بعد'} /> : (
              <Table head={['التاريخ والوقت', 'المنشأة', 'الاسم', 'الجوال', 'نسخة الشروط', 'IP']}>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ ...td, color: A.text2, whiteSpace: 'nowrap' }}>{fmtDate(l.accepted_at, true)}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{l.org_name}</td>
                    <td style={td}>{l.profile_name}</td>
                    <td style={{ ...td, direction: 'ltr', textAlign: 'right' }}>{l.profile_phone}</td>
                    <td style={td}>{l.terms_version}</td>
                    <td style={{ ...td, color: A.text3, fontSize: 12, direction: 'ltr', textAlign: 'right' }}>{l.ip_address || '—'}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        )}
      </div>
    </>
  )
}
