'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StorelyCard, StorelyEmptyState, StorelyPageHeader, StorelyStatusBadge } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

interface OrgGroup {
  ip_address: string
  organizations: { id: string; name: string; plan: string; created_at: string }[]
  first_seen: string
  last_seen: string
}

export default function DuplicateRegistrationsPage() {
  const [groups, setGroups] = useState<OrgGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.json())
      .then(d => {
        if (!d.success) { router.replace('/storely-admin'); return }
        setAuthChecked(true)
        load()
      })
      .catch(() => router.replace('/storely-admin'))
  }, [])

  async function load() {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const res = await fetch('/api/admin/duplicate-registrations', { headers: { 'x-admin-key': key } })
      const data = await res.json()
      if (data.success) setGroups(data.groups || [])
      else setError(data.error || 'تعذر التحميل')
    } catch { setError('حدث خطأ بالاتصال') }
    setLoading(false)
  }

  if (!authChecked) return (
    <div className="storely-loading" dir="rtl">جاري التحقق...</div>
  )

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6" dir="rtl">
      <StorelyPageHeader title="تسجيلات مشبوهة (نفس IP)" description={<>منشآت متعددة اتسجّلت من نفس عنوان الشبكة — مؤشر محتمل (مو مؤكد) على شخص واحد يتحايل على
            حدود الباقة بإنشاء منشآت منفصلة بدل استخدام نظام "إضافة فرع" الحقيقي. راجع كل حالة يدوياً
            قبل أي إجراء (ممكن يكون سبب طبيعي زي شبكة WiFi مشتركة بمكتب أو كافيه).</>} />
      {error && <div className="storely-notice" style={{color:storelyTokens.color.danger,borderColor:storelyTokens.color.dangerBorder}}>{error}</div>}
      {loading ? (
        <div className="storely-loading">جاري التحميل...</div>
      ) : groups.length === 0 ? (
        <StorelyEmptyState title="ما فيه أي حالة مشبوهة حالياً" />
      ) : (
        <div className="grid min-w-0 gap-6">
          {groups.map((g, i) => (
            <StorelyCard key={g.ip_address}>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--storely-border)] p-5 sm:p-6">
                <div className="storely-actions">
                  <StorelyStatusBadge status="warning">{g.organizations.length} منشآت</StorelyStatusBadge>
                  <span className="break-all font-mono text-sm" dir="ltr">{g.ip_address}</span>
                </div>
                <span className="text-[13px] leading-6 text-[var(--storely-muted)]">
                  من {new Date(g.first_seen).toLocaleDateString('ar-SA',{numberingSystem:'latn',day:'numeric',month:'short'})}
                  {' '}إلى {new Date(g.last_seen).toLocaleDateString('ar-SA',{numberingSystem:'latn',day:'numeric',month:'short'})}
                </span>
              </div>
              <div className="divide-y divide-[var(--storely-border)]">
                {g.organizations.map(o => (
                  <div key={o.id} className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
                    <span className="min-w-0 flex-1 basis-48 break-words text-sm font-semibold">{o.name}</span>
                    <div className="storely-actions">
                      <span className="text-[13px] leading-6 text-[var(--storely-muted)]">{new Date(o.created_at).toLocaleDateString('ar-SA',{numberingSystem:'latn',day:'numeric',month:'short',year:'numeric'})}</span>
                      <span className="rounded-[var(--radius-sm)] border border-[var(--storely-border)] px-2 py-1 text-[13px] font-semibold">{o.plan}</span>
                    </div>
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
