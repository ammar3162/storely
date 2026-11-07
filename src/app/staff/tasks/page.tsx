'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Globe, LoaderCircle } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyEmptyState, StorelyPageHeader } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

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
  pending:   { key: 'statusPending',   color: storelyTokens.color.warning, bg: storelyTokens.color.warningBg },
  completed: { key: 'statusCompleted', color: storelyTokens.color.info, bg: storelyTokens.color.infoBg },
  confirmed: { key: 'statusConfirmed', color: storelyTokens.color.success, bg: storelyTokens.color.successBg },
  rejected:  { key: 'statusRejected',  color: storelyTokens.color.danger, bg: storelyTokens.color.dangerBg },
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--storely-background)] text-[var(--storely-navy)]">
      <LoaderCircle size={28} className="animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--storely-background)] text-[var(--storely-navy)]" dir={isRtl?'rtl':'ltr'}>
      <div className="!mx-auto max-w-4xl !space-y-6 !px-4 !py-6 sm:!p-8">
        <StorelyPageHeader title={t('myTasks')} description={session.name}
          actions={<StorelyButton onClick={()=>router.back()}>{t('back')}</StorelyButton>} />
        <div className="relative w-fit max-w-full">
          <StorelyButton onClick={()=>setShowLangMenu(v=>!v)} disabled={translating} icon={<Globe size={16} />}>
            {LANGUAGES.find(l=>l.code===lang)?.label || 'العربية'} {showLangMenu?'▴':'▾'}
          </StorelyButton>
          {showLangMenu && (
            <div className="absolute start-0 top-full z-50 !mt-2 min-w-40 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--storely-border)] bg-white !p-1 shadow-[var(--storely-panel-shadow)]">
              {LANGUAGES.map(l=>(
                <button key={l.code}
                  onClick={()=>{setLang(l.code);localStorage.setItem('staff_lang',l.code);if(l.code!=='ar')fetchTranslation(l.code);setShowLangMenu(false)}}
                  className={`block w-full cursor-pointer rounded-[var(--radius-sm)] !px-4 !py-3 text-start text-sm hover:bg-[var(--storely-background)] focus-visible:outline-[var(--storely-navy)] ${lang===l.code?'bg-[var(--storely-background)] font-semibold':'bg-white'}`}>
                  {lang===l.code?'✓ ':''}{l.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {loading ? (
          <div className="storely-loading">{t('loading')}</div>
        ) : (
          <>
            {pendingTasks.length===0 ? (
              <StorelyEmptyState title={t('noTasks')} />
            ) : (
              <section className="!space-y-4">
                <h2 className="text-lg font-semibold">{t('pendingTasks')} ({pendingTasks.length})</h2>
                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  {pendingTasks.map((tk:any)=>(
                    <StorelyCard key={tk.id} className="flex flex-col !p-5 sm:!p-6">
                      <div className="!mb-3 break-words text-base font-semibold leading-7">{lang!=='ar'&&taskTranslations[tk.id]?.title || tk.title}</div>
                      {(lang!=='ar'&&taskTranslations[tk.id]?.description || tk.description) && <div className="!mb-5 break-words text-sm leading-7 text-[var(--storely-muted)]">{lang!=='ar'&&taskTranslations[tk.id]?.description || tk.description}</div>}
                      <input id={`photo-input-${tk.id}`} type="file" accept="image/*" capture="environment" style={{display:'none'}}
                        onChange={e=>{ const f=e.target.files?.[0]; if(f) handlePhotoSelected(tk.id, f) }}/>
                      <StorelyButton onClick={()=>completeTask(tk.id, tk.requires_photo)} disabled={completingId===tk.id||uploadingId===tk.id}
                        variant="primary" className="!mt-auto w-full" icon={tk.requires_photo?<Camera size={16} />:undefined}>
                        {uploadingId===tk.id ? t('uploadingPhoto') : completingId===tk.id ? t('confirming') : tk.requires_photo ? t('completeWithPhoto') : `✓ ${t('completeTask')}`}
                      </StorelyButton>
                    </StorelyCard>
                  ))}
                </div>
              </section>
            )}
            {otherTasks.length>0 && (
              <section className="!space-y-4">
                <h2 className="text-lg font-semibold">{t('pastTasks')}</h2>
                <div className="flex min-w-0 flex-col gap-4">
                  {otherTasks.map((tk:any)=>{
                    const st = STATUS_KEYS[tk.status] || STATUS_KEYS.pending
                    return (
                      <StorelyCard key={tk.id} className="!p-5 sm:!p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <span className="min-w-0 flex-1 basis-48 break-words text-sm font-semibold leading-7">{lang!=='ar'&&taskTranslations[tk.id]?.title || tk.title}</span>
                          <span className="storely-badge" style={{color:st.color,background:st.bg}}>{t(st.key)}</span>
                        </div>
                      </StorelyCard>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
