'use client'
import { useLiveRefresh, liveStaffOrg } from '@/lib/useLiveRefresh'
import StaffHeader, { staffHeaderBtn } from '@/components/StaffHeader'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStaffLang, type Dict } from '@/lib/staffLang'
import StaffLangButton from '@/components/StaffLangButton'

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string
}

const STATUS_STYLE: Record<string, {key:string; color:string; bg:string}> = {
  pending:  { key: 'pending',  color: '#d97706', bg: '#fffbeb' },
  approved: { key: 'approved', color: '#029FA2', bg: '#f0fdfa' },
  rejected: { key: 'rejected', color: '#dc2626', bg: '#fef2f2' },
}

const L: Dict = {
  title:      { ar: 'طلب إجازة', en: 'Leave request', ur: 'چھٹی کی درخواست', hi: 'छुट्टी का अनुरोध', tl: 'Request ng leave', bn: 'ছুটির অনুরোধ', fr: 'Demande de congé' },
  balance:    { ar: 'رصيدك المتبقي', en: 'Your remaining balance', ur: 'آپ کا باقی بیلنس', hi: 'आपका शेष बैलेंस', tl: 'Natitirang balanse', bn: 'আপনার অবশিষ্ট ব্যালেন্স', fr: 'Solde restant' },
  days:       { ar: 'يوم', en: 'days', ur: 'دن', hi: 'दिन', tl: 'araw', bn: 'দিন', fr: 'jours' },
  newRequest: { ar: 'طلب إجازة جديد', en: 'New leave request', ur: 'نئی چھٹی کی درخواست', hi: 'नया छुट्टी अनुरोध', tl: 'Bagong request ng leave', bn: 'নতুন ছুটির অনুরোধ', fr: 'Nouvelle demande de congé' },
  from:       { ar: 'من تاريخ', en: 'From', ur: 'سے', hi: 'से', tl: 'Mula', bn: 'থেকে', fr: 'Du' },
  to:         { ar: 'إلى تاريخ', en: 'To', ur: 'تک', hi: 'तक', tl: 'Hanggang', bn: 'পর্যন্ত', fr: 'Au' },
  reason:     { ar: 'السبب (اختياري)', en: 'Reason (optional)', ur: 'وجہ (اختیاری)', hi: 'कारण (वैकल्पिक)', tl: 'Dahilan (opsyonal)', bn: 'কারণ (ঐচ্ছিক)', fr: 'Motif (facultatif)' },
  pickDates:  { ar: 'اختر تاريخ البداية والنهاية', en: 'Choose the start and end dates', ur: 'شروع اور آخری تاریخ منتخب کریں', hi: 'शुरू और आखिरी तारीख चुनें', tl: 'Piliin ang simula at katapusan', bn: 'শুরু ও শেষের তারিখ বাছুন', fr: 'Choisissez les dates de début et de fin' },
  error:      { ar: 'حدث خطأ', en: 'Something went wrong', ur: 'خرابی ہوئی', hi: 'कुछ गलत हुआ', tl: 'May error', bn: 'একটি সমস্যা হয়েছে', fr: 'Une erreur est survenue' },
  send:       { ar: 'إرسال الطلب', en: 'Send request', ur: 'درخواست بھیجیں', hi: 'अनुरोध भेजें', tl: 'Ipadala', bn: 'অনুরোধ পাঠান', fr: 'Envoyer' },
  sending:    { ar: 'جاري الإرسال...', en: 'Sending...', ur: 'بھیجا جا رہا ہے...', hi: 'भेजा जा रहा है...', tl: 'Ipinapadala...', bn: 'পাঠানো হচ্ছে...', fr: 'Envoi...' },
  mine:       { ar: 'طلباتي', en: 'My requests', ur: 'میری درخواستیں', hi: 'मेरे अनुरोध', tl: 'Aking mga request', bn: 'আমার অনুরোধ', fr: 'Mes demandes' },
  loading:    { ar: 'جاري التحميل...', en: 'Loading...', ur: 'لوڈ ہو رہا ہے...', hi: 'लोड हो रहा है...', tl: 'Naglo-load...', bn: 'লোড হচ্ছে...', fr: 'Chargement...' },
  none:       { ar: 'ما فيه طلبات إجازة بعد', en: 'No leave requests yet', ur: 'ابھی کوئی چھٹی کی درخواست نہیں', hi: 'अभी कोई छुट्टी अनुरोध नहीं', tl: 'Wala pang request ng leave', bn: 'এখনো কোনো ছুটির অনুরোধ নেই', fr: 'Aucune demande de congé' },
  pending:    { ar: 'بانتظار الموافقة', en: 'Awaiting approval', ur: 'منظوری کا انتظار', hi: 'मंज़ूरी का इंतज़ार', tl: 'Naghihintay ng apruba', bn: 'অনুমোদনের অপেক্ষায়', fr: "En attente d'accord" },
  approved:   { ar: 'موافَق عليها ✓', en: 'Approved ✓', ur: 'منظور ✓', hi: 'स्वीकृत ✓', tl: 'Aprubado ✓', bn: 'অনুমোদিত ✓', fr: 'Accepté ✓' },
  rejected:   { ar: 'مرفوضة', en: 'Rejected', ur: 'مسترد', hi: 'अस्वीकृत', tl: 'Tinanggihan', bn: 'প্রত্যাখ্যাত', fr: 'Refusé' },
}

export default function StaffLeavePage() {
  const router = useRouter()
  const { t, rtl, dir } = useStaffLang(L)
  const [session, setSession] = useState<StaffSession|null>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [balance, setBalance] = useState<number|null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // تحديث فوري: لما تتغير البيانات من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(liveStaffOrg(), ['staff_leave_requests','attendance_permission_requests'], ()=>loadRequests())
  useEffect(()=>{
    const saved = localStorage.getItem('staff_session')
    if(!saved){ router.push('/staff'); return }
    setSession(JSON.parse(saved) as StaffSession)
    loadRequests()
  },[])

  async function loadRequests() {
    setLoading(true)
    try {
      const token = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-leave', { headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      const list = j.success ? (j.requests||[]) : []
      setRequests(list)
      if (list.length > 0) setBalance(list[0]?.staff_members?.leave_balance_days ?? null)
    } catch { setRequests([]) }
    setLoading(false)
  }

  async function submitRequest() {
    if (!startDate || !endDate) { setError(t('pickDates')); return }
    setError('')
    setSubmitting(true)
    const token = localStorage.getItem('staff_token')
    const res = await fetch('/api/staff-leave', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ start_date: startDate, end_date: endDate, reason: reason || null }),
    })
    const j = await res.json()
    setSubmitting(false)
    if (!j.success) { setError(j.error || t('error')); return }
    setStartDate(''); setEndDate(''); setReason('')
    loadRequests()
  }

  if (!session) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f4',fontFamily:"'IBM Plex Sans Arabic',system-ui"}}>
      <div style={{width:32,height:32,border:'3px solid #e5e5e2',borderTopColor:'#029FA2',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f7f7f5',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:dir,paddingBottom:40}}>
      <StaffHeader title={t('title')} subtitle={session.name} rtl={rtl} end={<StaffLangButton/>} />

      <div style={{maxWidth:520,margin:'0 auto',padding:'20px 16px'}}>
        {balance !== null && (
          <div style={{background:'linear-gradient(135deg,#042f2e,#029FA2)',borderRadius:16,padding:'18px 20px',marginBottom:20,textAlign:'center' as const}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,.8)',marginBottom:4}}>{t('balance')}</div>
            <div style={{fontSize:32,fontWeight:900,color:'white'}}>{balance} <span style={{fontSize:15,fontWeight:600}}>{t('days')}</span></div>
          </div>
        )}

        <div style={{background:'white',border:'1.5px solid #ece8e2',borderRadius:14,padding:'16px',marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:700,color:'#374151',marginBottom:10}}>{t('newRequest')}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:11,color:'#6b7280',display:'block',marginBottom:5}}>{t('from')}</label>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                style={{width:'100%',padding:'10px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/>
            </div>
            <div>
              <label style={{fontSize:11,color:'#6b7280',display:'block',marginBottom:5}}>{t('to')}</label>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                style={{width:'100%',padding:'10px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/>
            </div>
          </div>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder={t('reason')}
            style={{width:'100%',padding:'10px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const,minHeight:60,resize:'none' as const,marginBottom:12}}/>
          {error && <div style={{fontSize:12,color:'#dc2626',marginBottom:10}}>{error}</div>}
          <button onClick={submitRequest} disabled={submitting||!startDate||!endDate}
            style={{width:'100%',padding:'12px',background:(submitting||!startDate||!endDate)?'#94a3b8':'#029FA2',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:(submitting||!startDate||!endDate)?'not-allowed':'pointer',fontFamily:'inherit'}}>
            {submitting?t('sending'):t('send')}
          </button>
        </div>

        <div style={{fontSize:12,fontWeight:700,color:'#888780',marginBottom:10}}>{t('mine')}</div>
        {loading ? (
          <div style={{textAlign:'center' as const,padding:20,fontSize:13,color:'#888780'}}>{t('loading')}</div>
        ) : requests.length===0 ? (
          <div style={{textAlign:'center' as const,padding:'40px 20px',fontSize:13,color:'#888780'}}>{t('none')}</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
            {requests.map((r:any)=>{
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.pending
              return (
                <div key={r.id} style={{background:st.bg,border:'1px solid #ece8e2',borderRadius:12,padding:'12px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#1c1c1a'}}>{r.start_date} → {r.end_date}</span>
                    <span style={{fontSize:10,fontWeight:700,color:st.color}}>{t(st.key)}</span>
                  </div>
                  <div style={{fontSize:11,color:'#6b7280'}}>{r.days_count} {t('days')}{r.reason?` — ${r.reason}`:''}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
