'use client'
import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2, Handshake, Plus } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'
import { A, Btn, Card, Empty, Field, Loading, PageHeader, adminFetch, adminKey, inputStyle } from '../_admin/kit'

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
    if (!TYPES.includes(f.type)) { setError('يجب أن يكون الشعار صورة بصيغة PNG أو JPG أو WEBP'); return }
    if (f.size > MAX) { setError('حجم الشعار أكبر من 2 ميجابايت'); return }
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
    if (!(await confirmDialog({ title: 'حذف الشريك', message: `حذف «${p.name}» من الصفحة الرئيسية للموقع؟` }))) return
    const j = await adminFetch('/api/admin/partners', { method: 'DELETE', body: { id: p.id } })
    if (!j.success) toast(j.error || 'تعذّر الحذف', 'error')
    load()
  }

  return (
    <>
      <PageHeader title="الشركاء" subtitle="شعارات قسم «شركاؤنا» في الصفحة الرئيسية للموقع. أضف المنشأة بعد الحصول على موافقتها الصريحة" />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(min(100%,320px),1fr) minmax(min(100%,360px),2fr)', gap: 20, alignItems: 'start' }} className="adm-two">
        <Card title="إضافة شريك">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="اسم المنشأة"><input value={name} onChange={e => setName(e.target.value)} maxLength={80} style={inputStyle} /></Field>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: A.text, marginBottom: 6 }}>الشعار</div>
              <button type="button" onClick={() => input.current?.click()} className="adm-hover"
                style={{ width: '100%', height: 140, borderRadius: 14, border: `1.5px dashed ${A.borderStrong}`, background: A.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, color: A.text2, fontFamily: 'inherit', fontSize: 13 }}>
                {preview ? <img src={preview} alt="" style={{ maxHeight: 96, maxWidth: '80%', objectFit: 'contain' }} /> : <><ImagePlus size={24} color={A.text3} /> <span style={{ fontWeight: 500 }}>اختر صورة الشعار</span></>}
              </button>
              <input ref={input} type="file" accept={TYPES.join(',')} hidden onChange={e => pick(e.target.files?.[0] || null)} />
              <div style={{ fontSize: 12, color: A.text3, marginTop: 6 }}>PNG أو JPG أو WEBP بحجم أقصاه 2 ميجابايت، ويُفضّل أن تكون الخلفية شفافة</div>
            </div>
            {error && <div style={{ fontSize: 12.5, color: A.danger, fontWeight: 600 }}>{error}</div>}
            <Btn kind="primary" loading={saving} onClick={add}><Plus size={15} /> إضافة الشريك</Btn>
          </div>
        </Card>

        <Card title="الشركاء الحاليون" subtitle={`${partners.length} شريك يظهرون في الموقع`} pad={partners.length ? 20 : 0}>
          {loading ? <Loading /> : partners.length === 0 ? <Empty icon={Handshake} title="لا يوجد شركاء بعد" hint="لا يظهر القسم في الموقع حتى تضيف أول شريك" /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
              {partners.map(p => (
                <div key={p.id} className="adm-hover" style={{ border: `1px solid ${A.border}`, borderRadius: 14, background: A.surface, overflow: 'hidden' }}>
                  <div style={{ height: 92, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, borderBottom: `1px solid ${A.border}` }}>
                    <img src={p.logo_url} alt={p.name} style={{ maxWidth: '100%', maxHeight: 60, objectFit: 'contain' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px 8px 12px' }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <Btn small kind="ghost" onClick={() => remove(p)} title="حذف الشريك"><Trash2 size={14} /></Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
