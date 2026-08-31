'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { confirmDialog } from '@/components/ConfirmDialog'

const C = { bg:'#0f172a', card:'#1e293b', border:'#334155', text:'#f1f5f9', text2:'#94a3b8', text3:'#64748b', green:'#14b8a6', red:'#ef4444' }

export default function PartnersPage() {
  const [partners, setPartners] = useState<any[]>([])
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File|null>(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const sb = createClient()

  function key() { return sessionStorage.getItem('storely_admin_pass') || '' }

  useEffect(() => {
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key() } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.authenticated) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
        load()
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/partners', { headers: { 'x-admin-key': key() } })
    const data = await res.json()
    setPartners(data.partners || [])
    setLoading(false)
  }

  async function addPartner() {
    if (!name.trim() || !file) { setMsg('عبّي الاسم واختر ملف الشعار'); return }
    setUploading(true); setMsg('')
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('file', file)
      const res = await fetch('/api/admin/partners', {
        method: 'POST', headers: { 'x-admin-key': key() },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setName(''); setFile(null); setMsg('✅ تمت الإضافة')
        load()
      } else setMsg(data.error || 'خطأ')
    } catch { setMsg('خطأ بالاتصال') }
    setUploading(false)
  }

  async function deletePartner(id: string) {
    if (!(await confirmDialog({ title: 'حذف الشريك', message: 'حذف هذا الشريك من الصفحة التسويقية؟' }))) return
    await fetch('/api/admin/partners', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': key() },
      body: JSON.stringify({ id })
    })
    load()
  }

  if (!authChecked) return <div style={{background:C.bg,minHeight:'100vh'}}/>

  return (
    <div style={{background:C.bg, minHeight:'100vh', padding:32, fontFamily:'system-ui', direction:'rtl'}}>
      <div style={{maxWidth:800, margin:'0 auto'}}>
        <h1 style={{color:C.text, fontSize:24, fontWeight:800, marginBottom:8}}>شعارات الشركاء بالصفحة التسويقية</h1>
        <p style={{color:C.text3, fontSize:13, marginBottom:28}}>تظهر هذي الشعارات بقسم "شركاؤنا" بالصفحة الرئيسية لموقع Storely — تحتاج موافقة صريحة من المنشأة قبل الإضافة</p>

        <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:24}}>
          <h2 style={{color:C.text, fontSize:15, fontWeight:700, marginBottom:14}}>إضافة شريك جديد</h2>
          {msg && <div style={{color:msg.startsWith('✅')?C.green:C.red, fontSize:13, marginBottom:12}}>{msg}</div>}
          <input placeholder="اسم المنشأة" value={name} onChange={e=>setName(e.target.value)}
            style={{width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontSize:14, marginBottom:10}}/>
          <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}
            style={{color:C.text2, fontSize:13, marginBottom:14, display:'block'}}/>
          <button onClick={addPartner} disabled={uploading}
            style={{background:C.green, color:'white', border:'none', borderRadius:8, padding:'10px 20px', fontSize:14, fontWeight:700, cursor:'pointer'}}>
            {uploading?'⏳ جاري الرفع...':'إضافة'}
          </button>
        </div>

        <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20}}>
          <h2 style={{color:C.text, fontSize:15, fontWeight:700, marginBottom:14}}>الشركاء الحاليون ({partners.length})</h2>
          {loading ? <div style={{color:C.text3}}>جاري التحميل...</div> :
            partners.length === 0 ? <div style={{color:C.text3, fontSize:13}}>لا يوجد شركاء مضافون بعد</div> :
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              {partners.map((p:any) => (
                <div key={p.id} style={{display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:C.bg, borderRadius:8}}>
                  <img src={p.logo_url} alt={p.name} style={{width:44, height:44, borderRadius:8, objectFit:'contain', background:'white'}}/>
                  <span style={{color:C.text, fontSize:14, fontWeight:600, flex:1}}>{p.name}</span>
                  <button onClick={()=>deletePartner(p.id)}
                    style={{background:'transparent', color:C.red, border:`1px solid ${C.red}`, borderRadius:6, padding:'6px 12px', fontSize:12, cursor:'pointer'}}>
                    حذف
                  </button>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  )
}
