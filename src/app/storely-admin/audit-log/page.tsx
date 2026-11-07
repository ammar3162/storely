'use client'
import { useState, useEffect } from 'react'
import { Search, UserRound } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyEmptyState, StorelyPageHeader } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.authenticated || (data.admin?.role !== 'super_admin' && !data.admin?.permissions?.view_audit_log)) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  useEffect(() => { if (authChecked) load() }, [authChecked])

  async function load(searchTerm?: string) {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const q = searchTerm !== undefined ? searchTerm : search
      const res = await fetch(`/api/admin/audit-log${q ? `?search=${encodeURIComponent(q)}` : ''}`, { headers: { 'x-admin-key': key } })
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

  if (!authChecked) return (
    <div className="storely-loading" dir="rtl">جاري التحقق...</div>
  )

  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      <StorelyPageHeader title="سجل تدقيق الإجراءات الإدارية" description="مين سوى إيش، ومتى — كل إجراء إداري حساس (تفعيل، حذف، تعديل)" />
      <StorelyCard>
        <form onSubmit={handleSearch} className="storely-toolbar">
          <div className="storely-search">
            <Search size={16} className="storely-search-icon" aria-hidden="true"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم المشرف، نوع الإجراء، أو اسم المؤسسة" className="storely-input"/>
          </div>
          <div className="storely-actions">
            <StorelyButton type="submit" disabled={loading} variant="primary">{loading?'...':'بحث'}</StorelyButton>
            {search && <StorelyButton type="button" onClick={()=>{setSearch('');load('')}}>مسح</StorelyButton>}
          </div>
        </form>
        {error && <div className="m-5 storely-notice" style={{color:storelyTokens.color.danger,borderColor:storelyTokens.color.dangerBorder}}>{error}</div>}
        {loading ? (
          <div className="storely-loading">جاري التحميل...</div>
        ) : logs.length === 0 ? (
          <StorelyEmptyState className="!border-0" title={search ? 'ما فيه نتائج مطابقة' : 'ما فيه إجراءات مسجّلة بعد'} />
        ) : (
          <div className="divide-y divide-[var(--storely-border)]">
            {logs.map((l)=>(
              <div key={l.id} className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
                <div className="min-w-0 flex-1 basis-72">
                  <div className="break-words text-sm font-semibold">{l.action}</div>
                  <div className="mt-3 flex items-start gap-2 text-sm text-[var(--storely-muted)]"><UserRound size={16} className="mt-1 shrink-0" aria-hidden="true"/><span className="min-w-0 break-words">{l.admin_name}{l.target_org_name ? ` — على مؤسسة: ${l.target_org_name}` : ''}</span></div>
                  {l.details && <div className="mt-4 max-w-full overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--storely-border)] bg-[var(--storely-background)] p-3 font-mono text-[13px] leading-6 break-all text-[var(--storely-muted)]" dir="auto">{JSON.stringify(l.details)}</div>}
                </div>
                <div className="text-[13px] leading-6 text-[var(--storely-muted)]">{new Date(l.created_at).toLocaleString('ar-SA', {numberingSystem:'latn'})}</div>
              </div>
            ))}
          </div>
        )}
      </StorelyCard>
    </div>
  )
}
