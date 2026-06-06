'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState(''  )
  const [orgId, setOrgId]       = useState('')
  const [form, setForm] = useState({
    name: '',
    whatsapp_number: '',
    low_stock_threshold: 5,
  })
  const sb = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile) return
    setOrgId(profile.org_id)
    const { data: org } = await sb.from('organizations').select('*').eq('id', profile.org_id).single()
    if (org) setForm({
      name: org.name || '',
      whatsapp_number: org.whatsapp_number || '',
      low_stock_threshold: org.low_stock_threshold || 5,
    })
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await sb.from('organizations').update({
      name: form.name,
      whatsapp_number: form.whatsapp_number,
      low_stock_threshold: Number(form.low_stock_threshold),
    }).eq('id', orgId)
    setSuccess('✅ تم حفظ الإعدادات بنجاح')
    setSaving(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0',
    borderRadius: 9, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
    background: 'white', color: '#1e293b', fontFamily: 'inherit',
  }

  if (loading) return <div style={{padding:48,textAlign:'center',color:'#94a3b8'}}>جاري التحميل...</div>

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl',maxWidth:600,margin:'0 auto'}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:3}}>إعدادات المؤسسة</h1>
        <p style={{fontSize:12,color:'#64748b'}}>تعديل بيانات المؤسسة وإعدادات التنبيهات</p>
      </div>

      {success && (
        <div style={{background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,fontWeight:600,color:'#166534'}}>
          {success}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{background:'white',borderRadius:12,border:'1px solid #e8ecf0',padding:24,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:16,paddingBottom:12,borderBottom:'1px solid #f1f5f9'}}>
            🏢 بيانات المؤسسة
          </div>
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

        <div style={{background:'white',borderRadius:12,border:'1px solid #e8ecf0',padding:24,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:16,paddingBottom:12,borderBottom:'1px solid #f1f5f9'}}>
            ⚠️ إعدادات التنبيهات
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:5}}>الحد الأدنى الافتراضي للمخزون</label>
            <input type="number" min="1" value={form.low_stock_threshold} onChange={e=>setForm({...form,low_stock_threshold:Number(e.target.value)})} style={{...inp,width:120}} />
            <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>يُطبَّق على المنتجات الجديدة تلقائياً</div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          style={{width:'100%',padding:'13px',background:saving?'#94a3b8':'#1a4731',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </form>
    </div>
  )
}
