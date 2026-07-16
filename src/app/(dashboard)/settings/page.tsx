'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, font, card, btnPrimary, btnSecondary, inp, pageTitle, pageSub } from '@/lib/ds'

const lbl: React.CSSProperties = { fontSize: font.xs, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }

const DAYS = [
  {key:'0',label:'أحد'},{key:'1',label:'إثن'},{key:'2',label:'ثلث'},
  {key:'3',label:'أرب'},{key:'4',label:'خمس'},{key:'5',label:'جمع'},{key:'6',label:'سبت'},
]

const TABS = [
  {key:'org',    label:'المؤسسة',    icon:'🏢'},
  {key:'notify', label:'الإشعارات',  icon:'🔔'},
  {key:'branches',label:'الفروع',   icon:'🏪'},
  {key:'backup', label:'النسخ الاحتياطي', icon:'💾'},
  {key:'security',label:'الأمان',   icon:'🔐'},
]

const COUNTRY_CODES = [
  { code: '+966', flag: '🇸🇦', name: 'السعودية' },
  { code: '+971', flag: '🇦🇪', name: 'الإمارات' },
  { code: '+965', flag: '🇰🇼', name: 'الكويت' },
  { code: '+973', flag: '🇧🇭', name: 'البحرين' },
  { code: '+974', flag: '🇶🇦', name: 'قطر' },
  { code: '+968', flag: '🇴🇲', name: 'عُمان' },
  { code: '+967', flag: '🇾🇪', name: 'اليمن' },
  { code: '+20', flag: '🇪🇬', name: 'مصر' },
  { code: '+962', flag: '🇯🇴', name: 'الأردن' },
  { code: '+961', flag: '🇱🇧', name: 'لبنان' },
  { code: '+963', flag: '🇸🇾', name: 'سوريا' },
  { code: '+964', flag: '🇮🇶', name: 'العراق' },
  { code: '+212', flag: '🇲🇦', name: 'المغرب' },
  { code: '+213', flag: '🇩🇿', name: 'الجزائر' },
  { code: '+216', flag: '🇹🇳', name: 'تونس' },
  { code: '+249', flag: '🇸🇩', name: 'السودان' },
  { code: '+1', flag: '🇺🇸', name: 'أمريكا' },
  { code: '+44', flag: '🇬🇧', name: 'بريطانيا' },
  { code: '+91', flag: '🇮🇳', name: 'الهند' },
  { code: '+92', flag: '🇵🇰', name: 'باكستان' },
  { code: '+880', flag: '🇧🇩', name: 'بنغلاديش' },
  { code: '+63', flag: '🇵🇭', name: 'الفلبين' },
]

function parsePhone(full: string) {
  for (const c of COUNTRY_CODES) {
    if (full.startsWith(c.code)) return { countryCode: c.code, number: full.slice(c.code.length) }
  }
  if (full.startsWith('05') || full.startsWith('5')) return { countryCode: '+966', number: full.startsWith('05') ? full.slice(1) : full }
  return { countryCode: '+966', number: full }
}

export default function SettingsPage() {
  const [loading, setLoading]           = useState(true)
  const [showDelete, setShowDelete]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting]           = useState(false)
  const [deleteMsg, setDeleteMsg]         = useState<{ok:boolean;text:string}|null>(null)
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
  const [branches, setBranches]         = useState<any[]>([])
  const [inactiveBranches, setInactiveBranches] = useState<any[]>([])
  const [reactivatingId, setReactivatingId] = useState<string|null>(null)

  async function loadInactiveBranches(oid:string) {
    const{data}=await sb.from('branches').select('*').eq('org_id',oid).eq('is_active',false).order('created_at')
    setInactiveBranches(data||[])
  }

  async function reactivateBranch(id:string) {
    setReactivatingId(id)
    await sb.from('branches').update({is_active:true} as any).eq('id',id)
    const b = inactiveBranches.find((x:any)=>x.id===id)
    setInactiveBranches(prev=>prev.filter((x:any)=>x.id!==id))
    if (b) setBranches(prev=>[...prev, b])
    setReactivatingId(null)
  }
  const [maxBranches, setMaxBranches]   = useState<number>(1)
  const [newBranch, setNewBranch]       = useState({name:'',location:''})
  const [editingPhoneId, setEditingPhoneId] = useState<string|null>(null)
  const [editPhoneValue, setEditPhoneValue] = useState('')
  const [savingPhone, setSavingPhone]       = useState(false)

  async function saveBranchPhone(id: string) {
    setSavingPhone(true)
    await (sb.from('branches' as any) as any).update({ whatsapp_number: editPhoneValue.trim() || null }).eq('id', id)
    setBranches((prev:any[]) => prev.map(b => b.id===id ? {...b, whatsapp_number: editPhoneValue.trim() || null} : b))
    setEditingPhoneId(null); setSavingPhone(false)
  }
  const [branchSaving, setBranchSaving] = useState(false)
  const [pwForm, setPwForm]             = useState({current:'',newPw:'',confirm:''})
  const [pwSaving, setPwSaving]         = useState(false)
  const [pwMsg, setPwMsg]               = useState<{ok:boolean;text:string}|null>(null)
  const [activeTab, setActiveTab]       = useState('org')
  const [visible, setVisible]           = useState(false)
  const [countryCode, setCountryCode]   = useState('+966')
  const [logoUrl, setLogoUrl]           = useState<string|null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [planName, setPlanName]         = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState<string|null>(null)
  const [userEmail, setUserEmail]       = useState('')
  const [userId, setUserId]             = useState('')
  const [subEndsAt, setSubEndsAt]       = useState<string|null>(null)
  const [form, setForm] = useState({
    name:'', whatsapp_number:'',
    notify_schedule:'daily',
    notify_time:'08:00',
    notify_days:['0'],
    notify_cashier_closing_wa:true,
    notify_supplier_wa:true,
  })
  const sb = createClient()

  useEffect(()=>{ load() },[])

  async function changePassword(e:React.FormEvent) {
    e.preventDefault(); setPwMsg(null)
    if (pwForm.newPw.length < 6) { setPwMsg({ok:false,text:'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'}); return }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg({ok:false,text:'كلمتا المرور غير متطابقتين'}); return }
    setPwSaving(true)
    const sb2 = createClient()
    const { data:{user} } = await sb2.auth.getUser()
    if (!user?.email) { setPwMsg({ok:false,text:'حدث خطأ، حاول مرة أخرى'}); setPwSaving(false); return }
    const { error: signErr } = await sb2.auth.signInWithPassword({ email: user.email, password: pwForm.current })
    if (signErr) { setPwMsg({ok:false,text:'كلمة المرور الحالية غير صحيحة'}); setPwSaving(false); return }
    const { error } = await sb2.auth.updateUser({ password: pwForm.newPw })
    setPwSaving(false)
    if (error) { setPwMsg({ok:false,text:'حدث خطأ في تغيير كلمة المرور'}); return }
    setPwMsg({ok:true,text:'تم تغيير كلمة المرور بنجاح ✅'})
    setPwForm({current:'',newPw:'',confirm:''})
  }

  async function handleUpgrade(plan: string) {
    setCheckoutLoading(plan)
    try {
      const orgId = sessionStorage.getItem('s_org_id')
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ plan, org_id: orgId, user_id: userId, email: userEmail })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('حدث خطأ، حاول مرة أخرى')
    } catch { alert('حدث خطأ، حاول مرة أخرى') }
    setCheckoutLoading(null)
  }

  async function load() {
    setLoading(true)
    const{data:{user}}=await sb.auth.getUser(); if(!user) return
    const{data:profile}=await sb.from('profiles').select('org_id').eq('id',user.id).single(); if(!profile) return
    setOrgId(profile.org_id)
    const{data:orgRaw}=await sb.from('organizations').select('*').eq('id',profile.org_id).single()
    const org=orgRaw as any
    if(org){
      const parsed = parsePhone(org.whatsapp_number||'')
      setCountryCode(parsed.countryCode)
      setForm({ name:org.name||'', whatsapp_number:parsed.number||'', notify_schedule:org.notify_schedule||'daily', notify_time:org.notify_time||'08:00', notify_days:org.notify_days||['0'], notify_cashier_closing_wa:org.notify_cashier_closing_wa!==false, notify_supplier_wa:org.notify_supplier_wa!==false })
      setLastSent(org.last_notified_at||null)
      setLastBackup(org.last_backup_at||null)
      setMaxBranches(org.max_branches||1)
      const{data:{user}}=await sb.auth.getUser()
      if(user){setUserEmail(user.email||'');setUserId(user.id)}
      setLogoUrl(org.logo_url||null)
      const planMap: Record<string,string> = {'basic':'الأساسية','pro':'المتوسطة','advanced':'المتقدمة'}
      setPlanName(planMap[org.plan||'']||org.plan||'')
      setSubEndsAt(org.subscription_ends_at||null)
      const{data:bList}=await sb.from('branches').select('*').eq('org_id',profile.org_id).eq('is_active',true).order('created_at')
      setBranches(bList||[])
      loadInactiveBranches(profile.org_id)
    }
    setLoading(false)
    setTimeout(()=>setVisible(true),50)
  }

  async function handleSave(e:React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const fullPhone = countryCode + form.whatsapp_number.replace(/^0+/, '')
    await sb.from('organizations').update({ name:form.name, whatsapp_number:fullPhone, notify_schedule:form.notify_schedule, notify_time:form.notify_time, notify_days:form.notify_days, notify_cashier_closing_wa:form.notify_cashier_closing_wa, notify_supplier_wa:form.notify_supplier_wa } as any).eq('id',orgId)
    setSaveOk(true); setSaving(false); setTimeout(()=>setSaveOk(false),3000)
  }

  async function uploadLogo(file: File) {
    if (!orgId) return
    setLogoUploading(true)
    const ext = file.name.split('.').pop()
    const path = `logos/${orgId}-${Date.now()}.${ext}`
    const { error: upErr } = await sb.storage.from('invoices').upload(path, file, { upsert: true })
    if (upErr) { setLogoUploading(false); return }
    const { data: pub } = sb.storage.from('invoices').getPublicUrl(path)
    await sb.from('organizations').update({ logo_url: pub.publicUrl } as any).eq('id', orgId)
    setLogoUrl(pub.publicUrl)
    setLogoUploading(false)
    // تحديث الـ sidebar تلقائياً
    window.dispatchEvent(new CustomEvent('logo-updated', { detail: pub.publicUrl }))
  }

  async function sendNow() {
    setSending(true); setSendMsg(null)
    try {
      const res=await fetch('/api/notify-low-stock',{method:'POST',headers:{'Content-Type':'application/json','x-cron-secret':process.env.NEXT_PUBLIC_APP_URL||''},body:JSON.stringify({org_id:orgId})})
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

  async function addBranch() {
    if(!newBranch.name.trim()) return
    setBranchSaving(true)
    await sb.from('branches').insert({ org_id:orgId, name:newBranch.name.trim(), location:newBranch.location.trim()||null })
    const{data:bList}=await sb.from('branches').select('*').eq('org_id',orgId).eq('is_active',true).order('created_at')
    setBranches(bList||[]); setNewBranch({name:'',location:''}); setBranchSaving(false)
  }

  async function deleteBranch(id:string) {
    if(branches.length<=1){alert('لا يمكن حذف الفرع الوحيد');return}
    await sb.from('branches').update({is_active:false}).eq('id',id)
    setBranches(prev=>prev.filter((b:any)=>b.id!==id))
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

  async function deleteAccount() {
    if(deleteConfirm !== form.name) { setDeleteMsg({ok:false,text:'اسم المنشأة غير صحيح'}); return }
    setDeleting(true)
    try {
      const{data:{user}}=await sb.auth.getUser(); if(!user){setDeleting(false);return}
      const res=await fetch('/api/delete-account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,user_id:user.id})})
      const data=await res.json()
      if(data.success){
        await sb.auth.signOut()
        window.location.href='/login?deleted=1'
      } else {
        setDeleteMsg({ok:false,text:'حدث خطأ أثناء الحذف — تواصل معنا'})
        setDeleting(false)
      }
    } catch {
      setDeleteMsg({ok:false,text:'خطأ في الاتصال'})
      setDeleting(false)
    }
  }

  const planLabel = planName==='الأساسية'?'الباقة الأساسية — 149 ر.س/شهر':planName==='المتوسطة'?'الباقة المتوسطة — 249 ر.س/شهر':planName==='المتقدمة'?'الباقة المتقدمة — 399 ر.س/شهر':maxBranches===1?'الباقة الأساسية — 149 ر.س/شهر':maxBranches<=3?'الباقة المتوسطة — 249 ر.س/شهر':'الباقة المتقدمة — 399 ر.س/شهر'

  if(loading) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:640,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.6s ease-in-out infinite}`}</style>
      <div className="sk" style={{height:20,width:120,background:colors.border2,borderRadius:6,marginBottom:8}}/>
      <div className="sk" style={{height:12,width:200,background:colors.border,borderRadius:6,marginBottom:24}}/>
      <div className="sk" style={{height:52,borderRadius:radius.lg,background:colors.border,marginBottom:16}}/>
      {[1,2,3].map(i=>(<div key={i} className="sk" style={{height:160,borderRadius:radius.lg,background:colors.border,marginBottom:12}}/>))}
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:640,margin:'0 auto',opacity:visible?1:0,transition:'opacity .4s ease',position:'relative'}}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .su{animation:slideUp .4s ease both}
        input:focus,select:focus,textarea:focus{border-color:${colors.primary}!important;box-shadow:0 0 0 3px ${colors.primaryLight}!important}
        .tab-btn{padding:10px 0;border:none;cursor:pointer;font-family:inherit;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;border-bottom:2.5px solid transparent}
        .tab-btn.active{border-bottom-color:${colors.primary}}
        .day-btn{padding:8px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${colors.border};background:${colors.surface};color:${colors.text3};font-family:inherit;transition:all .15s}
        .day-btn.active{border-color:${colors.primary};background:${colors.primaryLight};color:${colors.primary}}
        .sched-btn{padding:14px 8px;border-radius:${radius.md};cursor:pointer;border:1.5px solid ${colors.border};background:${colors.surface};color:${colors.text3};font-size:${font.sm};font-weight:700;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;transition:all .2s}
        .sched-btn:hover{border-color:${colors.primary};transform:translateY(-1px)}
        .sched-btn.active{border-color:${colors.primary};background:${colors.primaryLight};color:${colors.primary};box-shadow:0 4px 12px ${colors.primary}22}
      `}</style>

      {/* Header */}
      <div style={{marginBottom:20}} className="su">
        <h1 style={{...pageTitle}}>الإعدادات</h1>
        <p style={{...pageSub}}>إعدادات المؤسسة وجدولة التنبيهات والنسخ الاحتياطي</p>
      </div>

      {/* Plan badge */}
      <div className="su" style={{...card,padding:'14px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:12,animationDelay:'.05s',background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`}}>
        <div style={{width:40,height:40,borderRadius:12,background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,boxShadow:`0 2px 8px ${colors.primary}22`}}>⭐</div>
        <div>
          <div style={{fontSize:font.sm,fontWeight:800,color:colors.primary}}>{planLabel}</div>
          <div style={{fontSize:font.xs,color:colors.primary,opacity:.7,marginTop:1}}>الفروع: {branches.length} / {maxBranches} مسموح</div>
        </div>
      </div>

      {/* Save success */}
      {saveOk&&(
        <div className="su" style={{background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`,borderRadius:radius.md,padding:'12px 16px',marginBottom:16,fontSize:font.sm,fontWeight:700,color:colors.primary,display:'flex',alignItems:'center',gap:8}}>
          ✅ تم حفظ الإعدادات بنجاح
        </div>
      )}

      {/* Tabs */}
      <div className="su" style={{...card,overflow:'hidden',marginBottom:16,animationDelay:'.1s'}}>
        <div style={{display:'flex',borderBottom:`1px solid ${colors.border}`,overflowX:'auto',scrollbarWidth:'none'}}>
          {TABS.map(t=>(
            <button key={t.key} className={`tab-btn${activeTab===t.key?' active':''}`}
              onClick={()=>setActiveTab(t.key)}
              style={{background:'none',color:activeTab===t.key?colors.primary:colors.text3}}>
              <span style={{fontSize:18}}>{t.icon}</span>
              <span style={{fontSize:10,fontWeight:700}}>{t.label}</span>
            </button>
          ))}
        </div>

        <div style={{padding:22}}>

          {/* ORG TAB */}
          {activeTab==='org'&&(
            <form onSubmit={handleSave}>
              <div style={{display:'flex',flexDirection:'column' as const,gap:18}}>

                {/* هوية المنشأة — شعار مدمج + اسم بنفس الصف */}
                <div>
                  <label style={lbl}>هوية المنشأة</label>
                  <div style={{display:'flex',alignItems:'center',gap:14,background:colors.bg,border:`1px solid ${colors.border}`,borderRadius:radius.md,padding:'14px'}}>
                    <input type="file" accept="image/*" id="logoInput" style={{display:'none'}}
                      onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadLogo(f) }}/>
                    <label htmlFor="logoInput" style={{cursor:'pointer',flexShrink:0}}>
                      <div style={{position:'relative',width:64,height:64,borderRadius:'50%',overflow:'hidden',background:logoUrl?'transparent':'linear-gradient(135deg,#f0fdf4,#dcfce7)',border:`2px solid ${colors.primaryBorder}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {logoUrl ? (
                          <img src={logoUrl} alt="شعار" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                        ) : (
                          <span style={{fontSize:24}}>🏢</span>
                        )}
                        {logoUploading && (
                          <div style={{position:'absolute',inset:0,background:'rgba(255,255,255,.85)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>⏳</div>
                        )}
                        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,.55)',color:'white',fontSize:9,fontWeight:700,textAlign:'center',padding:'3px 0'}}>
                          تغيير
                        </div>
                      </div>
                    </label>
                    <div style={{flex:1,minWidth:0}}>
                      <label style={{...lbl,marginBottom:4}}>اسم المؤسسة</label>
                      <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp()} placeholder="مثال: مطعم الأصيل"/>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:colors.text4,marginTop:6}}>PNG أو JPG · يُفضّل مربع الشكل</div>
                </div>
                <div>
                  <label style={lbl}>رقم واتساب التنبيهات</label>
                  <div style={{display:'flex',borderRadius:12,overflow:'hidden',border:'1.5px solid #e2e8f0',background:'#f8fafc'}}>
                    <select value={countryCode} onChange={e=>setCountryCode(e.target.value)}
                      style={{background:'transparent',color:'#1e293b',border:'none',borderLeft:'1.5px solid #e2e8f0',padding:'12px 8px',fontSize:13,fontFamily:'inherit',outline:'none',flexShrink:0,cursor:'pointer',direction:'ltr',minWidth:130}}>
                      {COUNTRY_CODES.map(c=>(
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                    <input value={form.whatsapp_number} onChange={e=>setForm({...form,whatsapp_number:e.target.value})}
                      placeholder={countryCode==='+966'?'5xxxxxxxx':countryCode==='+20'?'1xxxxxxxxx':'xxxxxxxxxx'} dir="ltr"
                      style={{background:'transparent',border:'none',padding:'12px',fontSize:14,color:'#1e293b',flex:1,outline:'none',fontFamily:'inherit'}}/>
                  </div>
                  <div style={{fontSize:11,color:colors.text4,marginTop:6,display:'flex',alignItems:'center',gap:4}}><span>💡</span> يُستخدم لإرسال تنبيهات نقص المخزون</div>
                </div>

                {/* تفاصيل الاشتراك */}
                <div>
                  <label style={lbl}>الاشتراك</label>
                  <div style={{background:colors.bg,border:`1px solid ${colors.border}`,borderRadius:radius.md,padding:'14px 16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:subEndsAt?10:0}}>
                      <span style={{fontSize:font.sm,color:colors.text3}}>الباقة الحالية</span>
                      <span style={{fontSize:font.sm,fontWeight:800,color:colors.primary}}>{planName||planLabel}</span>
                    </div>
                    {subEndsAt && (
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:10,borderTop:`1px solid ${colors.border}`}}>
                        <span style={{fontSize:font.sm,color:colors.text3}}>ينتهي في</span>
                        <span style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>{new Date(subEndsAt).toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'})}</span>
                      </div>
                    )}
                  </div>

                  {/* أزرار الترقية - مؤقتاً عبر واتساب */}
                  <div style={{marginTop:16,background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
                    <div style={{fontSize:22}}>📲</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:'#92400e',marginBottom:2}}>للترقية تواصل معنا عبر واتساب</div>
                      <div style={{fontSize:11,color:'#b45309'}}>الأساسية 149 · المتوسطة 249 · المتقدمة 399 ريال/شهر</div>
                    </div>
                    <a href="https://wa.me/966594351667?text=أريد الترقية في Storely" target="_blank" rel="noopener noreferrer"
                      style={{marginRight:'auto',padding:'8px 16px',background:'#16a34a',color:'white',borderRadius:8,fontSize:12,fontWeight:700,textDecoration:'none',whiteSpace:'nowrap'}}>
                      تواصل معنا
                    </a>
                  </div>
                </div>

              </div>
              <button type="submit" disabled={saving} style={{...btnPrimary,width:'100%',padding:'13px',marginTop:20,opacity:saving?0.7:1,cursor:saving?'not-allowed':'pointer'}}>
                {saving?'⏳ جاري الحفظ...':'💾 حفظ البيانات'}
              </button>
            </form>
          )}

          {/* NOTIFY TAB */}
          {activeTab==='notify'&&(
            <form onSubmit={handleSave}>
              <div style={{marginBottom:24,paddingBottom:24,borderBottom:`1px solid ${colors.border}`}}>
                <label style={lbl}>رسائل واتساب — اختر وش يوصلك</label>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <label style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:colors.bg,borderRadius:radius.md,border:`1.5px solid ${form.notify_cashier_closing_wa?colors.primaryBorder:colors.border}`,cursor:'pointer'}}>
                    <input type="checkbox" checked={form.notify_cashier_closing_wa} onChange={e=>setForm({...form,notify_cashier_closing_wa:e.target.checked})}
                      style={{accentColor:colors.primary,width:16,height:16}}/>
                    <div>
                      <div style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>🏪 تقارير إقفال الكاشير</div>
                      <div style={{fontSize:11,color:colors.text4,marginTop:2}}>رسالة فورية كل ما موظف يقفل الصندوق</div>
                    </div>
                  </label>
                  <label style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:colors.bg,borderRadius:radius.md,border:`1.5px solid ${form.notify_supplier_wa?colors.primaryBorder:colors.border}`,cursor:'pointer'}}>
                    <input type="checkbox" checked={form.notify_supplier_wa} onChange={e=>setForm({...form,notify_supplier_wa:e.target.checked})}
                      style={{accentColor:colors.primary,width:16,height:16}}/>
                    <div>
                      <div style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>🚚 تحديثات الموردين</div>
                      <div style={{fontSize:11,color:colors.text4,marginTop:2}}>تأكيد الاستلام وتصعيد الطلبات المتأخرة</div>
                    </div>
                  </label>
                </div>

              </div>

              <div style={{marginBottom:20}}>
                <label style={lbl}>نوع الجدولة</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {[{key:'daily',label:'يومي',icon:'📅'},{key:'weekly',label:'أسبوعي',icon:'📆'},{key:'manual',label:'يدوي',icon:'👆'}].map(s=>(
                    <button key={s.key} type="button" className={`sched-btn${form.notify_schedule===s.key?' active':''}`}
                      onClick={()=>setForm({...form,notify_schedule:s.key})}>
                      <span style={{fontSize:22}}>{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {form.notify_schedule==='weekly'&&(
                <div style={{marginBottom:18}}>
                  <label style={lbl}>أيام الإرسال</label>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
                    {DAYS.map(d=>(
                      <button key={d.key} type="button" className={`day-btn${form.notify_days.includes(d.key)?' active':''}`}
                        onClick={()=>toggleDay(d.key)}>{d.label}</button>
                    ))}
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

              <div style={{
                background:form.notify_schedule==='manual'?colors.warningLight:colors.primaryLight,
                border:`1.5px solid ${form.notify_schedule==='manual'?colors.warningBorder:colors.primaryBorder}`,
                borderRadius:radius.md,padding:'12px 14px',marginBottom:20,
                fontSize:font.sm,color:form.notify_schedule==='manual'?colors.warning:colors.primary,
                fontWeight:600,display:'flex',alignItems:'center',gap:8
              }}>
                <span style={{fontSize:18}}>{form.notify_schedule==='manual'?'👆':'🔔'}</span>
                {form.notify_schedule==='manual'?'الإرسال يدوياً فقط عند الضغط على الزر':scheduleLabel()}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
                <button type="submit" disabled={saving} style={{...btnPrimary,padding:'13px',opacity:saving?0.7:1,cursor:saving?'not-allowed':'pointer'}}>
                  {saving?'⏳ حفظ...':'💾 حفظ الجدولة'}
                </button>
                <button type="button" onClick={sendNow} disabled={sending}
                  style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'13px',background:sending?colors.text4:'#25d366',color:'white',border:'none',borderRadius:radius.md,fontSize:font.sm,fontWeight:700,cursor:sending?'not-allowed':'pointer',fontFamily:font.family,transition:'all .15s',boxShadow:sending?'none':'0 4px 14px rgba(37,211,102,.3)'}}>
                  {sending?'⏳ إرسال...':'📲 إرسال الآن'}
                </button>
              </div>

              {sendMsg&&(
                <div style={{background:sendMsg.ok?colors.primaryLight:colors.dangerLight,border:`1.5px solid ${sendMsg.ok?colors.primaryBorder:colors.dangerBorder}`,borderRadius:radius.md,padding:'10px 14px',fontSize:font.sm,fontWeight:600,color:sendMsg.ok?colors.primary:colors.danger,display:'flex',alignItems:'center',gap:8}}>
                  {sendMsg.ok?'✅':'❌'} {sendMsg.text}
                </div>
              )}
              {lastSent&&(
                <div style={{fontSize:font.xs,color:colors.text4,marginTop:10,display:'flex',alignItems:'center',gap:4}}>
                  <span>📅</span> آخر إرسال: <span style={{fontWeight:600,color:colors.text2}}>{new Date(lastSent).toLocaleDateString('ar-SA',{weekday:'long',hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              )}
            </form>
          )}

          {/* BRANCHES TAB */}
          {activeTab==='branches'&&(
            <div>
              <p style={{fontSize:font.sm,color:colors.text3,marginBottom:16,lineHeight:1.8}}>كل فرع له مخزونه المستقل. الباقة الحالية تسمح بـ <b style={{color:colors.primary}}>{maxBranches} فرع</b>.</p>

              {branches.length>0&&(
                <div style={{...card,overflow:'hidden',marginBottom:16}}>
                  {branches.map((b:any,i:number)=>(
                    <div key={b.id} style={{padding:'14px 16px',borderBottom:i<branches.length-1?`1px solid ${colors.border}`:'none'}}>
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{width:36,height:36,borderRadius:10,background:i===0?colors.primaryLight:colors.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,border:`1px solid ${i===0?colors.primaryBorder:colors.border}`}}>
                          {i===0?'🏠':'🏪'}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>{b.name}</div>
                          {b.location&&<div style={{fontSize:font.xs,color:colors.text4,marginTop:1}}>📍 {b.location}</div>}
                        </div>
                        {i===0
                          ? <span style={{fontSize:font.xs,color:colors.primary,padding:'4px 10px',background:colors.primaryLight,borderRadius:20,border:`1px solid ${colors.primaryBorder}`,fontWeight:700}}>رئيسي</span>
                          : <button onClick={()=>deleteBranch(b.id)} style={{background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:radius.sm,padding:'6px 12px',fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>حذف</button>}
                      </div>
                      <div style={{marginTop:10,marginRight:48}}>
                        {editingPhoneId===b.id ? (
                          <div style={{display:'flex',gap:6,alignItems:'center'}}>
                            <input value={editPhoneValue} onChange={e=>setEditPhoneValue(e.target.value)} placeholder="5xxxxxxxx" dir="ltr"
                              style={{...inp(),padding:'6px 10px',fontSize:font.xs,flex:1}}/>
                            <button onClick={()=>saveBranchPhone(b.id)} disabled={savingPhone}
                              style={{background:colors.primary,color:'white',border:'none',borderRadius:6,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                              {savingPhone?'...':'حفظ'}
                            </button>
                            <button onClick={()=>setEditingPhoneId(null)}
                              style={{background:colors.bg,color:colors.text3,border:'none',borderRadius:6,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button onClick={()=>{setEditingPhoneId(b.id);setEditPhoneValue(b.whatsapp_number||'')}}
                            style={{background:'none',border:'none',color:colors.text4,fontSize:11,cursor:'pointer',fontFamily:font.family,padding:0,display:'flex',alignItems:'center',gap:4}}>
                            📱 {b.whatsapp_number ? `رقم مخصص: ${b.whatsapp_number}` : 'استخدام رقم مخصص لهذا الفرع (اختياري)'}
                            <span style={{textDecoration:'underline'}}>تعديل</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {inactiveBranches.length>0&&(
                <div style={{...card,overflow:'hidden',marginBottom:16,opacity:.8}}>
                  <div style={{padding:'10px 16px',borderBottom:`1px solid ${colors.border}`,fontSize:font.xs,fontWeight:700,color:colors.text4}}>فروع موقوفة ({inactiveBranches.length})</div>
                  {inactiveBranches.map((b:any,i:number)=>(
                    <div key={b.id} style={{padding:'14px 16px',borderBottom:i<inactiveBranches.length-1?`1px solid ${colors.border}`:'none',display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:36,height:36,borderRadius:10,background:colors.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,border:`1px solid ${colors.border}`}}>⏸</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:font.sm,fontWeight:700,color:colors.text3}}>{b.name}</div>
                        {b.location&&<div style={{fontSize:font.xs,color:colors.text4,marginTop:1}}>📍 {b.location}</div>}
                      </div>
                      <button onClick={()=>reactivateBranch(b.id)} disabled={reactivatingId===b.id || branches.length>=maxBranches}
                        style={{background:colors.primaryLight,color:colors.primary,border:`1px solid ${colors.primaryBorder}`,borderRadius:radius.sm,padding:'6px 12px',fontSize:font.xs,fontWeight:700,cursor:(reactivatingId===b.id||branches.length>=maxBranches)?'not-allowed':'pointer',fontFamily:font.family,opacity:branches.length>=maxBranches?.5:1}}>
                        {reactivatingId===b.id?'...':branches.length>=maxBranches?'الباقة ممتلئة':'تفعيل'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {branches.length < maxBranches ? (
                <div style={{...card,padding:'18px',background:colors.bg}}>
                  <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,marginBottom:14}}>➕ إضافة فرع جديد</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                    <div><label style={lbl}>اسم الفرع *</label><input value={newBranch.name} onChange={e=>setNewBranch({...newBranch,name:e.target.value})} style={inp()} placeholder="مثال: فرع الرياض"/></div>
                    <div><label style={lbl}>الموقع (اختياري)</label><input value={newBranch.location} onChange={e=>setNewBranch({...newBranch,location:e.target.value})} style={inp()} placeholder="مثال: حي النزهة"/></div>
                  </div>
                  <button type="button" onClick={addBranch} disabled={branchSaving||!newBranch.name.trim()} style={{...btnPrimary,width:'100%',padding:'12px',opacity:(branchSaving||!newBranch.name.trim())?0.6:1,cursor:(branchSaving||!newBranch.name.trim())?'not-allowed':'pointer'}}>
                    {branchSaving?'⏳ جاري الإضافة...':'+ إضافة فرع'}
                  </button>
                </div>
              ) : (
                <div style={{...card,padding:'20px',background:colors.warningLight,border:`1.5px solid ${colors.warningBorder}`,textAlign:'center'}}>
                  <div style={{fontSize:24,marginBottom:10}}>🔒</div>
                  <div style={{fontSize:font.sm,color:'#92400e',fontWeight:700,marginBottom:4}}>وصلت للحد الأقصى من الفروع</div>
                  <div style={{fontSize:font.xs,color:'#b45309'}}>للترقية وإضافة فروع أكثر، تواصل معنا عبر واتساب</div>
                </div>
              )}
            </div>
          )}

          {/* BACKUP TAB */}
          {activeTab==='backup'&&(
            <div>
              {lastBackup&&(
                <div style={{...card,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10,background:colors.primaryLight,border:`1px solid ${colors.primaryBorder}`}}>
                  <span style={{fontSize:18}}>💾</span>
                  <div>
                    <div style={{fontSize:font.xs,color:colors.primary,fontWeight:700}}>آخر نسخة احتياطية</div>
                    <div style={{fontSize:font.xs,color:colors.primary,opacity:.8,marginTop:1}}>{new Date(lastBackup).toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
                  </div>
                </div>
              )}
              {backupMsg&&(
                <div style={{background:backupMsg.ok?colors.primaryLight:colors.dangerLight,border:`1.5px solid ${backupMsg.ok?colors.primaryBorder:colors.dangerBorder}`,borderRadius:radius.md,padding:'10px 14px',marginBottom:14,fontSize:font.sm,fontWeight:600,color:backupMsg.ok?colors.primary:colors.danger,display:'flex',alignItems:'center',gap:8}}>
                  {backupMsg.ok?'✅':'❌'} {backupMsg.text}
                </div>
              )}
              <p style={{fontSize:font.sm,color:colors.text3,marginBottom:18,lineHeight:1.8}}>يتم إنشاء نسخة احتياطية تلقائياً كل أسبوع. يمكنك إنشاء نسخة يدوياً وتحميلها في أي وقت.</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                <button type="button" onClick={runBackup} disabled={backupLoading}
                  style={{...btnPrimary,padding:'13px',opacity:backupLoading?0.7:1,cursor:backupLoading?'not-allowed':'pointer'}}>
                  {backupLoading?'⏳ جاري الإنشاء...':'💾 نسخة احتياطية الآن'}
                </button>
                <button type="button" onClick={loadBackups} style={{...btnSecondary,padding:'13px',fontSize:font.sm}}>
                  📋 عرض النسخ السابقة
                </button>
              </div>
              {backups.length>0&&(
                <div style={{...card,overflow:'hidden'}}>
                  <div style={{padding:'10px 16px',borderBottom:`1px solid ${colors.border}`,fontSize:font.xs,fontWeight:700,color:colors.text4}}>النسخ الاحتياطية ({backups.length})</div>
                  {backups.map((b,i)=>(
                    <div key={i} style={{padding:'12px 16px',borderBottom:i<backups.length-1?`1px solid ${colors.border}`:'none',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
                      <div>
                        <div style={{fontSize:font.sm,fontWeight:600,color:colors.text}}>{b.name?.replace('_backup.json','')}</div>
                        <div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>{Math.round((b.size||0)/1024)} KB</div>
                      </div>
                      {b.url&&(<a href={b.url} download style={{...btnPrimary,padding:'7px 14px',fontSize:font.xs,textDecoration:'none'}}>⬇ تحميل</a>)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab==='security'&&(
            <div>
              <div style={{...card,padding:'16px',marginBottom:20,background:colors.infoLight,border:`1.5px solid ${colors.infoBorder}`,display:'flex',alignItems:'flex-start',gap:12}}>
                <span style={{fontSize:20,flexShrink:0}}>ℹ️</span>
                <div style={{fontSize:font.sm,color:colors.info,lineHeight:1.7}}>تغيير كلمة المرور يتطلب إدخال كلمة المرور الحالية أولاً للتحقق من هويتك. تأكد من اختيار كلمة مرور قوية لا تقل عن 6 أحرف.</div>
              </div>

              {pwMsg&&(
                <div style={{background:pwMsg.ok?colors.primaryLight:colors.dangerLight,border:`1.5px solid ${pwMsg.ok?colors.primaryBorder:colors.dangerBorder}`,borderRadius:radius.md,padding:'12px 16px',marginBottom:16,fontSize:font.sm,fontWeight:700,color:pwMsg.ok?colors.primary:colors.danger,display:'flex',alignItems:'center',gap:8}}>
                  {pwMsg.ok?'✅':'❌'} {pwMsg.text}
                </div>
              )}

              <form onSubmit={changePassword}>
                <div style={{display:'grid',gap:14,marginBottom:20}}>
                  {[
                    {label:'كلمة المرور الحالية', key:'current', placeholder:'••••••••'},
                    {label:'كلمة المرور الجديدة', key:'newPw',   placeholder:'6 أحرف على الأقل'},
                    {label:'تأكيد كلمة المرور',  key:'confirm', placeholder:'أعد الإدخال'},
                  ].map(f=>(
                    <div key={f.key}>
                      <label style={lbl}>{f.label}</label>
                      <input type="password" value={(pwForm as any)[f.key]} onChange={e=>setPwForm({...pwForm,[f.key]:e.target.value})} style={{...inp(),width:'100%'}} placeholder={f.placeholder} required/>
                    </div>
                  ))}
                </div>
                <button type="submit" disabled={pwSaving} style={{...btnPrimary,width:'100%',padding:'14px',opacity:pwSaving?0.7:1,cursor:pwSaving?'not-allowed':'pointer',fontSize:font.base}}>
                  {pwSaving?'⏳ جاري التحقق والحفظ...':'🔐 تغيير كلمة المرور'}
                </button>
              </form>

              {/* Delete account */}
              <div style={{marginTop:28,paddingTop:24,borderTop:`1px solid ${colors.dangerBorder}`}}>
                <div style={{background:colors.dangerLight,border:`1.5px solid ${colors.dangerBorder}`,borderRadius:radius.md,padding:'16px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <span style={{fontSize:20}}>🗑️</span>
                    <div>
                      <div style={{fontSize:font.sm,fontWeight:800,color:colors.danger}}>حذف الحساب نهائياً</div>
                      <div style={{fontSize:font.xs,color:colors.danger,opacity:.8}}>لا يمكن التراجع عن هذا الإجراء</div>
                    </div>
                  </div>
                  <p style={{fontSize:font.xs,color:colors.danger,opacity:.85,marginBottom:14,lineHeight:1.7}}>سيتم حذف جميع بياناتك — المخزون، المشتريات، الموظفين، والتقارير — بشكل نهائي.</p>
                  <button onClick={()=>setShowDelete(true)}
                    style={{width:'100%',padding:'11px',background:colors.danger,color:'white',border:'none',borderRadius:radius.md,fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                    حذف حسابي نهائياً
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

    {showDelete&&(
      <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(6px)'}} onClick={()=>{setShowDelete(false);setDeleteConfirm('');setDeleteMsg(null)}}/>
        <div style={{background:colors.surface,borderRadius:radius.xl,padding:28,width:'100%',maxWidth:420,position:'relative',boxShadow:'0 20px 60px rgba(0,0,0,.3)',fontFamily:font.family,direction:'rtl'}}>
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{fontSize:44,marginBottom:10}}>⚠️</div>
            <div style={{fontSize:font.lg,fontWeight:900,color:colors.text,marginBottom:8}}>تأكيد حذف الحساب</div>
            <p style={{fontSize:font.sm,color:colors.text3,lineHeight:1.7}}>هذا الإجراء <b style={{color:colors.danger}}>لا يمكن التراجع عنه</b>. سيتم حذف جميع بياناتك نهائياً.</p>
          </div>
          {deleteMsg&&<div style={{background:colors.dangerLight,border:`1px solid ${colors.dangerBorder}`,borderRadius:radius.md,padding:'10px 14px',marginBottom:14,fontSize:font.sm,color:colors.danger,fontWeight:600}}>{deleteMsg.text}</div>}
          <div style={{marginBottom:18}}>
            <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:6}}>اكتب اسم المنشأة للتأكيد: <b style={{color:colors.danger}}>{form.name}</b></label>
            <input value={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.value)} style={{...inp(),borderColor:colors.dangerBorder}} placeholder={form.name}/>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{setShowDelete(false);setDeleteConfirm('');setDeleteMsg(null)}} style={{...btnSecondary,flex:1,padding:'12px',fontSize:font.sm}}>إلغاء</button>
            <button onClick={deleteAccount} disabled={deleting||deleteConfirm!==form.name}
              style={{flex:2,padding:'12px',background:deleteConfirm===form.name?colors.danger:'#94a3b8',color:'white',border:'none',borderRadius:radius.md,fontSize:font.sm,fontWeight:700,cursor:deleteConfirm===form.name?'pointer':'not-allowed',fontFamily:font.family}}>
              {deleting?'⏳ جاري الحذف...':'🗑️ حذف نهائياً'}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}
