'use client'
import { StorelyButton, StorelyCard, StorelyPageHeader } from '@/components/ui'
import { Camera, ChartNoAxesCombined, CheckCircle2, CircleAlert, LoaderCircle, LockKeyhole, Receipt, Wallet } from 'lucide-react'
import { storelyTokens as uiTokens } from '@/components/ui/design-tokens'
import { useState, useEffect } from 'react'
import { currencySymbol } from '@/lib/currencySymbol'
import { useRouter } from 'next/navigation'
import { getStaffOrg } from '@/lib/session'

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string; role?: string
}

interface Purchase { amount: string; reason: string }

const STEPS_AR = [
  { key: 1, label: 'البيانات' },
  { key: 2, label: 'المصاريف' },
  { key: 3, label: 'الصور' },
  { key: 4, label: 'المراجعة' },
]
const STEPS_EN = [
  { key: 1, label: 'Data' },
  { key: 2, label: 'Expenses' },
  { key: 3, label: 'Photos' },
  { key: 4, label: 'Review' },
]

const CUI: Record<string,Record<'ar'|'en',string>> = {
  thankYouTitle:    {ar:'شكراً لك {name} على مجهودك اليوم 🙏',en:'Thank you {name} for your effort today 🙏'},
  logout:           {ar:'خروج',en:'Logout'},
  cashierBadge:     {ar:'كاشير',en:'Cashier'},
  lockedTitle:      {ar:'ميزة إقفال الكاشير متاحة بالباقة المتوسطة أو المتقدمة',en:'Cashier closing is available on the Standard or Advanced plan'},
  lockedSub:        {ar:'رقّي باقتك عشان تفعّل إقفال الكاشير اليومي وتتابع المبيعات والمصروفات تلقائياً',en:'Upgrade your plan to enable daily cashier closing and automatically track sales and expenses'},
  pageTitle:        {ar:'إقفال الكاشير اليومي',en:'Daily Cashier Closing'},
  savedTitle:       {ar:'تم حفظ تقرير الإقفال بنجاح',en:'Closing report saved successfully'},
  savedSub:         {ar:'يمكن للمالك مراجعة التقرير من صفحة التقارير',en:'The owner can review the report from the Reports page'},
  newClosing:       {ar:'إقفال جديد',en:'New Closing'},
  step1Title:       {ar:'بيانات اليوم',en:"Today's Data"},
  totalSalesLabel:  {ar:'إجمالي المبيعات (النظام)',en:'Total Sales (System)'},
  networkLabel:     {ar:'الشبكة — حسب تقرير جهاز مدى',en:'Network — per POS device report'},
  mada:             {ar:'مدى',en:'Mada'},
  visa:             {ar:'فيزا',en:'Visa'},
  mastercard:       {ar:'ماستركارد',en:'Mastercard'},
  networkTotal:     {ar:'إجمالي الشبكة',en:'Network Total'},
  networkErrorMsg:  {ar:'إجمالي الشبكة أكبر من إجمالي المبيعات — راجع الأرقام',en:'Network total exceeds sales total — check the numbers'},
  cashInDrawer:     {ar:'الكاش الفعلي بالدرج',en:'Actual Cash in Drawer'},
  expectedCashPreview: {ar:'الكاش المتوقع (معاينة)',en:'Expected Cash (preview)'},
  step2Title:       {ar:'هل فيه مبالغ اتسحبت من الكاش لمشتريات؟',en:'Was any cash withdrawn for purchases?'},
  no:               {ar:'لا',en:'No'},
  yes:              {ar:'نعم',en:'Yes'},
  amountPh:         {ar:'المبلغ',en:'Amount'},
  reasonPh:         {ar:'السبب',en:'Reason'},
  addExpenseRow:    {ar:'+ إضافة مصروف آخر',en:'+ Add another expense'},
  totalWithdrawals: {ar:'إجمالي المسحوبات',en:'Total Withdrawals'},
  step3Title:       {ar:'صور الإثبات (إلزامي)',en:'Proof Photos (Required)'},
  salesReportImg:   {ar:'صورة تقرير المبيعات',en:'Sales Report Photo'},
  networkBalanceImg:{ar:'صورة موازنة الشبكة',en:'Network Balance Photo'},
  uploadingImg:     {ar:'⏳ جاري الرفع...',en:'⏳ Uploading...'},
  tapSalesUpload:   {ar:'📊 اضغط للرفع',en:'📊 Tap to upload'},
  tapNetworkUpload: {ar:'💳 اضغط للرفع',en:'💳 Tap to upload'},
  summaryTitle:     {ar:'ملخص الاحتساب',en:'Calculation Summary'},
  totalSalesRow:    {ar:'إجمالي المبيعات',en:'Total Sales'},
  expectedCashEq:   {ar:'= الكاش المتوقع',en:'= Expected Cash'},
  actualCashRow:    {ar:'الكاش الفعلي بالدرج',en:'Actual Cash in Drawer'},
  recordedWithdrawals: {ar:'📌 مسحوبات مسجّلة (للسجل فقط)',en:'📌 Recorded withdrawals (record only)'},
  withdrawalsNote:  {ar:'ما تؤثر على حساب العجز/الزيادة — الكاش المُدخل مفروض أصلاً بعد خصمها',en:"Doesn't affect the deficit/surplus calculation — the entered cash is assumed to already be net of these"},
  balanced:         {ar:'✅ مطابق تماماً',en:'✅ Exactly balanced'},
  deficit:          {ar:'⚠️ يوجد عجز',en:'⚠️ There is a deficit'},
  surplus:          {ar:'📈 يوجد زيادة',en:'📈 There is a surplus'},
  salesReportCheck: {ar:'تقرير المبيعات ✓',en:'Sales report ✓'},
  networkBalanceCheck: {ar:'موازنة الشبكة ✓',en:'Network balance ✓'},
  back:             {ar:'رجوع',en:'Back'},
  next:             {ar:'التالي',en:'Next'},
  saving:           {ar:'جاري الحفظ...',en:'Saving...'},
  confirmSave:       {ar:'✓ تأكيد وحفظ التقرير',en:'✓ Confirm and Save Report'},
  imgUploadFailed:  {ar:'فشل رفع الصورة',en:'Failed to upload image'},
  imgUploaded:      {ar:'تم رفع الصورة ✓',en:'Image uploaded ✓'},
  fillSalesNetworkCash: {ar:'أدخل إجمالي المبيعات والشبكة والكاش',en:'Enter total sales, network, and cash'},
  specifyWithdrawals: {ar:'حدد هل فيه مبالغ مسحوبة أم لا',en:'Specify whether any amount was withdrawn or not'},
  uploadBothPhotos: {ar:'يرجى رفع صورتي تقرير المبيعات وموازنة الشبكة',en:'Please upload both the sales report and network balance photos'},
  saveError:        {ar:'حدث خطأ أثناء الحفظ',en:'An error occurred while saving'},
  savedClosingReport: {ar:'✅ تم حفظ تقرير الإقفال',en:'✅ Closing report saved'},
  genericError:     {ar:'حدث خطأ، حاول مرة أخرى',en:'Something went wrong, try again'},
  noReason:         {ar:'بدون سبب',en:'No reason given'},
}
const ct = (key: string, lang: 'ar'|'en') => CUI[key]?.[lang] || CUI[key]?.ar || key

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function MoneyInput({ value, onChange, placeholder, icon, iconBg, iconColor, error, currency }: any) {
  return (
    <div>
      <div className="relative">
        <div className="absolute rounded-[var(--radius-sm)] flex items-center justify-center text-sm" style={{right:12, top:'50%', transform:'translateY(-50%)', width:30, height:30, background:iconBg}}>
          {icon}
        </div>
        <input type="number" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onFocus={e=>{if(!error)e.target.style.borderColor=iconColor}} onBlur={e=>{if(!error)e.target.style.borderColor='#e5e5e2'}} className="w-full rounded-[var(--radius)] !text-base font-semibold text-right storely-input min-w-0" style={{padding:'14px 54px 14px 46px', border:`1.5px solid ${error?uiTokens.color.danger:uiTokens.color.border}`, direction:'ltr', color:uiTokens.color.text, background:error?uiTokens.color.dangerBg:uiTokens.color.surface}}
        />
        <span className="absolute text-xs font-semibold" style={{left:14, top:'50%', transform:'translateY(-50%)', color:uiTokens.color.textMuted}}>{currency || 'ر.س'}</span>
      </div>
      {error && <div className="text-xs font-semibold !mt-1 flex items-center gap-2" style={{color:uiTokens.color.danger}}><CircleAlert size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> {error}</div>}
    </div>
  )
}

function ProgressBar({ step, lang }: { step: number; lang: 'ar'|'en' }) {
  const STEPS = lang==='en' ? STEPS_EN : STEPS_AR
  return (
    <div className="flex items-center !mb-6">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center" style={{flex:i<STEPS.length-1?1:'unset'}}>
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-[var(--radius-sm)] flex items-center justify-center text-sm font-semibold" style={{width:40, height:40, background:step>s.key ? uiTokens.color.navy : step===s.key ? uiTokens.color.navy : uiTokens.color.background, color:step>=s.key ? uiTokens.color.surface : uiTokens.color.textMuted, boxShadow:uiTokens.shadow.surface}}>
              {step>s.key ? '✓' : s.key}
            </div>
            <span className="text-xs font-semibold whitespace-normal break-words" style={{color:step>=s.key ? uiTokens.color.text : uiTokens.color.textMuted}}>{s.label}</span>
          </div>
          {i<STEPS.length-1 && (
            <div className="min-w-0 flex-1 !mt-0 !mx-1 !mb-4" style={{height:2, background:step>s.key ? uiTokens.color.navy : uiTokens.color.background}}/>
          )}
        </div>
      ))}
    </div>
  )
}

const THANK_YOU_TEMPLATES_AR = [
  'شكراً لك {name} على مجهودك اليوم 🙏',
  'يومك كان طويل يا {name}، تسلم على تعبك 💪',
  'شكراً {name} — بدونك ما كان يمشي الشغل ✨',
  '{name}، تسلم إيدك على جهدك اليوم 🌟',
  'إنجاز تاني ليوم يا {name} — شكراً لك 🙌',
]
const THANK_YOU_TEMPLATES_EN = [
  'Thank you {name} for your effort today 🙏',
  'It was a long day, {name} — well done 💪',
  'Thanks {name} — the work wouldn\'t run without you ✨',
  '{name}, great effort today 🌟',
  'Another day, another win, {name} — thank you 🙌',
]

export default function CashierClosingPage() {
  const [lang, setPageLang] = useState<'ar'|'en'>('ar')
  const [session, setSession] = useState<StaffSession|null>(null)
  const [orgLogo, setOrgLogo] = useState<string|null>(null)
  const [step, setStep] = useState(1)
  const [closingDate, setClosingDate] = useState(() => new Date().toISOString().slice(0,10))
    const [totalSales, setTotalSales] = useState('')
  const [madaAmount, setMadaAmount] = useState('')
  const [visaAmount, setVisaAmount] = useState('')
  const [mastercardAmount, setMastercardAmount] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [hasPurchases, setHasPurchases] = useState<'yes'|'no'|null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([{amount:'',reason:''}])
  const [networkImage, setNetworkImage] = useState('')
  const [salesImage, setSalesImage] = useState('')
  const [uploadingNetwork, setUploadingNetwork] = useState(false)
  const [uploadingSales, setUploadingSales] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [locked, setLocked] = useState(false)
  const [thankYouMsg, setThankYouMsg] = useState('')
  const [curr, setCurr] = useState('ر.س')
  const [toast, setToast] = useState<{msg:string,type:'success'|'error'}|null>(null)
  const router = useRouter()

  useEffect(()=>{
    const savedLang = localStorage.getItem('staff_lang')
    if(savedLang==='en') setPageLang('en')
    const savedSession = localStorage.getItem('staff_session')
    if(!savedSession){router.push('/staff');return}
    const s = JSON.parse(savedSession) as StaffSession
    if(s.role !== 'cashier'){router.push('/staff/dispense');return}
    setSession(s)
    getStaffOrg().then(org=>{
        if(org?.logo_url) setOrgLogo(org.logo_url)
        if(org?.currency) setCurr(currencySymbol(org.currency))
        if(org?.plan==='basic') setLocked(true)
      })
  },[])

  useEffect(()=>{
    async function checkStillActive() {
      const saved = localStorage.getItem('staff_session')
      if(!saved) return
      const s = JSON.parse(saved)
      try {
        const permToken = localStorage.getItem('staff_token')
        const res = await fetch('/api/staff-permissions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${permToken}`},body:JSON.stringify({})})
        if(res.ok){
          const data = await res.json()
          if(data.deleted){
            localStorage.removeItem('staff_session')
            router.push('/staff')
          }
        }
      } catch {}
    }
    checkStillActive()
    const interval = setInterval(checkStillActive, 5000)
    return ()=>clearInterval(interval)
  },[])

  function logout() { localStorage.removeItem('staff_session'); router.push('/staff') }

  function showToast(msg:string, type:'success'|'error'='success') {
    setToast({msg,type})
    setTimeout(()=>setToast(null),3000)
  }

  async function uploadImage(file: File, kind: 'network'|'sales') {
    if(!session) return
    kind==='network'?setUploadingNetwork(true):setUploadingSales(true)
    try {
      const staffToken = localStorage.getItem('staff_token')
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/staff-upload-invoice',{method:'POST',headers:{'Authorization':`Bearer ${staffToken}`},body:fd})
      const j = await res.json()
      if(!res.ok||!j.success){ showToast(j.error||ct('imgUploadFailed',lang),'error'); kind==='network'?setUploadingNetwork(false):setUploadingSales(false); return }
      if(kind==='network') setNetworkImage(j.url)
      else setSalesImage(j.url)
      showToast(ct('imgUploaded',lang))
    } catch {
      showToast(ct('imgUploadFailed',lang),'error')
    }
    kind==='network'?setUploadingNetwork(false):setUploadingSales(false)
  }

  function addPurchaseRow() { setPurchases(prev=>[...prev,{amount:'',reason:''}]) }
  function removePurchaseRow(idx:number) { setPurchases(prev=>prev.filter((_,i)=>i!==idx)) }
  function updatePurchase(idx:number, field:'amount'|'reason', value:string) {
    setPurchases(prev=>prev.map((p,i)=>i===idx?{...p,[field]:value}:p))
  }

  // حسابات مباشرة (معاينة حية)
  const sales = Number(totalSales)||0
  const mada = Number(madaAmount)||0
  const visa = Number(visaAmount)||0
  const mastercard = Number(mastercardAmount)||0
  const network = mada + visa + mastercard
  const cash = Number(cashAmount)||0
  const anyNetworkEntered = !!(madaAmount || visaAmount || mastercardAmount)
  const networkError = (totalSales && anyNetworkEntered && network > sales) ? ct('networkErrorMsg',lang) : ''
  const validPurchasesNow = hasPurchases==='yes' ? purchases.filter(p=>Number(p.amount)>0) : []
  const totalPurchasesNow = validPurchasesNow.reduce((sum,p)=>sum+(Number(p.amount)||0),0)
  const expectedCash = sales - network
  // المسحوبات لا تؤثر على العجز/الزيادة — تُعرض للسجل فقط
  const cashAfterWithdrawal = cash - totalPurchasesNow
  const difference = cash - expectedCash
  const status = Math.abs(difference)<0.01 ? 'balanced' : (difference<0 ? 'deficit' : 'surplus')

  const step1Valid = !!totalSales && !!cashAmount && anyNetworkEntered && !networkError
  const step2Valid = hasPurchases!==null
  const step3Valid = !!salesImage && !!networkImage

  function goNext() {
    if(step===1 && !step1Valid){
      showToast(networkError || ct('fillSalesNetworkCash',lang),'error')
      return
    }
    if(step===2 && !step2Valid){
      showToast(ct('specifyWithdrawals',lang),'error')
      return
    }
    if(step===3 && !step3Valid){
      showToast(ct('uploadBothPhotos',lang),'error')
      return
    }
    setStep(s=>Math.min(4,s+1))
  }
  function goBack() { setStep(s=>Math.max(1,s-1)) }

  async function saveClosing() {
    if(!session) return
    setSubmitting(true)
    try {
      const validPurchases = validPurchasesNow.map(p=>({amount:Number(p.amount),reason:p.reason||ct('noReason',lang)}))
      const res = await fetch('/api/cashier-closing',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          org_id: session.org_id, branch_id: session.branch_id,
          staff_id: session.id, staff_name: session.name,
          total_sales: sales, network_amount: network,
          mada_amount: mada, visa_amount: visa, mastercard_amount: mastercard,
          cash_amount: cash, purchases: validPurchases,
          network_image: networkImage, sales_image: salesImage,
        })
      })
      if(!res.ok){ showToast(ct('saveError',lang),'error'); setSubmitting(false); return }
      const templates = lang==='en' ? THANK_YOU_TEMPLATES_EN : THANK_YOU_TEMPLATES_AR
      const template = templates[Math.floor(Math.random()*templates.length)]
      setThankYouMsg(template.replace('{name}', session?.name || ''))
      setSaved(true)
      showToast(ct('savedClosingReport',lang))
    } catch {
      showToast(ct('genericError',lang),'error')
    }
    setSubmitting(false)
  }

  function resetForm() {
    setTotalSales(''); setMadaAmount(''); setVisaAmount(''); setMastercardAmount(''); setCashAmount('')
    setHasPurchases(null); setPurchases([{amount:'',reason:''}])
    setNetworkImage(''); setSalesImage('')
    setStep(1); setSaved(false)
  }

  if(!session) return (
    <div className="min-h-screen flex items-center justify-center text-[var(--storely-navy)]" style={{background:uiTokens.color.background}}>
      <LoaderCircle size={28} className="animate-spin" />

    </div>
  )

  if(locked) return (
    <div className="min-h-screen flex items-center justify-center !p-5 text-center text-[var(--storely-navy)]" style={{background:uiTokens.color.background, direction:lang==='en'?'ltr':'rtl'}}>
      <div>
        <div className="text-2xl !mb-3"><LockKeyhole size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
        <div className="text-base font-semibold !mb-2" style={{color:uiTokens.color.text}}>{ct('lockedTitle',lang)}</div>
        <div className="text-sm" style={{color:uiTokens.color.textMuted}}>{ct('lockedSub',lang)}</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen !pb-8 text-[var(--storely-navy)]" style={{background:uiTokens.color.background, direction:lang==='en'?'ltr':'rtl'}}>

      {toast && (
        <div className="fixed w-[calc(100%-32px)] max-w-lg border border-[var(--storely-border)] !py-3 !px-6 rounded-[var(--radius)] text-sm font-semibold whitespace-normal break-words" style={{top:20, left:'50%', transform:'translateX(-50%)', zIndex:9999, background:uiTokens.color.surface, color:toast.type==='success'?uiTokens.color.success:uiTokens.color.danger, boxShadow:uiTokens.shadow.surface}}>
          {toast.msg}
        </div>
      )}

      <div className="!py-4 !px-5 flex justify-between items-center flex-wrap gap-4" style={{background:uiTokens.color.surface, top:0, zIndex:100, boxShadow:uiTokens.shadow.surface}}>
        <div className="flex items-center gap-3">
          {orgLogo ? (
            <img src={orgLogo} alt="" className="rounded-[var(--radius)] object-cover" style={{width:42, height:42, border:'2px solid rgba(255,255,255,.2)'}}/>
          ) : (
            <div className="rounded-[var(--radius)] flex items-center justify-center text-lg" style={{width:42, height:42, background:uiTokens.color.surface}}><Wallet size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
          )}
          <div>
            <div className="text-base font-semibold" style={{color:uiTokens.color.navy}}>{session.name}</div>
            <div className="text-xs !mt-0 flex items-center gap-2" style={{color:uiTokens.color.textMuted}}>
              <span>{session.org_name}{session.branch_name?` · ${session.branch_name}`:''}</span>
              <span className="!py-0 !px-2 rounded-[var(--radius)] font-semibold text-xs" style={{background:uiTokens.color.surface}}>{ct('cashierBadge',lang)}</span>
            </div>
          </div>
        </div>
        <StorelyButton onClick={logout} variant="secondary">
          {ct('logout',lang)}
        </StorelyButton>
      </div>

      <div className="max-w-4xl !my-0 !mx-auto !py-6 !px-4">
        {!saved && (
          <div className="!mb-1">
            <StorelyPageHeader title={<> {ct('pageTitle',lang)} </>} className="!mb-2" />
            <div className="text-sm font-semibold !mb-5" style={{color:uiTokens.color.textMuted}}>{new Date().toLocaleDateString(lang==='en'?'en-US':'ar-SA', {numberingSystem:'latn',weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
            <ProgressBar step={step} lang={lang}/>
          </div>
        )}

        {saved ? (
          <StorelyCard className="min-w-0 rounded-[var(--radius)] !p-8 text-center" style={{background:uiTokens.color.surface, boxShadow:uiTokens.shadow.surface, border:`1px solid ${uiTokens.color.border}`}}>
            <div className="rounded-[var(--radius-sm)] flex items-center justify-center text-[28px] !mt-0 !mx-auto !mb-4" style={{width:64, height:64, background:uiTokens.color.surface}}><CheckCircle2 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
            <div className="text-lg font-semibold !mb-2" style={{color:uiTokens.color.text}}>{ct('savedTitle',lang)}</div>
            <div className="rounded-[var(--radius)] !py-3 !px-4 !mb-3" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
              <div className="text-sm font-semibold" style={{color:uiTokens.color.navy}}>{thankYouMsg}</div>
            </div>
            <div className="text-sm !mb-6" style={{color:uiTokens.color.textMuted}}>{ct('savedSub',lang)}</div>
            <StorelyButton onClick={resetForm} variant="primary">
              {ct('newClosing',lang)}
            </StorelyButton>
          </StorelyCard>
        ) : (
          <>
            {/* خطوة 1: البيانات */}
            {step===1 && (
              <StorelyCard className="min-w-0 rounded-[var(--radius)] !p-5 !mb-4" style={{background:uiTokens.color.surface, boxShadow:uiTokens.shadow.surface, border:`1px solid ${uiTokens.color.border}`}}>
                <div className="text-sm font-semibold !mb-4 flex items-center gap-2" style={{color:uiTokens.color.text}}>
                  <span className="rounded-[var(--radius-sm)] flex items-center justify-center text-sm" style={{width:40, height:40, background:uiTokens.color.surface}}><ChartNoAxesCombined size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></span>
                  {ct('step1Title',lang)}
                </div>
                <div className="!mb-4">
                  <label className="text-sm font-semibold block !mb-2" style={{color:uiTokens.color.textMuted}}>{ct('totalSalesLabel',lang)}</label>
                  <MoneyInput value={totalSales} onChange={setTotalSales} placeholder="0.00" icon={<ChartNoAxesCombined size={16}/>} iconBg={uiTokens.color.surface} iconColor={uiTokens.color.navy} currency={curr}/>
                </div>
                <div className="!mb-4">
                  <label className="text-sm font-semibold block !mb-2" style={{color:uiTokens.color.textMuted}}>{ct('networkLabel',lang)}</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-xs font-semibold !mb-1 text-center" style={{color:uiTokens.color.textMuted}}>{ct('mada',lang)}</div>
                      <input type="number" value={madaAmount} onChange={e=>setMadaAmount(e.target.value)} placeholder="0.00" className="w-full rounded-[var(--radius-sm)] text-sm font-semibold text-center storely-input min-w-0" style={{border:`1.5px solid ${networkError?uiTokens.color.danger:uiTokens.color.border}`, direction:'ltr', background:networkError?uiTokens.color.dangerBg:uiTokens.color.surface}}/>
                    </div>
                    <div>
                      <div className="text-xs font-semibold !mb-1 text-center" style={{color:uiTokens.color.textMuted}}>{ct('visa',lang)}</div>
                      <input type="number" value={visaAmount} onChange={e=>setVisaAmount(e.target.value)} placeholder="0.00" className="w-full rounded-[var(--radius-sm)] text-sm font-semibold text-center storely-input min-w-0" style={{border:`1.5px solid ${networkError?uiTokens.color.danger:uiTokens.color.border}`, direction:'ltr', background:networkError?uiTokens.color.dangerBg:uiTokens.color.surface}}/>
                    </div>
                    <div>
                      <div className="text-xs font-semibold !mb-1 text-center" style={{color:uiTokens.color.textMuted}}>{ct('mastercard',lang)}</div>
                      <input type="number" value={mastercardAmount} onChange={e=>setMastercardAmount(e.target.value)} placeholder="0.00" className="w-full rounded-[var(--radius-sm)] text-sm font-semibold text-center storely-input min-w-0" style={{border:`1.5px solid ${networkError?uiTokens.color.danger:uiTokens.color.border}`, direction:'ltr', background:networkError?uiTokens.color.dangerBg:uiTokens.color.surface}}/>
                    </div>
                  </div>
                  {anyNetworkEntered && (
                    <div className="flex justify-between !mt-2 !py-2 !px-2 rounded-[var(--radius-sm)] text-xs font-semibold flex-wrap gap-4" style={{background:uiTokens.color.infoBg}}>
                      <span style={{color:uiTokens.color.info}}>{ct('networkTotal',lang)}</span>
                      <span style={{color:uiTokens.color.info, direction:'ltr' as const}}>{fmt(network)} {curr}</span>
                    </div>
                  )}
                  {networkError && <div className="text-xs font-semibold !mt-1 flex items-center gap-2" style={{color:uiTokens.color.danger}}><CircleAlert size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> {ct('networkErrorMsg',lang)}</div>}
                </div>
                <div style={{marginBottom: (totalSales && anyNetworkEntered && !networkError) ? 16 : 0}}>
                  <label className="text-sm font-semibold block !mb-2" style={{color:uiTokens.color.textMuted}}>{ct('cashInDrawer',lang)}</label>
                  <MoneyInput value={cashAmount} onChange={setCashAmount} placeholder="0.00" icon={<Wallet size={16}/>} iconBg={uiTokens.color.surface} iconColor={uiTokens.color.navy} currency={curr}/>
                </div>
                {totalSales && anyNetworkEntered && !networkError && (
                  <div className="flex justify-between !py-3 !px-3 rounded-[var(--radius-sm)] text-sm font-semibold flex-wrap gap-4" style={{background:uiTokens.color.background}}>
                    <span style={{color:uiTokens.color.textMuted}}>{ct('expectedCashPreview',lang)}</span>
                    <span style={{color:uiTokens.color.text, direction:'ltr' as const}}>{fmt(expectedCash)} {curr}</span>
                  </div>
                )}
              </StorelyCard>
            )}

            {/* خطوة 2: المصاريف */}
            {step===2 && (
              <StorelyCard className="min-w-0 rounded-[var(--radius)] !p-5 !mb-4" style={{background:uiTokens.color.surface, boxShadow:uiTokens.shadow.surface, border:`1px solid ${uiTokens.color.border}`}}>
                <div className="text-sm font-semibold !mb-3 flex items-center gap-2" style={{color:uiTokens.color.text}}>
                  <span className="rounded-[var(--radius-sm)] flex items-center justify-center text-sm" style={{width:40, height:40, background:uiTokens.color.dangerBg}}><Receipt size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></span>
                  {ct('step2Title',lang)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" style={{marginBottom:hasPurchases==='yes'?16:0}}>
                  <StorelyButton onClick={()=>setHasPurchases('no')} style={{border:`1.5px solid ${hasPurchases==='no'?uiTokens.color.navy:uiTokens.color.border}`, background:hasPurchases==='no'?uiTokens.color.surface:uiTokens.color.surface, color:hasPurchases==='no'?uiTokens.color.navy:uiTokens.color.textMuted}} variant="secondary">
                    {ct('no',lang)}
                  </StorelyButton>
                  <StorelyButton onClick={()=>setHasPurchases('yes')} style={{border:`1.5px solid ${hasPurchases==='yes'?uiTokens.color.navy:uiTokens.color.border}`, background:hasPurchases==='yes'?uiTokens.color.surface:uiTokens.color.surface, color:hasPurchases==='yes'?uiTokens.color.navy:uiTokens.color.textMuted}} variant="secondary">
                    {ct('yes',lang)}
                  </StorelyButton>
                </div>

                {hasPurchases==='yes' && (
                  <div>
                    {purchases.map((p,idx)=>(
                      <div key={idx} className="flex gap-2 !mb-2 items-center !p-2 rounded-[var(--radius)]" style={{background:uiTokens.color.background, border:`1px solid ${uiTokens.color.border}`}}>
                        <div className="min-w-0 flex-1">
                          <input type="number" value={p.amount} onChange={e=>updatePurchase(idx,'amount',e.target.value)} placeholder={ct('amountPh',lang)} className="w-full rounded-[var(--radius-sm)] text-sm font-semibold text-right storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`, direction:'ltr'}}/>
                        </div>
                        <div style={{flex:1.4}}>
                          <input type="text" value={p.reason} onChange={e=>updatePurchase(idx,'reason',e.target.value)} placeholder={ct('reasonPh',lang)} className="w-full rounded-[var(--radius-sm)] text-sm storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/>
                        </div>
                        {purchases.length>1 && (
                          <StorelyButton onClick={()=>removePurchaseRow(idx)} className="shrink-0 !px-0" style={{width:40, height:40}} variant="danger">×</StorelyButton>
                        )}
                      </div>
                    ))}
                    <StorelyButton onClick={addPurchaseRow} className="w-full !mt-0" variant="secondary">
                      {ct('addExpenseRow',lang)}
                    </StorelyButton>
                    {totalPurchasesNow>0 && (
                      <div className="flex justify-between !mt-3 !py-2 !px-3 rounded-[var(--radius-sm)] text-sm font-semibold flex-wrap gap-4" style={{background:uiTokens.color.dangerBg}}>
                        <span style={{color:uiTokens.color.danger}}>{ct('totalWithdrawals',lang)}</span>
                        <span style={{color:uiTokens.color.danger, direction:'ltr' as const}}>{fmt(totalPurchasesNow)} {curr}</span>
                      </div>
                    )}
                  </div>
                )}
              </StorelyCard>
            )}

            {/* خطوة 3: الصور */}
            {step===3 && (
              <StorelyCard className="min-w-0 rounded-[var(--radius)] !p-5 !mb-4" style={{background:uiTokens.color.surface, boxShadow:uiTokens.shadow.surface, border:`1px solid ${uiTokens.color.border}`}}>
                <div className="text-sm font-semibold !mb-4 flex items-center gap-2" style={{color:uiTokens.color.text}}>
                  <span className="rounded-[var(--radius-sm)] flex items-center justify-center text-sm" style={{width:40, height:40, background:uiTokens.color.infoBg}}><Camera size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></span>
                  {ct('step3Title',lang)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold block !mb-1" style={{color:uiTokens.color.textMuted}}>{ct('salesReportImg',lang)}</label>
                    {salesImage ? (
                      <div className="relative">
                        <img src={salesImage} alt="sales report" className="w-full rounded-[var(--radius-sm)] object-cover" style={{height:130}}/>
                        <StorelyButton type="button" onClick={()=>setSalesImage('')} className="absolute" style={{top:6, left:6, width:24, height:24}} variant="secondary">×</StorelyButton>
                      </div>
                    ):(
                      <label className="flex items-center justify-center rounded-[var(--radius-sm)] text-center !p-2" style={{height:130, border:`1px dashed ${uiTokens.color.border}`, cursor:'pointer', background:uiTokens.color.background}}>
                        <input type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&uploadImage(e.target.files[0],'sales')} className="hidden"/>
                        <span className="text-sm font-semibold" style={{color:uiTokens.color.textMuted}}>{uploadingSales?ct('uploadingImg',lang):ct('tapSalesUpload',lang)}</span>
                      </label>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold block !mb-1" style={{color:uiTokens.color.textMuted}}>{ct('networkBalanceImg',lang)}</label>
                    {networkImage ? (
                      <div className="relative">
                        <img src={networkImage} alt="network balance" className="w-full rounded-[var(--radius-sm)] object-cover" style={{height:130}}/>
                        <StorelyButton type="button" onClick={()=>setNetworkImage('')} className="absolute" style={{top:6, left:6, width:24, height:24}} variant="secondary">×</StorelyButton>
                      </div>
                    ):(
                      <label className="flex items-center justify-center rounded-[var(--radius-sm)] text-center !p-2" style={{height:130, border:`1px dashed ${uiTokens.color.border}`, cursor:'pointer', background:uiTokens.color.background}}>
                        <input type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&uploadImage(e.target.files[0],'network')} className="hidden"/>
                        <span className="text-sm font-semibold" style={{color:uiTokens.color.textMuted}}>{uploadingNetwork?ct('uploadingImg',lang):ct('tapNetworkUpload',lang)}</span>
                      </label>
                    )}
                  </div>
                </div>
              </StorelyCard>
            )}

            {/* خطوة 4: المراجعة */}
            {step===4 && (
              <StorelyCard className="min-w-0 rounded-[var(--radius)] !p-5 !mb-4" style={{background:uiTokens.color.surface, boxShadow:uiTokens.shadow.surface, border:`1px solid ${uiTokens.color.border}`}}>
                <div className="text-sm font-semibold !mb-3" style={{color:uiTokens.color.text}}>{ct('summaryTitle',lang)}</div>
                {[
                  {label:ct('totalSalesRow',lang),value:sales,sign:''},
                  ...(mada>0?[{label:`— ${ct('mada',lang)}`,value:mada,sign:'−'}]:[]),
                  ...(visa>0?[{label:`— ${ct('visa',lang)}`,value:visa,sign:'−'}]:[]),
                  ...(mastercard>0?[{label:`— ${ct('mastercard',lang)}`,value:mastercard,sign:'−'}]:[]),
                ].map((r,i)=>(
                  <div key={i} className="flex justify-between !py-2 !px-0 text-sm flex-wrap gap-4" style={{borderBottom:`1px dashed ${uiTokens.color.border}`}}>
                    <span className="font-semibold" style={{color:uiTokens.color.textMuted}}>{r.label}</span>
                    <span className="font-semibold" style={{color:uiTokens.color.text, direction:'ltr' as const}}>{r.sign}{fmt(r.value)} {curr}</span>
                  </div>
                ))}
                <div className="flex justify-between !pt-3 !px-0 !pb-4 text-sm flex-wrap gap-4">
                  <span className="font-semibold" style={{color:uiTokens.color.text}}>{ct('expectedCashEq',lang)}</span>
                  <span className="font-semibold" style={{color:uiTokens.color.text, direction:'ltr' as const}}>{fmt(expectedCash)} {curr}</span>
                </div>
                <div className="!mt-1 !mx-0 !mb-3" style={{height:1, background:uiTokens.color.background}}/>
                <div className="flex justify-between !pt-3 !px-0 !pb-4 text-sm flex-wrap gap-4">
                  <span className="font-semibold" style={{color:uiTokens.color.text}}>{ct('actualCashRow',lang)}</span>
                  <span className="font-semibold" style={{color:uiTokens.color.text, direction:'ltr' as const}}>{fmt(cash)} {curr}</span>
                </div>
                {totalPurchasesNow>0 && (
                  <div className="rounded-[var(--radius-sm)] !py-2 !px-3 !mb-4" style={{background:uiTokens.color.background}}>
                    <div className="flex justify-between text-sm flex-wrap gap-4">
                      <span className="font-semibold" style={{color:uiTokens.color.textMuted}}>{ct('recordedWithdrawals',lang)}</span>
                      <span className="font-semibold" style={{color:uiTokens.color.textMuted, direction:'ltr' as const}}>{fmt(totalPurchasesNow)} {curr}</span>
                    </div>
                    <div className="text-xs !mt-1" style={{color:uiTokens.color.textMuted}}>{ct('withdrawalsNote',lang)}</div>
                  </div>
                )}
                <div className="!p-4 rounded-[var(--radius)] text-center !mb-4" style={{background:status==='balanced' ? uiTokens.color.successBg : status==='deficit' ? uiTokens.color.dangerBg : uiTokens.color.infoBg, border:`1.5px solid ${status==='balanced' ? uiTokens.color.successBorder : status==='deficit' ? uiTokens.color.dangerBorder : uiTokens.color.infoBorder}`}}>
                  <div className="text-sm font-semibold" style={{color:status==='balanced' ? uiTokens.color.success : status==='deficit' ? uiTokens.color.danger : uiTokens.color.info, marginBottom:status!=='balanced'?6:0}}>
                    {status==='balanced' ? ct('balanced',lang) : status==='deficit' ? ct('deficit',lang) : ct('surplus',lang)}
                  </div>
                  {status!=='balanced' && (
                    <div className="text-[28px] font-semibold" style={{color:status==='deficit' ? uiTokens.color.danger : uiTokens.color.info}}>
                      {fmt(Math.abs(difference))} {curr}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="!p-2 rounded-[var(--radius-sm)] text-center" style={{background:uiTokens.color.background}}>
                    <img src={salesImage} alt="" className="w-full rounded-[var(--radius-sm)] object-cover !mb-1" style={{height:60}}/>
                    <span className="text-xs font-semibold" style={{color:uiTokens.color.textMuted}}>{ct('salesReportCheck',lang)}</span>
                  </div>
                  <div className="!p-2 rounded-[var(--radius-sm)] text-center" style={{background:uiTokens.color.background}}>
                    <img src={networkImage} alt="" className="w-full rounded-[var(--radius-sm)] object-cover !mb-1" style={{height:60}}/>
                    <span className="text-xs font-semibold" style={{color:uiTokens.color.textMuted}}>{ct('networkBalanceCheck',lang)}</span>
                  </div>
                </div>
              </StorelyCard>
            )}

            {/* أزرار التنقل */}
            <div className="flex flex-wrap gap-3">
              {step>1 && (
                <StorelyButton onClick={goBack} className="min-w-0 flex-1" variant="secondary">
                  {ct('back',lang)}
                </StorelyButton>
              )}
              {step<4 ? (
                <StorelyButton onClick={goNext} style={{flex:2}} variant="primary">
                  {ct('next',lang)}
                </StorelyButton>
              ) : (
                <StorelyButton onClick={saveClosing} disabled={submitting} style={{flex:2}} variant="primary">
                  {submitting ? ct('saving',lang) : ct('confirmSave',lang)}
                </StorelyButton>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
