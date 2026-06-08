'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, font, card, btnPrimary, btnSecondary, inp, pageTitle, pageSub } from '@/lib/ds'

const lbl: React.CSSProperties = { fontSize: font.xs, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }

function Section({ title, icon, children }: { title:string; icon:string; children:React.ReactNode }) {
  return (
    <div style={{...card,padding:24,marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,paddingBottom:14,borderBottom:`1px solid ${colors.border}`}}>
        <div style={{width:34,height:34,borderRadius:radius.md,background:colors.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{icon}</div>
        <div style={{fontSize:font.md,fontWeight:700,color:colors.text}}>{title}</div>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [sending, setSending] = useState(false)
  const [saveOk, setSaveOk]   = useState(false)
  const [sendMsg, setSendMsg] = useState<{ok:boolean;text:string}|null>(null)
  const [orgId, setOrgId]     = useState('')
  const [form, setForm]       = useState({ name:'', whatsapp_number:'' })
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
    e.preventDefault(); setSaving(true)
    await sb.from('organizations').update({ name: form.name, whatsapp_number: form.whatsapp_number }).eq('id', orgId)
    setSaveOk(true); setSaving(false)
    setTimeout(() => setSaveOk(false), 3000)
  }

  async function sendNotification() {
    setSending(true); setSendMsg(null)
    try {
      const res  = await fetch('/api/notify-low-stock', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ org_id: orgId }) })
      const data = await res.json()
      setSendMsg(data.success ? { ok:true, text:'تم إرسال إشعار المخزون الناقص بنجاح' } : { ok:false, text: data.message || 'فشل الإرسال' })
    } catch { setSendMsg({ ok:false, text:'خطأ في الاتصال' }) }
    setSending(false)
    setTimeout(() => setSendMsg(null), 5000)
  }

  if (loading) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:620,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.4}}.sk{animation:sk 1.4s infinite}`}</style>
      {[1,2].map(i=>(<div key={i} style={{...card,padding:24,marginBottom:16}}>{[60,100,80].map((w,j)=>(<div key={j} className="sk" style={{height:12,width:w+'%',background:colors.border,borderRadius:6,marginBottom:16}}/>))}</div>))}
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:620,margin:'0 auto'}}>
      <div style={{marginBottom:22}}>
        <h1 style={{...pageTitle}}>الإعدادات</h1>
        <p style={{...pageSub}}>إعدادات المؤسسة وتنبيهات واتساب</p>
      </div>

      {saveOk && (
        <div style={{background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`,borderRadius:radius.md,padding:'12px 16px',marginBottom:16,fontSize:font.sm,fontWeight:600,color:colors.primary,display:'flex',alignItems:'center',gap:8}}>
          ✅ تم حفظ الإعدادات بنجاح
        </div>
      )}

      <form onSubmit={handleSave}>
        <Section title="بيانات المؤسسة" icon="🏢">
          <div style={{display:'flex',flexDirection:'column' as const,gap:16}}>
            <div>
              <label style={lbl}>اسم المؤسسة</label>
              <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp()} placeholder="مثال: مطعم الأصيل"/>
            </div>
            <div>
              <label style={lbl}>رقم واتساب التنبيهات</label>
              <input value={form.whatsapp_number} onChange={e=>setForm({...form,whatsapp_number:e.target.value})} style={inp()} placeholder="+966500000000" dir="ltr"/>
              <div style={{fontSize:11,color:colors.text4,marginTop:6}}>يُستخدم لإرسال تنبيهات نقص المخزون تلقائياً</div>
            </div>
          </div>
          <div style={{marginTop:20}}>
            <button type="submit" disabled={saving} style={{...btnPrimary,width:'100%',padding:'13px',opacity:saving?0.7:1,cursor:saving?'not-allowed':'pointer'}}>
              {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
            </button>
          </div>
        </Section>
      </form>

      <Section title="إشعارات واتساب" icon="📲">
        <p style={{fontSize:font.sm,color:colors.text3,marginBottom:16,lineHeight:1.7}}>إرسال إشعار فوري على واتساب بقائمة المنتجات التي وصلت للحد الأدنى.</p>
        {sendMsg && (
          <div style={{background:sendMsg.ok?colors.primaryLight:colors.dangerLight,border:`1.5px solid ${sendMsg.ok?colors.primaryBorder:colors.dangerBorder}`,borderRadius:radius.md,padding:'10px 14px',marginBottom:14,fontSize:font.sm,fontWeight:600,color:sendMsg.ok?colors.primary:colors.danger,display:'flex',alignItems:'center',gap:8}}>
            {sendMsg.ok?'✅':'❌'} {sendMsg.text}
          </div>
        )}
        <button type="button" onClick={sendNotification} disabled={sending}
          style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:'100%',padding:'13px',background:sending?colors.text4:'#25d366',color:'white',border:'none',borderRadius:radius.md,fontSize:font.base,fontWeight:700,cursor:sending?'not-allowed':'pointer',fontFamily:font.family,transition:'all .15s',boxShadow:sending?'none':'0 4px 14px rgba(37,211,102,.3)'}}>
          {sending ? 'جاري الإرسال...' : '📲 إرسال إشعار المخزون الناقص'}
        </button>
      </Section>
    </div>
  )
}
