'use client'
import { useState, useEffect } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyEmptyState, StorelyPageHeader } from '@/components/ui'

export default function BackupsPage() {
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.authenticated || (data.admin?.role !== 'super_admin' && !data.admin?.permissions?.manage_backups)) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  useEffect(() => { if (authChecked) load() }, [authChecked])

  async function load() {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const res = await fetch('/api/admin/list-backups', { headers: { 'x-admin-key': key } })
      const data = await res.json()
      if (!res.ok) { setError('حدث خطأ بالتحقق'); setLoading(false); return }
      setBackups(data.backups || [])
    } catch { setError('حدث خطأ') }
    setLoading(false)
  }

  function fmtSize(bytes:number) { return bytes > 1024 ? (bytes/1024).toFixed(1)+' KB' : bytes+' B' }

  if (!authChecked) return (
    <div className="storely-loading" dir="rtl">جاري التحقق...</div>
  )

  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      <StorelyPageHeader title="النسخ الاحتياطية" description="عرض وتحميل ملفات CSV لكل مؤسسة — للمراجعة اليدوية فقط"
        actions={<StorelyButton onClick={load} disabled={loading} icon={<RefreshCw size={16}/>}>{loading?'جاري التحميل...':'تحديث'}</StorelyButton>} />
      {loading ? (
        <div className="storely-loading">جاري التحميل...</div>
      ) : backups.length === 0 ? (
        <StorelyEmptyState title="لا توجد نسخ احتياطية بعد" />
      ) : (
        <div className="grid min-w-0 gap-6">
          {backups.map((b,i)=>(
            <StorelyCard key={i} title={b.org_name}>
              <div className="divide-y divide-[var(--storely-border)]">
                {b.files.map((f:any,j:number)=>(
                  <div key={j} className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
                    <div className="min-w-0 flex-1 basis-48">
                      <div className="break-all text-sm font-semibold" dir="auto">{f.name}</div>
                      <div className="mt-2 text-[13px] leading-6 text-[var(--storely-muted)]">{new Date(f.created_at).toLocaleString('ar-SA', {numberingSystem:'latn'})} · <span dir="ltr">{fmtSize(f.size)}</span></div>
                    </div>
                    {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer" className="storely-button" data-variant="secondary" data-size="md"><Download size={16}/> تحميل</a>}
                  </div>
                ))}
              </div>
            </StorelyCard>
          ))}
        </div>
      )}
    </div>
  )
}
