'use client'
import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
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
    <>
      <PageHeader title="الشركاء" subtitle='شعارات قسم "شركاؤنا" في الصفحة الرئيسية للموقع — أضف المنشأة بعد موافقتها الصريحة' />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, alignItems: 'start' }}>
        <Card title="إضافة شريك">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="اسم المنشأة"><input value={name} onChange={e => setName(e.target.value)} maxLength={80} style={inputStyle} /></Field>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: A.text2, marginBottom: 6 }}>الشعار</div>
              <button type="button" onClick={() => input.current?.click()} className="adm-hover"
                style={{ width: '100%', height: 120, borderRadius: 10, border: `1.5px dashed ${A.borderStrong}`, background: '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, color: A.text2, fontFamily: 'inherit', fontSize: 13 }}>
                {preview ? <img src={preview} alt="" style={{ maxHeight: 96, maxWidth: '80%', objectFit: 'contain' }} /> : <><ImagePlus size={22} /> اختر صورة الشعار</>}
              </button>
              <input ref={input} type="file" accept={TYPES.join(',')} hidden onChange={e => pick(e.target.files?.[0] || null)} />
              <div style={{ fontSize: 11.5, color: A.text3, marginTop: 6 }}>PNG أو JPG أو WEBP — حتى 2 ميجا. يفضّل خلفية شفافة.</div>
            </div>
            {error && <div style={{ fontSize: 12.5, color: A.danger, fontWeight: 600 }}>{error}</div>}
            <Btn kind="primary" loading={saving} onClick={add}>إضافة</Btn>
          </div>
        </Card>

        <Card title={`الشركاء الحاليون (${partners.length})`} pad={0}>
          {loading ? <Loading /> : partners.length === 0 ? <Empty title="ما فيه شركاء بعد" hint="القسم ما يظهر في الموقع لين تضيف أول شريك" /> : partners.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderTop: i ? `1px solid ${A.border}` : 'none' }}>
              <div style={{ width: 56, height: 44, borderRadius: 8, border: `1px solid ${A.border}`, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={p.logo_url} alt={p.name} style={{ maxWidth: 48, maxHeight: 36, objectFit: 'contain' }} />
              </div>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{p.name}</span>
              <Btn small kind="danger" onClick={() => remove(p)}><Trash2 size={13} /> حذف</Btn>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
