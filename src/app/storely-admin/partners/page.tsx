'use client'
import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'
import { adminFetch, adminKey } from '../_admin/kit'
import { StorelyButton, StorelyCard, StorelyEmptyState, StorelyFormField, StorelyPageHeader } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

const TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX = 2 * 1024 * 1024

export default function PartnersPage() {
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const j = await adminFetch('/api/admin/partners')
    setPartners(j.partners || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function pick(f: File | null) {
    setError('')
    if (!f) return
    if (!TYPES.includes(f.type)) { setError('الشعار لازم يكون صورة PNG أو JPG أو WEBP'); return }
    if (f.size > MAX) { setError('حجم الشعار أكبر من 2 ميجا'); return }
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  async function add() {
    if (!name.trim() || !file) { setError('أدخل اسم المنشأة واختر الشعار'); return }
    setSaving(true); setError('')
    const fd = new FormData()
    fd.append('name', name.trim()); fd.append('file', file)
    const res = await fetch('/api/admin/partners', { method: 'POST', headers: { 'x-admin-key': adminKey() }, body: fd }).catch(() => null)
    const j = res ? await res.json().catch(() => ({})) : { error: 'خطأ بالاتصال' }
    setSaving(false)
    if (!j.success) { setError(j.error || 'تعذّرت الإضافة'); return }
    toast('تمت إضافة الشريك', 'success')
    setName(''); setFile(null); setPreview(''); if (input.current) input.current.value = ''
    load()
  }

  async function remove(p: any) {
    if (!(await confirmDialog({ title: 'حذف الشريك', message: `حذف "${p.name}" من الصفحة الرئيسية للموقع؟` }))) return
    const j = await adminFetch('/api/admin/partners', { method: 'DELETE', body: { id: p.id } })
    if (!j.success) toast(j.error || 'تعذّر الحذف', 'error')
    load()
  }

  return (
    <div className="partners-page" dir="rtl">
      <style>{partnerStyles}</style>
      <StorelyPageHeader title="الشركاء" description='شعارات قسم "شركاؤنا" في الصفحة الرئيسية للموقع — أضف المنشأة بعد موافقتها الصريحة' />
      <div className="partner-workspace">
        <StorelyCard className="partner-panel" title="إضافة شريك">
          <div className="partner-form">
            <StorelyFormField label="اسم المنشأة" htmlFor="partner-name"><input id="partner-name" value={name} onChange={e => setName(e.target.value)} maxLength={80} className="partner-input" /></StorelyFormField>
            <div>
              <div className="partner-label">الشعار</div>
              <button type="button" onClick={() => input.current?.click()} className="partner-upload">
                {preview ? <img src={preview} alt="" className="partner-preview" /> : <><ImagePlus size={22} /> اختر صورة الشعار</>}
              </button>
              <input ref={input} type="file" accept={TYPES.join(',')} hidden onChange={e => pick(e.target.files?.[0] || null)} />
              <div className="partner-help">PNG أو JPG أو WEBP — حتى 2 ميجا. يفضّل خلفية شفافة.</div>
            </div>
            {error && <div className="partner-error">{error}</div>}
            <StorelyButton variant="primary" disabled={saving} aria-busy={saving} onClick={add}>إضافة</StorelyButton>
          </div>
        </StorelyCard>
        <StorelyCard className="partner-panel" title={`الشركاء الحاليون (${partners.length})`}>
          {loading ? <div className="partner-placeholder" aria-busy="true">جاري التحميل...</div> : partners.length === 0 ? <StorelyEmptyState className="!border-0" title="ما فيه شركاء بعد" description="القسم ما يظهر في الموقع لين تضيف أول شريك" /> : partners.map((p, i) => (
            <div key={p.id} className="partner-record" style={{borderTopWidth:i?1:0}}>
              <div className="partner-logo"><img src={p.logo_url} alt={p.name} /></div>
              <span className="partner-name">{p.name}</span>
              <StorelyButton size="sm" variant="danger" onClick={() => remove(p)}><Trash2 size={16} /> حذف</StorelyButton>
            </div>
          ))}
        </StorelyCard>
      </div>
    </div>
  )
}

const partnerStyles = `
  .partners-page { min-width: 0; font-family: ${storelyTokens.typography.family}; color: ${storelyTokens.color.text}; font-size: ${storelyTokens.typography.body}px; line-height: ${storelyTokens.typography.lineHeight}; }
  .partners-page h1 { font-size: ${storelyTokens.typography.title}px; line-height: 1.5; }
  .partners-page h2 { font-size: ${storelyTokens.typography.section}px; }
  .partners-page .partner-workspace { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr); gap: ${storelyTokens.spacing[6]}px; align-items: start; }
  .partners-page .partner-panel { border-radius: ${storelyTokens.radius.card}; min-width: 0; }
  .partners-page .partner-form { display: flex; flex-direction: column; gap: ${storelyTokens.spacing[5]}px; padding: ${storelyTokens.spacing[6]}px; }
  .partners-page .partner-input { width: 100%; min-height: 40px; padding: ${storelyTokens.spacing[2]}px ${storelyTokens.spacing[3]}px; background: ${storelyTokens.color.surface}; color: ${storelyTokens.color.text}; border: 1px solid ${storelyTokens.color.border}; border-radius: ${storelyTokens.radius.control}; font: inherit; }
  .partners-page .partner-label { font-size: 13px; font-weight: 600; color: ${storelyTokens.color.textMuted}; margin-bottom: ${storelyTokens.spacing[2]}px; }
  .partners-page .partner-upload { display: flex; align-items: center; justify-content: center; flex-direction: column; gap: ${storelyTokens.spacing[3]}px; width: 100%; min-height: 144px; padding: ${storelyTokens.spacing[4]}px; background: ${storelyTokens.color.surface}; border: 1px dashed ${storelyTokens.color.border}; border-radius: ${storelyTokens.radius.control}; font: inherit; color: ${storelyTokens.color.textMuted}; cursor: pointer; }
  .partners-page .partner-upload:hover { border-color: ${storelyTokens.color.navy}; }
  .partners-page .partner-preview { max-height: 96px; max-width: 100%; object-fit: contain; }
  .partners-page .partner-help { font-size: ${storelyTokens.typography.supporting}px; color: ${storelyTokens.color.textMuted}; margin-top: ${storelyTokens.spacing[2]}px; }
  .partners-page .partner-error { color: ${storelyTokens.color.danger}; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
  .partners-page .partner-record { display: flex; align-items: center; flex-wrap: wrap; gap: ${storelyTokens.spacing[4]}px; padding: ${storelyTokens.spacing[5]}px; border-top-style: solid; border-color: ${storelyTokens.color.border}; }
  .partners-page .partner-logo { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 64px; height: 48px; background: ${storelyTokens.color.surface}; border: 1px solid ${storelyTokens.color.border}; border-radius: ${storelyTokens.radius.control}; }
  .partners-page .partner-logo img { max-width: 56px; max-height: 40px; object-fit: contain; }
  .partners-page .partner-name { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
  .partners-page .partner-placeholder { padding: ${storelyTokens.spacing[8]}px; color: ${storelyTokens.color.textMuted}; }
  .adm-root .partners-page .partner-input:focus, .partners-page .partner-upload:focus-visible { outline: none; border-color: ${storelyTokens.color.navy} !important; box-shadow: ${storelyTokens.shadow.focus} !important; }
  @media (max-width: 900px) { .partners-page .partner-workspace { grid-template-columns: minmax(0, 1fr); } }
  @media (max-width: 640px) { .partners-page .partner-form, .partners-page .partner-record { padding: ${storelyTokens.spacing[4]}px; } }
`
