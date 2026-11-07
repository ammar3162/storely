'use client'
import { useState, useEffect } from 'react'
import { Download, Search } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyEmptyState, StorelyPageHeader } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

export default function ConsentLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [currentVersion, setCurrentVersion] = useState('')
  const [newVersion, setNewVersion] = useState('')
  const [versionSaving, setVersionSaving] = useState(false)
  const [versionMsg, setVersionMsg] = useState('')

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.authenticated || (data.admin?.role !== 'super_admin' && !data.admin?.permissions?.view_consent_logs)) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  useEffect(() => { if (authChecked) { load(); loadVersion() } }, [authChecked])

  async function loadVersion() {
    try {
      const data = await fetch('/api/terms-version').then(r=>r.json())
      setCurrentVersion(data.version); setNewVersion(data.version)
    } catch {}
  }

  async function updateVersion() {
    if (!newVersion.trim() || newVersion === currentVersion) return
    setVersionSaving(true); setVersionMsg('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const res = await fetch('/api/terms-version', {
        method: 'POST', headers: { 'Content-Type':'application/json', 'x-admin-key': key },
        body: JSON.stringify({ version: newVersion.trim() })
      })
      const data = await res.json()
      if (!res.ok) { setVersionMsg('خطأ: ' + (data.error||'')); setVersionSaving(false); return }
      setCurrentVersion(data.version)
      setVersionMsg('✅ تم التحديث — كل المستخدمين الحاليين بيشوفون نافذة الموافقة بأول دخول لهم')
    } catch { setVersionMsg('حدث خطأ') }
    setVersionSaving(false)
  }

  async function load(searchTerm?: string) {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const q = searchTerm !== undefined ? searchTerm : search
      const res = await fetch(`/api/admin/consent-logs${q ? `?search=${encodeURIComponent(q)}` : ''}`, { headers: { 'x-admin-key': key } })
      const data = await res.json()
      if (!res.ok || !data.success) { setError('حدث خطأ بجلب البيانات'); setLoading(false); return }
      setLogs(data.logs || [])
    } catch { setError('حدث خطأ') }
    setLoading(false)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    load(search)
  }

  function exportCSV() {
    if (logs.length === 0) return
    const headers = ['التاريخ والوقت', 'المؤسسة', 'الاسم', 'الجوال', 'نسخة الشروط', 'عنوان IP', 'الجهاز']
    const rows = logs.map(l => [
      new Date(l.accepted_at).toLocaleString('ar-SA', {numberingSystem:'latn'}),
      l.org_name, l.profile_name, l.profile_phone, l.terms_version, l.ip_address || '—', l.user_agent || '—',
    ])
    const csv = '\ufeff' + [headers, ...rows].map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `consent-logs-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  if (!authChecked) return (
    <div className="storely-loading" dir="rtl">جاري التحقق...</div>
  )

  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      <StorelyPageHeader title="سجلات الموافقة على الشروط" description="توثيق قانوني لموافقة كل عميل — الوقت، نسخة الشروط، IP، الجهاز"
        actions={<StorelyButton onClick={exportCSV} disabled={logs.length===0} icon={<Download size={16}/>}>تصدير CSV</StorelyButton>} />
      <StorelyCard>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="text-base font-semibold">نسخة الشروط الحالية: <span className="font-mono" dir="ltr">{currentVersion||'...'}</span></div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-64">
              <input value={newVersion} onChange={e=>setNewVersion(e.target.value)} placeholder="رقم النسخة الجديد (مثلاً 2026-09)" className="storely-input"/>
            </div>
            <StorelyButton onClick={updateVersion} disabled={versionSaving||!newVersion.trim()||newVersion===currentVersion} variant="primary">{versionSaving?'...':'تحديث النسخة'}</StorelyButton>
          </div>
          {versionMsg && <div className="storely-notice" style={{color:versionMsg.startsWith('✅')?storelyTokens.color.success:storelyTokens.color.danger}}>{versionMsg}</div>}
          <div className="text-sm leading-7 text-[var(--storely-muted)]">تحديث النسخة يفرض على كل المالكين إعادة الموافقة على الشروط بأول دخول لهم بعد نشر التعديل بصفحة /terms</div>
        </div>
      </StorelyCard>
      <StorelyCard>
        <form onSubmit={handleSearch} className="storely-toolbar">
          <div className="storely-search">
            <Search size={16} className="storely-search-icon" aria-hidden="true"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالاسم، الجوال، أو اسم المؤسسة" className="storely-input"/>
          </div>
          <div className="storely-actions">
            <StorelyButton type="submit" disabled={loading} variant="primary">{loading?'...':'بحث'}</StorelyButton>
            {search && <StorelyButton type="button" onClick={()=>{setSearch('');load('')}}>مسح</StorelyButton>}
          </div>
        </form>
        {error && <div className="storely-notice m-5" style={{color:storelyTokens.color.danger,borderColor:storelyTokens.color.dangerBorder}}>{error}</div>}
        {loading ? (
          <div className="storely-loading">جاري التحميل...</div>
        ) : logs.length === 0 ? (
          <StorelyEmptyState className="!border-0" title={search ? 'ما فيه نتائج مطابقة' : 'ما فيه سجلات موافقة بعد'} />
        ) : (
          <div className="storely-table-scroll">
            <table className="storely-table">
              <thead>
                <tr>
                  <th>التاريخ والوقت</th>
                  <th>المؤسسة</th>
                  <th>الاسم</th>
                  <th>الجوال</th>
                  <th>نسخة الشروط</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l,i)=>(
                  <tr key={l.id} style={{borderBottom:i<logs.length-1?`1px solid ${storelyTokens.color.border}`:'none'}}>
                    <td className="whitespace-nowrap">{new Date(l.accepted_at).toLocaleString('ar-SA', {numberingSystem:'latn'})}</td>
                    <td className="font-semibold">{l.org_name}</td>
                    <td>{l.profile_name}</td>
                    <td><span dir="ltr" className="inline-block">{l.profile_phone}</span></td>
                    <td><span dir="ltr" className="inline-block font-mono">{l.terms_version}</span></td>
                    <td><span dir="ltr" className="inline-block font-mono text-[13px]">{l.ip_address || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StorelyCard>
    </div>
  )
}
