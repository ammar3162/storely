'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [org, setOrg]           = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')
  const [form, setForm] = useState({ name:'', whatsapp_number:'', low_stock_threshold:5 })
  const supabase = createClient()

  useEffect(() => { loadOrg() }, [])

  async function loadOrg() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile }  = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()
    if (!profile) return
    const { data } = await supabase.from('organizations').select('*').eq('id', profile.org_id).single()
    if (data) {
      setOrg(data)
      setForm({ name: data.name, whatsapp_number: data.whatsapp_number, low_stock_threshold: data.low_stock_threshold })
    }
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    const { error } = await supabase.from('organizations').update({
      name: form.name,
      whatsapp_number: form.whatsapp_number,
      low_stock_threshold: Number(form.low_stock_threshold),
    }).eq('id', org.id)
    if (error) setError('فشل الحفظ')
    else setSuccess('تم الحفظ بنجاح')
    setSaving(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  async function sendWhatsAppAlert() {
    setNotifying(true); setError('')
    try {
      const res  = await fetch('/api/notify-low-stock', { method:'POST' })
      const data = await res.json()
      if (data.success) setSuccess('تم إرسال التنبيه بنجاح')
      else setError('فشل الإرسال: ' + (data.error || 'خطأ غير معروف'))
    } catch {
      setError('فشل الاتصال بالخادم')
    }
    setNotifying(false)
    setTimeout(() => { setSuccess(''); setError('') }, 4000)
  }

  const inp: React.CSSProperties = {
    width:'100%', padding:'12px 14px', border:'2px solid #e2e8f0',
    borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'system-ui', fontWeight:500,
  }

  if (loading) return <div style={{padding:60,textAlign:'center',color:'#94a3b8',fontFamily:'system-ui'}}>جاري التحميل...</div>

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui',maxWidth:600}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:900,color:'#0f172a',marginBottom:4}}>الاعدادات</h1>
        <p style={{fontSize:13,color:'#64748b'}}>إعدادات المؤسسة وتنبيهات واتساب</p>
      </div>

      {success && <div style={{background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,fontWeight:600,color:'#16a34a'}}>{success}</div>}
      {error   && <div style={{background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,fontWeight:600,color:'#dc2626'}}>{error}</div>}

      <div style={{background:'white',borderRadius:20,padding:24,boxShadow:'0 4px 24px rgba(0,0,0,0.07)',marginBottom:20}}>
        <h2 style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:20,paddingBottom:16,borderBottom:'1px solid #f1f5f9'}}>
          بيانات المؤسسة
        </h2>
        <form onSubmit={handleSave}>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>اسم المؤسسة</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp} required/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>رقم واتساب التنبيهات</label>
            <input value={form.whatsapp_number} onChange={e=>setForm({...form,whatsapp_number:e.target.value})} style={inp} placeholder="00966501234567" required/>
            <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>هذا الرقم يستقبل تنبيهات نقص المخزون</div>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>الحد الادنى الافتراضي للتنبيه</label>
            <input type="number" min="1" value={form.low_stock_threshold} onChange={e=>setForm({...form,low_stock_threshold:Number(e.target.value)})} style={inp}/>
          </div>
          <button type="submit" disabled={saving} style={{width:'100%',padding:'13px',background:'linear-gradient(135deg,#667eea,#764ba2)',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'system-ui'}}>
            {saving ? 'جاري الحفظ...' : 'حفظ الاعدادات'}
          </button>
        </form>
      </div>

      <div style={{background:'white',borderRadius:20,padding:24,boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>
        <h2 style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:8}}>تنبيه واتساب</h2>
        <p style={{fontSize:13,color:'#64748b',marginBottom:20}}>إرسال قائمة المنتجات الناقصة الآن عبر واتساب</p>
        <button onClick={sendWhatsAppAlert} disabled={notifying}
          style={{width:'100%',padding:'14px',background:notifying?'#94a3b8':'linear-gradient(135deg,#25d366,#128c7e)',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:notifying?'not-allowed':'pointer',fontFamily:'system-ui',boxShadow:'0 4px 14px rgba(37,211,102,0.3)'}}>
          {notifying ? 'جاري الإرسال...' : 'ارسال تنبيه الان'}
        </button>
      </div>
    </div>
  )
}
