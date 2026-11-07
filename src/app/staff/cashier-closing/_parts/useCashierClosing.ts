'use client'
import { canCloseCashier } from '@/lib/staffRoles'
import { computeBusinessDate } from '@/lib/businessDate'
import { useState, useEffect, useRef } from 'react'
import { currencySymbol } from '@/lib/currencySymbol'
import { useRouter } from 'next/navigation'
import { getStaffOrg } from '@/lib/session'
import { useStaffLang, localeOf, isRtlLang } from '@/lib/staffLang'
import { THANKS_EXTRA } from '@/lib/staffI18n/cashier'
import { DELIVERY_APP_PRESETS } from '@/lib/deliveryApps'
import { ct, THANK_YOU_TEMPLATES_AR, THANK_YOU_TEMPLATES_EN, DEFICIT_REASONS } from './strings'
import type { StaffSession, Purchase } from './types'

/** حالة صفحة إقفال الكاشير وحساباتها — منقولة كما هي من page.tsx */
export function useCashierClosing() {
  const { lang } = useStaffLang()
  const rtl = isRtlLang(lang)
  const [session, setSession] = useState<StaffSession|null>(null)
  const [orgLogo, setOrgLogo] = useState<string|null>(null)
  const [dayStartHour, setDayStartHour] = useState<number|null>(null)
  const [clockTick, setClockTick] = useState(0)  // يحدّث التاريخ المعروض لو الصفحة مفتوحة وقت تغيّر اليوم
  const [step, setStep] = useState(1)
  const [stepDir, setStepDir] = useState<'fwd'|'back'>('fwd')
  const [closingDate, setClosingDate] = useState(() => new Date().toISOString().slice(0,10))
    const [totalSales, setTotalSales] = useState('')
  const [madaAmount, setMadaAmount] = useState('')
  const [visaAmount, setVisaAmount] = useState('')
  const [mastercardAmount, setMastercardAmount] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [deliveryChoices, setDeliveryChoices] = useState<string[]>([...DELIVERY_APP_PRESETS])   // الأشهر + اللي استخدمتها المنشأة قبل
  const [deliveryApps, setDeliveryApps] = useState<string[]>([])   // اللي أضافها الكاشير بهالإقفال
  const [appPickerOpen, setAppPickerOpen] = useState(false)
  const [deliveryAmounts, setDeliveryAmounts] = useState<Record<string,string>>({})
  const [otherAppOpen, setOtherAppOpen] = useState(false)
  const [otherAppName, setOtherAppName] = useState('')
  const [hasPurchases, setHasPurchases] = useState<'yes'|'no'|null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([{amount:'',reason:''}])
  const [deficitChoice, setDeficitChoice] = useState('')   // مفتاح من DEFICIT_REASONS
  const [deficitNote, setDeficitNote] = useState('')
  const [networkImage, setNetworkImage] = useState('')
  const [salesImage, setSalesImage] = useState('')
  // معاينة الصور من الجهاز نفسه (الرابط المحفوظ خاص — ما يفتح مباشرة)
  const [networkPreview, setNetworkPreview] = useState('')
  const [salesPreview, setSalesPreview] = useState('')
  const [uploadingNetwork, setUploadingNetwork] = useState(false)
  const [uploadingSales, setUploadingSales] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [locked, setLocked] = useState(false)
  const [thankYouMsg, setThankYouMsg] = useState('')
  const [curr, setCurr] = useState('⃁')
  const [toast, setToast] = useState<{msg:string,type:'success'|'error'}|null>(null)
  const router = useRouter()

  useEffect(()=>{ const t=setInterval(()=>setClockTick(x=>x+1),60000); return ()=>clearInterval(t) },[])
  useEffect(()=>{
    const savedSession = localStorage.getItem('staff_session')
    if(!savedSession){router.push('/staff');return}
    const s = JSON.parse(savedSession) as StaffSession
    if(!canCloseCashier(s as any)){router.push('/staff/dispense');return}
    setSession(s)
    getStaffOrg().then(org=>{
        if(org?.logo_url) setOrgLogo(org.logo_url)
        if(org?.business_day_start_hour != null) setDayStartHour(org.business_day_start_hour)
        if(org?.currency) setCurr(currencySymbol(org.currency))
        if(Array.isArray(org?.delivery_apps) && org.delivery_apps.length) setDeliveryChoices(org.delivery_apps)
        // نفس قرار الخادم: الشاملة/المتقدمة أو إضافة «إقفال الكاشير»
        if(org && org.cashier_feature===false) setLocked(true)
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
      const local = URL.createObjectURL(file)
      if(kind==='network'){ setNetworkImage(j.url); setNetworkPreview(local) }
      else { setSalesImage(j.url); setSalesPreview(local) }
      showToast(ct('imgUploaded',lang))
      // الصورة الثانية اكتملت → المراجعة على طول
      if(kind==='network' ? salesImage : networkImage) autoAdvanceFrom(3, 700)
    } catch {
      showToast(ct('imgUploadFailed',lang),'error')
    }
    kind==='network'?setUploadingNetwork(false):setUploadingSales(false)
  }

  function addDeliveryApp(raw:string) {
    const name = raw.replace(/\s+/g,' ').trim().slice(0,40)
    if(!name) return
    if(!deliveryApps.includes(name)) setDeliveryApps(prev=>[...prev,name])
    setOtherAppName(''); setOtherAppOpen(false); setAppPickerOpen(false)
  }
  function removeDeliveryApp(name:string) {
    setDeliveryApps(prev=>prev.filter(x=>x!==name))
    setDeliveryAmounts(prev=>{const n={...prev}; delete n[name]; return n})
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
  const deliveryList = deliveryApps.map(name=>({name,amount:Number(deliveryAmounts[name])||0})).filter(d=>d.amount>0)
  const delivery = Math.round(deliveryList.reduce((s,d)=>s+d.amount,0)*100)/100
  const anyNetworkEntered = !!(madaAmount || visaAmount || mastercardAmount)
  const networkError = (totalSales && anyNetworkEntered && network > sales) ? ct('networkErrorMsg',lang)
    : (totalSales && delivery > 0 && network + delivery > sales) ? ct('overSalesMsg',lang) : ''
  const validPurchasesNow = hasPurchases==='yes' ? purchases.filter(p=>Number(p.amount)>0) : []
  const totalPurchasesNow = validPurchasesNow.reduce((sum,p)=>sum+(Number(p.amount)||0),0)
  const expectedCash = sales - network - delivery
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
    setStepDir('fwd'); setStep(s=>Math.min(4,s+1))
  }
  function goBack() { setStepDir('back'); setStep(s=>Math.max(1,s-1)) }
  // تنقّل تلقائي: بعد إجابة تكفي للخطوة (مثل «لا» للمسحوبات أو رفع الصورتين) نروح للي بعدها بعد لحظة
  // عشان الموظف يشوف اختياره — وما نتحرك لو رجع أو تغيّرت الخطوة بالنص
  const autoTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  function autoAdvanceFrom(from: number, delay = 380) {
    if(autoTimer.current) clearTimeout(autoTimer.current)
    autoTimer.current = setTimeout(()=>{ setStepDir('fwd'); setStep(s => s===from ? Math.min(4, from+1) : s) }, delay)
  }
  useEffect(() => () => { if(autoTimer.current) clearTimeout(autoTimer.current) }, [])
  // كل خطوة تبدأ من فوق
  useEffect(() => { if(typeof window!=='undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }, [step])

  const deficitOption = DEFICIT_REASONS.find(r=>r.key===deficitChoice)
  // النص اللي يتحفظ ويطلع بالتقرير — دايماً بالعربي عشان التقرير يكون موحّد للمالك
  const deficitReason = !deficitOption ? '' : deficitOption.key==='other' ? deficitNote.trim() : (deficitOption.ar + (deficitNote.trim() ? ` — ${deficitNote.trim()}` : ''))
  const deficitReasonOk = status!=='deficit' || (!!deficitOption && deficitReason.length>=3)
  // نفس قاعدة السيرفر بالضبط — الكاشير يشوف التاريخ اللي بينحفظ قبل ما يحفظ
  void clockTick
  const businessDate = computeBusinessDate({ startHour: dayStartHour })
  const businessDateLabel = new Date(businessDate+'T12:00:00Z').toLocaleDateString(localeOf(lang), {numberingSystem:'latn',weekday:'long',year:'numeric',month:'long',day:'numeric',calendar:'gregory',timeZone:'UTC'})
  const isAfterMidnightCarry = businessDate !== new Date(Date.now()+3*3600e3).toISOString().slice(0,10)

  async function saveClosing() {
    if(!session) return
    if(!deficitReasonOk){ showToast(ct(deficitChoice==='other'?'deficitOtherReq':'deficitReasonReq',lang),'error'); return }
    setSubmitting(true)
    try {
      const validPurchases = validPurchasesNow.map(p=>({amount:Number(p.amount),reason:p.reason||ct('noReason',lang)}))
      const res = await fetch('/api/cashier-closing',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('staff_token')}`},
        body:JSON.stringify({
          total_sales: sales, network_amount: network,
          mada_amount: mada, visa_amount: visa, mastercard_amount: mastercard,
          cash_amount: cash, purchases: validPurchases, delivery: deliveryList,
          network_image: networkImage, sales_image: salesImage,
          deficit_reason: status==='deficit' ? deficitReason : null,
        })
      })
      if(res.status===401){
        // الجلسة انتهت — نرجّعه يدخل بالـPIN (البيانات اللي عبّاها تضيع، فننبّهه)
        showToast(ct('sessionExpired',lang),'error')
        setSubmitting(false)
        setTimeout(()=>{ localStorage.removeItem('staff_session'); router.push('/staff') }, 1500)
        return
      }
      if(!res.ok){ const j = await res.json().catch(()=>null); showToast(j?.error || ct('saveError',lang),'error'); setSubmitting(false); return }
      const templates = lang==='en' ? THANK_YOU_TEMPLATES_EN : lang==='ar' ? THANK_YOU_TEMPLATES_AR : ((THANKS_EXTRA as any)[lang] || THANK_YOU_TEMPLATES_EN)
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
    setTotalSales(''); setMadaAmount(''); setVisaAmount(''); setMastercardAmount(''); setCashAmount(''); setDeliveryApps([]); setDeliveryAmounts({}); setAppPickerOpen(false); setOtherAppOpen(false); setOtherAppName('')
    setHasPurchases(null); setPurchases([{amount:'',reason:''}])
    setNetworkImage(''); setSalesImage(''); setNetworkPreview(''); setSalesPreview(''); setDeficitChoice(''); setDeficitNote('')
    setStep(1); setSaved(false)
  }

  return { lang, stepDir, autoAdvanceFrom, session, setSession, orgLogo, setOrgLogo, dayStartHour, setDayStartHour, clockTick, setClockTick, step, setStep, closingDate, setClosingDate, madaAmount, setMadaAmount, visaAmount, setVisaAmount, mastercardAmount, setMastercardAmount, cashAmount, setCashAmount, deliveryChoices, setDeliveryChoices, deliveryApps, setDeliveryApps, appPickerOpen, setAppPickerOpen, deliveryAmounts, setDeliveryAmounts, otherAppOpen, setOtherAppOpen, otherAppName, setOtherAppName, hasPurchases, setHasPurchases, purchases, setPurchases, deficitChoice, setDeficitChoice, deficitNote, setDeficitNote, networkImage, setNetworkImage, salesImage, setSalesImage, networkPreview, salesPreview, uploadingNetwork, setUploadingNetwork, uploadingSales, setUploadingSales, submitting, setSubmitting, saved, setSaved, locked, setLocked, thankYouMsg, setThankYouMsg, curr, setCurr, toast, setToast, totalSales, setTotalSales, rtl, router, sales, mada, visa, mastercard, network, cash, deliveryList, delivery, anyNetworkEntered, networkError, validPurchasesNow, totalPurchasesNow, expectedCash, cashAfterWithdrawal, difference, status, step1Valid, step2Valid, step3Valid, deficitOption, deficitReason, deficitReasonOk, businessDate, businessDateLabel, isAfterMidnightCarry, logout, showToast, uploadImage, addDeliveryApp, removeDeliveryApp, addPurchaseRow, removePurchaseRow, updatePurchase, goNext, goBack, saveClosing, resetForm }
}

export type CashierClosing = ReturnType<typeof useCashierClosing>
/** الجلسة بعد التأكد من وجودها في الصفحة */
export type PageVals = { session: StaffSession }
