'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string
}

const LANGUAGES = [
  {code:'ar',label:'العربية'},{code:'en',label:'English'},{code:'ur',label:'اردو'},
  {code:'hi',label:'हिन्दी'},{code:'tl',label:'Tagalog'},{code:'bn',label:'বাংলা'},{code:'fr',label:'Français'},
]

const UI_STRINGS: Record<string, Record<string,string>> = {
  myTasks:        { ar:'مهامي', en:'My Tasks', ur:'میرے کام', hi:'मेरे कार्य', tl:'Aking mga Gawain', bn:'আমার কাজ', fr:'Mes tâches' },
  back:           { ar:'رجوع', en:'Back', ur:'واپس', hi:'वापस', tl:'Bumalik', bn:'ফিরে যান', fr:'Retour' },
  loading:        { ar:'جاري التحميل...', en:'Loading...', ur:'لوڈ ہو رہا ہے...', hi:'लोड हो रहा है...', tl:'Naglo-load...', bn:'লোড হচ্ছে...', fr:'Chargement...' },
  noTasks:        { ar:'ما فيه مهام لك حالياً', en:'No tasks for you right now', ur:'فی الحال آپ کے لیے کوئی کام نہیں', hi:'फिलहाल आपके लिए कोई कार्य नहीं', tl:'Walang gawain sa ngayon', bn:'এই মুহূর্তে আপনার জন্য কোন কাজ নেই', fr:"Aucune tâche pour l'instant" },
  pendingTasks:   { ar:'مهام بانتظارك', en:'Tasks waiting for you', ur:'آپ کے منتظر کام', hi:'आपका इंतज़ार कर रहे कार्य', tl:'Mga gawaing naghihintay sa iyo', bn:'আপনার জন্য অপেক্ষমান কাজ', fr:'Tâches en attente' },
  pastTasks:      { ar:'مهام سابقة', en:'Past tasks', ur:'گزشتہ کام', hi:'पिछले कार्य', tl:'Nakaraang mga gawain', bn:'পূর্ববর্তী কাজ', fr:'Tâches précédentes' },
  completeWithPhoto: { ar:'التقط صورة وأكمل المهمة', en:'Take a photo and complete task', ur:'تصویر لیں اور کام مکمل کریں', hi:'फोटो लें और कार्य पूरा करें', tl:'Kumuha ng larawan at kumpletuhin', bn:'ছবি তুলুন এবং কাজ সম্পন্ন করুন', fr:'Prenez une photo et terminez' },
  completeTask:   { ar:'تم إنجاز المهمة', en:'Mark task as done', ur:'کام مکمل ہو گیا', hi:'कार्य पूरा हुआ', tl:'Tapos na ang gawain', bn:'কাজ সম্পন্ন হয়েছে', fr:'Tâche terminée' },
  uploadingPhoto: { ar:'جاري رفع الصورة...', en:'Uploading photo...', ur:'تصویر اپ لوڈ ہو رہی ہے...', hi:'फोटो अपलोड हो रहा है...', tl:'Ina-upload ang larawan...', bn:'ছবি আপলোড হচ্ছে...', fr:'Téléchargement de la photo...' },
  confirming:     { ar:'جاري التأكيد...', en:'Confirming...', ur:'تصدیق ہو رہی ہے...', hi:'पुष्टि हो रही है...', tl:'Kinukumpirma...', bn:'নিশ্চিত করা হচ্ছে...', fr:'Confirmation...' },
  statusPending:   { ar:'بانتظارك', en:'Waiting for you', ur:'آپ کا منتظر', hi:'आपका इंतज़ार', tl:'Naghihintay sa iyo', bn:'আপনার অপেক্ষায়', fr:'En attente' },
  statusCompleted: { ar:'بانتظار تأكيد المدير', en:"Waiting for manager's confirmation", ur:'مینیجر کی تصدیق کا منتظر', hi:'प्रबंधक की पुष्टि का इंतज़ार', tl:'Naghihintay ng kumpirmasyon ng manager', bn:'ম্যানেজারের নিশ্চিতকরণের অপেক্ষায়', fr:'En attente de confirmation' },
  statusConfirmed: { ar:'مؤكدة ✓', en:'Confirmed ✓', ur:'تصدیق شدہ ✓', hi:'पुष्टि की गई ✓', tl:'Nakumpirma na ✓', bn:'নিশ্চিত হয়েছে ✓', fr:'Confirmé ✓' },
  statusRejected:  { ar:'مرفوضة', en:'Rejected', ur:'مسترد', hi:'अस्वीकृत', tl:'Tinanggihan', bn:'প্রত্যাখ্যাত', fr:'Rejeté' },
}

const STATUS_KEYS: Record<string, {key:string; color:string; bg:string}> = {
  pending:   { key: 'statusPending',   color: '#d97706', bg: '#fffbeb' },
  completed: { key: 'statusCompleted', color: '#2563eb', bg: '#eff6ff' },
  confirmed: { key: 'statusConfirmed', color: '#16a34a', bg: '#f0fdf4' },
  rejected:  { key: 'statusRejected',  color: '#dc2626', bg: '#fef2f2' },
}

export default function StaffTasksPage() {
  const router = useRouter()
  const [session, setSession] = useState<StaffSession|null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState<string|null>(null)
  const [uploadingId, setUploadingId] = useState<string|null>(null)
  const [lang, setLang] = useState('ar')
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [taskTranslations, setTaskTranslations] = useState<Record<string,{title:string,description:string|null}>>({})

  useEffect(()=>{
    const saved = localStorage.getItem('staff_session')
    if(!saved){ router.push('/staff'); return }
    const s = JSON.parse(saved) as StaffSession
    setSession(s)
    const savedLang = localStorage.getItem('staff_lang')
    if (savedLang) setLang(savedLang)
    loadTasks().then(()=>{ if (savedLang && savedLang!=='ar') fetchTranslation(savedLang) })
  },[])

  async function fetchTranslation(targetLang: string) {
    setTranslating(true)
    try {
      const token = localStorage.getItem('staff_token')
      const res = await fetch('/api/translate-tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ targetLang }),
      })
      const j = await res.json()
      setTaskTranslations(j.translations || {})
    } catch {}
    setTranslating(false)
  }

  async function loadTasks() {
    setLoading(true)
    try {
      const token = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-tasks', { headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      setTasks(j.success ? (j.tasks||[]) : [])
    } catch { setTasks([]) }
    setLoading(false)
  }

  async function completeTask(taskId: string, requiresPhoto: boolean) {
    if (requiresPhoto) {
      document.getElementById(`photo-input-${taskId}`)?.click()
      return
    }
    setCompletingId(taskId)
    const token = localStorage.getItem('staff_token')
    const res = await fetch('/api/staff-tasks', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ task_id: taskId }),
    })
    const j = await res.json()
    setCompletingId(null)
    if (!j.success) { alert(j.error || 'حدث خطأ'); return }
    loadTasks()
  }

  async function handlePhotoSelected(taskId: string, file: File) {
    setUploadingId(taskId)
    try {
      const token = localStorage.getItem('staff_token')
      const fd = new FormData()
      fd.append('file', file)
      const upRes = await fetch('/api/staff-upload-task-photo', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd })
      const upJ = await upRes.json()
      if (!upJ.success) { alert(upJ.error || 'فشل رفع الصورة'); setUploadingId(null); return }

      const res = await fetch('/api/staff-tasks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ task_id: taskId, photo_url: upJ.url }),
      })
      const j = await res.json()
      setUploadingId(null)
      if (!j.success) { alert(j.error || 'حدث خطأ'); return }
      loadTasks()
    } catch {
      setUploadingId(null)
      alert('حدث خطأ')
    }
  }

  function t(key: string) { return UI_STRINGS[key]?.[lang] || UI_STRINGS[key]?.ar || key }
  const isRtl = lang==='ar' || lang==='ur'

  const pendingTasks = tasks.filter((t:any)=>t.status==='pending')
  const otherTasks = tasks.filter((t:any)=>t.status!=='pending' && t.status!=='confirmed')

  if (!session) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f4',fontFamily:"'IBM Plex Sans Arabic',system-ui"}}>
      <div style={{width:32,height:32,border:'3px solid #e5e5e2',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f7f7f5',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',paddingBottom:40}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{background:'white',borderBottom:'1px solid #ece8e2',padding:'16px 20px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:'#1c1c1a'}}>{t('myTasks')}</div>
            <div style={{fontSize:12,color:'#888780',marginTop:2}}>{session.name}</div>
          </div>
          <button onClick={()=>router.back()} style={{background:'#f5f5f4',border:'none',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,color:'#5f5e5a',cursor:'pointer',fontFamily:'inherit'}}>{t('back')}</button>
        </div>
        <div style={{position:'relative' as const}}>
          <button onClick={()=>setShowLangMenu(v=>!v)} disabled={translating}
            style={{background:'#f5f5f4',color:'#1c1c1a',border:'none',borderRadius:20,padding:'6px 14px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,opacity:translating?0.6:1}}>
            🌐 {LANGUAGES.find(l=>l.code===lang)?.label || 'العربية'} {showLangMenu?'▴':'▾'}
          </button>
          {showLangMenu && (
            <div style={{position:'absolute' as const,top:'100%',right:0,marginTop:6,background:'white',border:'1px solid #ece8e2',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.15)',overflow:'hidden',minWidth:140,zIndex:50}}>
              {LANGUAGES.map(l=>(
                <button key={l.code}
                  onClick={()=>{setLang(l.code);localStorage.setItem('staff_lang',l.code);if(l.code!=='ar')fetchTranslation(l.code);setShowLangMenu(false)}}
                  style={{width:'100%',padding:'10px 14px',border:'none',background:lang===l.code?'#f0fdf4':'white',color:lang===l.code?'#16a34a':'#1c1c1a',fontSize:13,fontWeight:lang===l.code?700:500,cursor:'pointer',fontFamily:'inherit',textAlign:'right' as const,display:'block'}}>
                  {lang===l.code?'✓ ':''}{l.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{maxWidth:520,margin:'0 auto',padding:'20px 16px'}}>
        {loading ? (
          <div style={{textAlign:'center' as const,padding:40,fontSize:13,color:'#888780'}}>{t('loading')}</div>
        ) : tasks.length===0 ? (
          <div style={{textAlign:'center' as const,padding:'60px 20px'}}>
            <div style={{fontSize:44,marginBottom:12,opacity:0.5}}>📋</div>
            <div style={{fontSize:14,color:'#888780'}}>{t('noTasks')}</div>
          </div>
        ) : (
          <>
            {pendingTasks.length>0 && (
              <div style={{marginBottom:24}}>
                <div style={{fontSize:12,fontWeight:700,color:'#d97706',marginBottom:10}}>{t('pendingTasks')} ({pendingTasks.length})</div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
                  {pendingTasks.map((tk:any)=>(
                    <div key={tk.id} style={{background:'white',border:'1.5px solid #fde68a',borderRadius:14,padding:'16px'}}>
                      <div style={{fontSize:15,fontWeight:800,color:'#1c1c1a',marginBottom:6}}>{lang!=='ar'&&taskTranslations[tk.id]?.title || tk.title}</div>
                      {(lang!=='ar'&&taskTranslations[tk.id]?.description || tk.description) && <div style={{fontSize:13,color:'#6b7280',marginBottom:12,lineHeight:1.6}}>{lang!=='ar'&&taskTranslations[tk.id]?.description || tk.description}</div>}
                      <input id={`photo-input-${tk.id}`} type="file" accept="image/*" capture="environment" style={{display:'none'}}
                        onChange={e=>{ const f=e.target.files?.[0]; if(f) handlePhotoSelected(tk.id, f) }}/>
                      <button onClick={()=>completeTask(tk.id, tk.requires_photo)} disabled={completingId===tk.id||uploadingId===tk.id}
                        style={{width:'100%',padding:'12px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:(completingId===tk.id||uploadingId===tk.id)?0.6:1}}>
                        {uploadingId===tk.id ? t('uploadingPhoto') : completingId===tk.id ? t('confirming') : tk.requires_photo ? `📷 ${t('completeWithPhoto')}` : `✓ ${t('completeTask')}`}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {otherTasks.length>0 && (
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#888780',marginBottom:10}}>{t('pastTasks')}</div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                  {otherTasks.map((tk:any)=>{
                    const st = STATUS_KEYS[tk.status] || STATUS_KEYS.pending
                    return (
                      <div key={tk.id} style={{background:st.bg,border:'1px solid #ece8e2',borderRadius:12,padding:'12px 14px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                          <span style={{fontSize:13,fontWeight:700,color:'#1c1c1a'}}>{lang!=='ar'&&taskTranslations[tk.id]?.title || tk.title}</span>
                          <span style={{fontSize:10,fontWeight:700,color:st.color}}>{t(st.key)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
