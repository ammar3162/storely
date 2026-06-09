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

const DAYS = [
  {key:'0',label:'الأحد'},{key:'1',label:'الإثنين'},{key:'2',label:'الثلاثاء'},
  {key:'3',label:'الأربعاء'},{key:'4',label:'الخميس'},{key:'5',label:'الجمعة'},{key:'6',label:'السبت'},
]

export default function SettingsPage() {
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [sending, setSending]           = useState(false)
  const [saveOk, setSaveOk]             = useState(false)
  const [sendMsg, setSendMsg]           = useState<{ok:boolean;text:string}|null>(null)
  const [orgId, setOrgId]               = useState('')
  const [lastSent, setLastSent]         = useState<string|null>(null)
  const [lastBackup, setLastBackup]     = useState<string|null>(null)
  const [backups, setBackups]           = useState<any[]>([])
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupMsg, setBackupMsg]       = useState<{ok:boolean;text:string}|null>(null)
  const [form, setForm] = useState({
    name:'', whatsapp_number:'',
    notify_schedule:'daily',
    notify_time:'08:00',
    notify_days:['0'],
  })
  const sb = createClient()

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    const{data:{user}}=await sb.auth.getUser(); if(!user) return
    const{data:profile}=await sb.from('profiles').select('org_id').eq('id',user.id).single(); if(!profile) return
    setOrgId(profile.org_id)
    const{data:orgRaw}=await sb.from('organizations').select('*').eq('id',profile.org_id).single()
    const org=orgRaw as any
    if(org){
      setForm({ name:org.name||'', whatsapp_number:org.whatsapp_number||'', notify_schedule:org.notify_schedule||'daily', notify_time:org.notify_time||'08:00', notify_days:org.notify_days||['0'] })
      setLastSent(org.last_notified_at||null)
      setLastBackup(org.last_backup_at||null)
    }
    setLoading(false)
  }

  async function handleSave(e:React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await sb.from('organizations').update({ name:form.name, whatsapp_number:form.whatsapp_number, notify_schedule:form.notify_schedule, notify_time:form.notify_time, notify_days:form.notify_days } as any).eq('id',orgId)
    setSaveOk(true); setSaving(false); setTimeout(()=>setSaveOk(false),3000)
  }

  async function sendNow() {
    setSending(true); setSendMsg(null)
    try {
      const res=await fetch('/api/notify-low-stock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId})})
      const data=await res.json()
      if(data.success){setSendMsg({ok:true,text:data.message||'تم إرسال الإشعار بنجاح'});setLastSent(new Date().toISOString())}
      else setSendMsg({ok:false,text:data.message||'فشل الإرسال'})
    } catch{setSendMsg({ok:false,text:'خطأ في الاتصال'})}
    setSending(false); setTimeout(()=>setSendMsg(null),6000)
  }

  async function loadBackups() {
    const res=await fetch('/api/backup/list',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId})})
    const data=await res.json(); if(data.success) setBackups(data.backups||[])
  }

  async function runBackup() {
    setBackupLoading(true); setBackupMsg(null)
    try {
      const res=await fetch('/api/backup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId})})
      const data=await res.json()
      if(data.success){setBackupMsg({ok:true,text:'تم إنشاء نسخة احتياطية بنجاح'});setLastBackup(new Date().toISOString());loadBackups()}
      else setBackupMsg({ok:false,text:'فشل إنشاء النسخة الاحتياطية'})
    } catch{setBackupMsg({ok:false,text:'خطأ في الاتصال'})}
    setBackupLoading(false); setTimeout(()=>setBackupMsg(null),5000)
  }

  function toggleDay(day:string) {
    const days=form.notify_days.includes(day)?form.notify_days.filter(d=>d!==day):[...form.notify_days,day]
    if(days.length===0) return
    setForm({...form,notify_days:days})
  }

  function scheduleLabel() {
    if(form.notify_schedule==='manual') return 'يدوي فقط'
    if(form.notify_schedule==='daily') return `يومياً الساعة ${form.notify_time}`
    const dayLabels=form.notify_days.map(d=>DAYS.find(x=>x.key===d)?.label).join('، ')
    return `أسبوعياً (${dayLabels}) الساعة ${form.notify_time}`
  }

  if(loading) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:620,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.4}}.sk{animation:sk 1.4s infinite}`}</style>
      {[1,2,3].map(i=>(<div key={i} style={{...card,padding:24,marginBottom:16}}>{[60,100,80].map((w,j)=>(<div key={j} className="sk" style={{height:12,width:w+'%',background:colors.border,borderRadius:6,marginBottom:16}}/>))}</div>))}
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:620,margin:'0 auto'}}>
      <div style={{marginBottom:22}}>
        <h1 style={{...pageTitle}}>الإعدادات</h1>
        <p style={{...pageSub}}>إعدادات المؤسسة وجدولة تنبيهات واتساب والنسخ الاحتياطي</p>
      </div>

      {saveOk&&(<div style={{background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`,borderRadius:radius.md,padding:'12px 16px',marginBottom:16,fontSize:font.sm,fontWeight:600,color:colors.primary,display:'flex',alignItems:'center',gap:8}}>✅ تم حفظ الإعدادات بنجاح</div>)}

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
              <div style={{fontSize:11,color:colors.text4,marginTop:6}}>يُستخدم لإرسال تنبيهات نقص المخزون</div>
            </div>
          </div>
        </Section>

        <Section title="جدولة الإشعارات التلقائية" icon="⏰">
          <div style={{marginBottom:18}}>
            <label style={lbl}>نوع الجدولة</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {[{key:'daily',label:'يومي',icon:'📅'},{key:'weekly',label:'أسبوعي',icon:'📆'},{key:'manual',label:'يدوي',icon:'👆'}].map(s=>(
                <button key={s.key} type="button" onClick={()=>setForm({...form,notify_schedule:s.key})}
                  style={{padding:'12px 8px',borderRadius:radius.md,cursor:'pointer',border:`1.5px solid ${form.notify_schedule===s.key?colors.primary:colors.border2}`,background:form.notify_schedule===s.key?colors.primaryLight:colors.surface,color:form.notify_schedule===s.key?colors.primary:colors.text3,fontSize:font.sm,fontWeight:700,fontFamily:font.family,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:4,transition:'all .15s'}}>
                  <span style={{fontSize:20}}>{s.icon}</span><span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
          {form.notify_schedule==='weekly'&&(
            <div style={{marginBottom:18}}>
              <label style={lbl}>أيام الإرسال</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
                {DAYS.map(d=>(<button key={d.key} type="button" onClick={()=>toggleDay(d.key)} style={{padding:'7px 12px',borderRadius:radius.md,cursor:'pointer',border:`1.5px solid ${form.notify_days.includes(d.key)?colors.primary:colors.border2}`,background:form.notify_days.includes(d.key)?colors.primaryLight:colors.surface,color:form.notify_days.includes(d.key)?colors.primary:colors.text3,fontSize:font.xs,fontWeight:700,fontFamily:font.family,transition:'all .15s'}}>{d.label}</button>))}
              </div>
            </div>
          )}
          {form.notify_schedule!=='manual'&&(
            <div style={{marginBottom:18}}>
              <label style={lbl}>وقت الإرسال</label>
              <input type="time" value={form.notify_time} onChange={e=>setForm({...form,notify_time:e.target.value})} style={{...inp(),width:'auto',direction:'ltr' as const}}/>
              <div style={{fontSize:11,color:colors.text4,marginTop:6}}>توقيت الرياض (UTC+3)</div>
            </div>
          )}
          {form.notify_schedule!=='manual'&&(
            <div style={{background:colors.primaryLight,border:`1px solid ${colors.primaryBorder}`,borderRadius:radius.md,padding:'10px 14px',marginBottom:18,fontSize:font.sm,color:colors.primary,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:16}}>🔔</span> سيتم إرسال الإشعار {scheduleLabel()}
            </div>
          )}
          {form.notify_schedule==='manual'&&(
            <div style={{background:colors.warningLight,border:`1px solid ${colors.warningBorder}`,borderRadius:radius.md,padding:'10px 14px',marginBottom:18,fontSize:font.sm,color:colors.warning,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:16}}>👆</span> الإرسال يدوياً فقط عند الضغط على الزر أدناه
            </div>
          )}
          <button type="submit" disabled={saving} style={{...btnPrimary,width:'100%',padding:'13px',opacity:saving?0.7:1,cursor:saving?'not-allowed':'pointer'}}>
            {saving?'جاري الحفظ...':'💾 حفظ الإعدادات'}
          </button>
        </Section>
      </form>

      <Section title="إرسال فوري" icon="📲">
        {lastSent&&(<div style={{fontSize:font.xs,color:colors.text4,marginBottom:12,display:'flex',alignItems:'center',gap:6}}><span>آخر إرسال:</span><span style={{fontWeight:600,color:colors.text2}}>{new Date(lastSent).toLocaleDateString('ar-SA',{weekday:'long',hour:'2-digit',minute:'2-digit'})}</span></div>)}
        {sendMsg&&(<div style={{background:sendMsg.ok?colors.primaryLight:colors.dangerLight,border:`1.5px solid ${sendMsg.ok?colors.primaryBorder:colors.dangerBorder}`,borderRadius:radius.md,padding:'10px 14px',marginBottom:14,fontSize:font.sm,fontWeight:600,color:sendMsg.ok?colors.primary:colors.danger,display:'flex',alignItems:'center',gap:8}}>{sendMsg.ok?'✅':'❌'} {sendMsg.text}</div>)}
        <p style={{fontSize:font.sm,color:colors.text3,marginBottom:14,lineHeight:1.7}}>إرسال إشعار فوري الآن بقائمة المنتجات التي وصلت للحد الأدنى.</p>
        <button type="button" onClick={sendNow} disabled={sending}
          style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:'100%',padding:'13px',background:sending?colors.text4:'#25d366',color:'white',border:'none',borderRadius:radius.md,fontSize:font.base,fontWeight:700,cursor:sending?'not-allowed':'pointer',fontFamily:font.family,transition:'all .15s',boxShadow:sending?'none':'0 4px 14px rgba(37,211,102,.3)'}}>
          {sending?'⏳ جاري الإرسال...':'📲 إرسال إشعار الآن'}
        </button>
      </Section>

      <Section title="النسخ الاحتياطي" icon="💾">
        {lastBackup&&(<div style={{fontSize:font.xs,color:colors.text4,marginBottom:12,display:'flex',alignItems:'center',gap:6}}><span>آخر نسخة:</span><span style={{fontWeight:600,color:colors.text2}}>{new Date(lastBackup).toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span></div>)}
        {backupMsg&&(<div style={{background:backupMsg.ok?colors.primaryLight:colors.dangerLight,border:`1.5px solid ${backupMsg.ok?colors.primaryBorder:colors.dangerBorder}`,borderRadius:radius.md,padding:'10px 14px',marginBottom:14,fontSize:font.sm,fontWeight:600,color:backupMsg.ok?colors.primary:colors.danger,display:'flex',alignItems:'center',gap:8}}>{backupMsg.ok?'✅':'❌'} {backupMsg.text}</div>)}
        <p style={{fontSize:font.sm,color:colors.text3,marginBottom:14,lineHeight:1.7}}>يتم إنشاء نسخة احتياطية تلقائياً كل أسبوع. يمكنك أيضاً إنشاء نسخة يدوياً وتحميلها.</p>
        <button type="button" onClick={runBackup} disabled={backupLoading}
          style={{...btnPrimary,width:'100%',padding:'13px',marginBottom:12,opacity:backupLoading?0.7:1,cursor:backupLoading?'not-allowed':'pointer'}}>
          {backupLoading?'⏳ جاري إنشاء النسخة...':'💾 إنشاء نسخة احتياطية الآن'}
        </button>
        {backups.length===0&&(<button type="button" onClick={loadBackups} style={{...btnSecondary,width:'100%',padding:'11px',fontSize:font.sm}}>📋 عرض النسخ السابقة</button>)}
        {backups.length>0&&(
          <div style={{...card,overflow:'hidden'}}>
            <div style={{padding:'10px 14px',borderBottom:`1px solid ${colors.border}`,fontSize:font.xs,fontWeight:700,color:colors.text4}}>النسخ الاحتياطية ({backups.length})</div>
            {backups.map((b,i)=>(<div key={i} style={{padding:'12px 14px',borderBottom:i<backups.length-1?`1px solid ${colors.border}`:'none',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><div><div style={{fontSize:font.sm,fontWeight:600,color:colors.text}}>{b.name?.replace('_backup.json','')}</div><div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>{Math.round((b.size||0)/1024)} KB</div></div>{b.url&&(<a href={b.url} download style={{...btnPrimary,padding:'7px 14px',fontSize:font.xs,textDecoration:'none'}}>⬇ تحميل</a>)}</div>))}
          </div>
        )}
      </Section>
    </div>
  )
}
