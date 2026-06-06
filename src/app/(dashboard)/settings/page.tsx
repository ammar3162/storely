'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [sending, setSending]     = useState(false)
  const [success, setSuccess]     = useState('')
  const [sendMsg, setSendMsg]     = useState('')
  const [orgId, setOrgId]         = useState('')
  const [form, setForm] = useState({ name:'', whatsapp_number:'' })
  const sb = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data:{ user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile) return
    setOrgId(profile.org_id)
    const { data: org } = await sb.from('organizations').select('*').eq('id', profile.org_id).single()
    if (org) setForm({ name: org.name||'', whatsapp_number: org.whatsapp_number||'' })
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await sb.from('organizations').update({ name: form.name, whatsapp_number: form.whatsapp_number }).eq('id', orgId)
    setSuccess('✅ تم حفظ الإعدادات')
    setSaving(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  async function sendNotification() {
    setSending(true)
    setSendMsg('')
    try {
      const res = await fetch('/api/notify-low-stock', { method:'POST' })
      const data = await res.json()
      if (data.success) setSendMsg('✅ تم إرسال إشعار المخزون الناقص بنجاح')
      else setSendMsg('❌ فشل الإرسال')
    } catch { setSendMsg('❌ خطأ في الاتصال') }
    setSending(false)
    setTimeout(() => setSendMsg(''), 5000)
  }

  const inp: React.CSSProperties = { width:'100%', padding:'12px 14px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', boxSizing:'border-box' as const, background:'white', color:'#1e293b', fontFamily:'inherit' }

  if (loading) return <div style={{padding:48,textAlign:'center',color:'#94a3b8'}}>جاري التحميل...</div>

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl',maxWidth:600,margin:'0 auto'}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:3}}>الإعدادات</h1>
        <p style={{fontSize:12,color:'#64748b'}}>إعدادات المؤسسة والتنبيهات</p>
      </div>

      {success && <div style={{background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,fontWeight:600,color:'#166534'}}>{success}</div>}

      <form onSubmit={handleSave}>
        <div style={{background:'white',borderRadius:12,border:'1px solid #e8ecf0',padding:24,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:16,paddingBottom:12,borderBottom:'1px solid #f1f5f9'}}>🏢 بيانات المؤسسة</div>
          <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>اسم المؤسسة</label>
              <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp} placeholder="مثال: مطعم الأصيل"/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>رقم الواتساب للتنبيهات</label>
              <input value={form.whatsapp_number} onChange={e=>setForm({...form,whatsapp_number:e.target.value})} style={inp} placeholder="+966500000000"/>
              <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>يُستخدم لإرسال تنبيهات نقص المخزون</div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} style={{width:'100%',padding:'13px',background:saving?'#94a3b8':'#1a4731',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:12}}>
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </form>

      <div style={{background:'white',borderRadius:12,border:'1px solid #e8ecf0',padding:24}}>
        <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:8,paddingBottom:12,borderBottom:'1px solid #f1f5f9'}}>📲 إشعارات واتساب</div>
        <p style={{fontSize:12,color:'#64748b',marginBottom:16}}>إرسال إشعار فوري بالمنتجات التي وصلت للحد الأدنى</p>
        {sendMsg && <div style={{background:sendMsg.includes('✅')?'#f0fdf4':'#fef2f2',border:'1.5px solid '+(sendMsg.includes('✅')?'#86efac':'#fecaca'),borderRadius:9,padding:'10px 14px',marginBottom:12,fontSize:13,fontWeight:600,color:sendMsg.includes('✅')?'#166534':'#991b1b'}}>{sendMsg}</div>}
        <button type="button" onClick={sendNotification} disabled={sending}
          style={{width:'100%',padding:'13px',background:sending?'#94a3b8':'#25d366',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {sending ? '⏳ جاري الإرسال...' : '📲 إرسال إشعار المخزون الناقص'}
        </button>
      </div>
    </div>
  )
}
