'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SupplierDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string|null>(null)
  const [imageFile, setImageFile] = useState<File|null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [existingImageUrl, setExistingImageUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)

  const sb = createClient()

  useEffect(()=>{ init() },[])

  async function init() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { window.location.href = '/supplier-portal'; return }
    const { data: p } = await sb.from('supplier_profiles' as any).select('*').eq('id', user.id).single()
    if (!p) { window.location.href = '/supplier-portal'; return }
    setProfile(p)
    await loadItems(user.id)
    setLoading(false)
  }

  async function loadItems(supplierId: string) {
    const { data } = await sb.from('supplier_catalog_items' as any).select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setItems(data || [])
  }

  function resetForm() {
    setName(''); setUnit(''); setPrice(''); setEditingId(null)
    setImageFile(null); setImagePreview(''); setExistingImageUrl('')
  }

  function startEdit(item: any) {
    setEditingId(item.id); setName(item.name); setUnit(item.unit||''); setPrice(String(item.price||''))
    setExistingImageUrl(item.image_url||''); setImageFile(null); setImagePreview('')
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function saveItem() {
    if (!name.trim() || !price) return
    setSaving(true)

    let imageUrl = existingImageUrl || null
    if (imageFile) {
      setUploading(true)
      const ext = imageFile.name.split('.').pop()
      const path = `${profile.id}/${Date.now()}.${ext}`
      const { error: upErr } = await sb.storage.from('supplier-items').upload(path, imageFile, { upsert: true })
      if (!upErr) {
        const { data: pub } = sb.storage.from('supplier-items').getPublicUrl(path)
        imageUrl = pub.publicUrl
      }
      setUploading(false)
    }

    if (editingId) {
      await sb.from('supplier_catalog_items' as any).update({ name: name.trim(), unit: unit.trim()||null, price: Number(price), image_url: imageUrl, updated_at: new Date().toISOString() }).eq('id', editingId)
    } else {
      await sb.from('supplier_catalog_items' as any).insert({ supplier_id: profile.id, name: name.trim(), unit: unit.trim()||null, price: Number(price), image_url: imageUrl })
    }
    setSaving(false)
    resetForm()
    loadItems(profile.id)
  }

  async function toggleAvailable(item: any) {
    await sb.from('supplier_catalog_items' as any).update({ is_available: !item.is_available }).eq('id', item.id)
    loadItems(profile.id)
  }

  async function deleteItem(id: string) {
    if (!confirm('حذف هذا الصنف نهائياً؟')) return
    await sb.from('supplier_catalog_items' as any).delete().eq('id', id)
    loadItems(profile.id)
  }

  async function logout() {
    await sb.auth.signOut()
    window.location.href = '/supplier-portal'
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f4'}}>
      <div style={{width:36,height:36,border:'3px solid #bbf7d0',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',minHeight:'100vh',background:'#f5f5f4',padding:20}}>
      <div style={{maxWidth:700,margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:'#1c1c1a'}}>{profile?.business_name}</div>
            <div style={{fontSize:12,color:'#888780'}}>{profile?.location || '—'}</div>
          </div>
          <button onClick={logout} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #e5e5e3',background:'white',fontSize:12,fontWeight:700,cursor:'pointer',color:'#5f5e5a'}}>خروج</button>
        </div>

        <div style={{background:'white',borderRadius:16,padding:20,border:'1px solid #ebebea',marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:800,color:'#1c1c1a',marginBottom:12}}>{editingId?'✏️ تعديل صنف':'➕ إضافة صنف جديد'}</div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:8,marginBottom:10}}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم الصنف"
              style={{padding:'10px 12px',borderRadius:8,border:'1px solid #e5e5e3',fontSize:13}}/>
            <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="الوحدة (كيلو، قطعة...)"
              style={{padding:'10px 12px',borderRadius:8,border:'1px solid #e5e5e3',fontSize:13}}/>
            <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="السعر"
              style={{padding:'10px 12px',borderRadius:8,border:'1px solid #e5e5e3',fontSize:13}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            {(imagePreview || existingImageUrl) && (
              <img src={imagePreview || existingImageUrl} alt="" style={{width:48,height:48,borderRadius:8,objectFit:'cover',border:'1px solid #e5e5e3'}}/>
            )}
            <label style={{fontSize:12,fontWeight:700,color:'#5f5e5a',padding:'8px 12px',borderRadius:8,border:'1px dashed #cbd5e1',cursor:'pointer'}}>
              📷 {imagePreview||existingImageUrl?'تغيير الصورة':'إضافة صورة (اختياري)'}
              <input type="file" accept="image/*" onChange={onPickImage} style={{display:'none'}}/>
            </label>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={saveItem} disabled={saving} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#16a34a',color:'white',fontWeight:700,fontSize:13,cursor:'pointer'}}>
              {saving?(uploading?'⏳ جاري رفع الصورة...':'⏳ جاري الحفظ...'):editingId?'حفظ التعديل':'إضافة'}
            </button>
            {editingId && <button onClick={resetForm} style={{padding:'10px 20px',borderRadius:8,border:'1px solid #e5e5e3',background:'white',fontWeight:700,fontSize:13,cursor:'pointer',color:'#5f5e5a'}}>إلغاء</button>}
          </div>
        </div>

        <div style={{background:'white',borderRadius:16,padding:20,border:'1px solid #ebebea'}}>
          <div style={{fontSize:15,fontWeight:800,color:'#1c1c1a',marginBottom:14}}>أصنافي ({items.length})</div>
          {items.length===0 ? (
            <div style={{fontSize:13,color:'#888780',textAlign:'center' as const,padding:20}}>ما فيه أصناف مضافة بعد</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
              {items.map((item:any)=>(
                <div key={item.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'#f5f5f4',borderRadius:10,opacity:item.is_available?1:.5}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    {item.image_url && <img src={item.image_url} alt="" style={{width:36,height:36,borderRadius:6,objectFit:'cover'}}/>}
                    <div>
                      <span style={{fontSize:13,fontWeight:700,color:'#1c1c1a'}}>{item.name}</span>
                      <span style={{fontSize:11,color:'#888780',marginRight:8}}>{item.unit}</span>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:13,fontWeight:800,color:'#16a34a'}}>{item.price} ر.س</span>
                    <button onClick={()=>toggleAvailable(item)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #e5e5e3',background:'white',fontSize:10,cursor:'pointer',color:item.is_available?'#16a34a':'#888780'}}>
                      {item.is_available?'✅ متوفر':'⏸ غير متوفر'}
                    </button>
                    <button onClick={()=>startEdit(item)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #e5e5e3',background:'white',fontSize:10,cursor:'pointer',color:'#3b82f6'}}>✏️</button>
                    <button onClick={()=>deleteItem(item.id)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #e5e5e3',background:'white',fontSize:10,cursor:'pointer',color:'#dc2626'}}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
