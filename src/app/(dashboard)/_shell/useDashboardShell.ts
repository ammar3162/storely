'use client'
import { managerPageAllowed } from '@/lib/managerPerms'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { getMeResult, refreshMe } from '@/lib/session'
import { getAddonsMarket } from '@/lib/addonsCache'
import { DEVICE_UNVERIFIED_REASON, VERIFY_DEVICE_PATH } from '@/lib/deviceMessages'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from '@/components/toast'
import { isInApp } from '@/lib/inApp'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { NAV_GROUPS } from './nav'
import { planIncludes } from '@/lib/planFeatures'
import { isNewPlan } from '@/lib/planPricing'
import type { Feature } from '@/lib/planFeatures'
// الصفحات اللي تحتاج ميزة (يكفي وحدة منها) — «ابنِ باقتك» ممكن ما فيها المخزون أو المشتريات
const PAGE_FEATURES: Record<string, Feature[]> = {
  '/inventory': ['inventory'], '/dispense': ['inventory'], '/transfer-stock': ['inventory'],
  '/purchases': ['purchases'], '/suppliers': ['inventory', 'purchases'], '/marketplace': ['inventory', 'purchases'],
  // أدوات الذكاء: تنخفي مثل المخزون لو ما هي باشتراكه (طلب المالك)
  '/ai-tools': ['ai'],
}

let _cache: any = null

// لا نضيف شيء هنا — الإشعار سيكون في الداشبورد مباشرة
// عرض الشاشة نفس نقطة الـ CSS (768px) — يتحدث لو تغيّر العرض
function useIsDesktop() {
  const [desk, setDesk] = useState<boolean | null>(null)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const on = () => setDesk(mq.matches)
    on(); mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return desk
}

/** حالة إطار لوحة المالك ودواله — منقولة كما هي من layout.tsx */
export function useDashboardShell() {
  const { t, lang, setLang } = useTranslation()
  const [orgName, setOrgName]       = useState('')
  const [subDaysLeft, setSubDaysLeft] = useState<number|null>(null)
  const [orgLogo, setOrgLogo]       = useState<string|null>(null)
  const [hasHrAddon, setHasHrAddon] = useState(false)
  const [hasProfitAddon, setHasProfitAddon] = useState(false)
  const [hasAiAddon, setHasAiAddon] = useState(false)
  const [hasExtraBranchAddon, setHasExtraBranchAddon] = useState(false)
  // داخل تطبيق Google Play نخفي صفحة الإضافات (شراء) — سياسة الدفع
  const [inApp, setInApp] = useState(false)
  useEffect(() => { setInApp(isInApp()) }, [])
  const [branchName, setBranchName] = useState('')
  const [userName, setUserName]     = useState('')
  const [userInit, setUserInit]     = useState('م')
  const [lowCount, setLowCount]     = useState(0)
  const [unread, setUnread]         = useState(0)

  // يزامن الرقم على أيقونة التطبيق مع عدد الإشعارات غير المقروءة تلقائياً
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      try {
        if (unread > 0) (navigator as any).setAppBadge(unread).catch(()=>{})
        else (navigator as any).clearAppBadge().catch(()=>{})
      } catch {}
    }
  }, [unread])
  const [branches, setBranches]     = useState<any[]>([])
  const [orgPlan, setOrgPlan]       = useState<string>('basic')
  // الميزات من الخادم (/api/me): الباقة + الإضافات + التجربة المجانية
  const [orgFeat, setOrgFeat]       = useState<Partial<Record<Feature, boolean>>>({})
  // ميزات كل فرع («ابنِ باقتك»/إضافات لفروع معيّنة) — نقفل الصفحة للفرع اللي ما فيه الميزة
  const [branchFeat, setBranchFeat] = useState<Record<string, Partial<Record<Feature, boolean>>>>({})
  // التجربة: المزايا اللي تنقفل بعدها (للشريط)
  const [trialLocked, setTrialLocked] = useState<Feature[]>([])
  const [trialEnds, setTrialEnds] = useState<string | null>(null)
  // الإضافات المفعّلة (الحضور، الربحية، الذكاء، الفروع الإضافية) — تتحدث لحالها لما تتغير (useLiveRefresh تحت)
  const loadAddons = useCallback((oid: string, fresh = false) => {
    getAddonsMarket(oid, fresh).then(j=>{
      if (j.success) {
        const hrAddon = (j.addons||[]).find((a:any)=>a.slug==='hr_full')
        setHasHrAddon(!!hrAddon?.subscription?.isValid)
        const live = (slug:string) => !!(j.addons||[]).find((a:any)=>a.slug===slug)?.subscription?.isValid
        setHasProfitAddon(live('profitability'))
        setHasAiAddon(live('ai_tools'))
        const branchAddon = (j.addons||[]).find((a:any)=>a.slug==='extra_branch')
        setHasExtraBranchAddon(!!branchAddon?.subscription?.isValid)
      }
    }).catch(()=>{})
  }, [])
  // إضافة تفعّلت/انتهت أو الباقة تغيّرت والصفحة مفتوحة → القائمة تتحدث بدون تحديث الصفحة
  useLiveRefresh(typeof window!=='undefined' ? sessionStorage.getItem('s_org_id') : null, ['org_addon_subscriptions','plan_requests'], () => {
    const oid = sessionStorage.getItem('s_org_id'); if (!oid) return
    loadAddons(oid, true)
    refreshMe().then(me => { if (me?.org?.plan) setOrgPlan(me.org.plan); if (me?.org?.features) setOrgFeat(me.org.features); if (me?.org?.branch_features) setBranchFeat(me.org.branch_features) }).catch(()=>{})
  })
  const [orgMaxBranches, setOrgMaxBranches] = useState<number>(1)
  const [userRole, setUserRole]     = useState<string>('owner')
  const [managerPermissions, setManagerPermissions] = useState<Record<string,boolean>|null>(null)
  const [showMore, setShowMore]     = useState(false)
  const [showBranch, setShowBranch] = useState(false)
  const [branchLowCounts, setBranchLowCounts] = useState<Record<string, number>>({})
  const [ready, setReady]           = useState(false)
  // الصفحة تنرسم في تخطيط واحد بس (جوال أو كمبيوتر حسب العرض) — كانت تنرسم في الاثنين ويختفي واحد بالـ CSS، فكل طلب بيانات واشتراك لحظي يتكرر مرتين
  const isDesk = useIsDesktop()
  const [showConsent, setShowConsent] = useState(false)
  const [showWaInvite, setShowWaInvite] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentSaving, setConsentSaving] = useState(false)
  const [showMaintenance, setShowMaintenance] = useState(false)
  const [showEnableNotif, setShowEnableNotif] = useState(false)
  // الآيفون: الإشعارات ما تشتغل إلا لو ستورلي مضاف للشاشة الرئيسية — نشرح له مرة كل أسبوع لين يضيفه
  const [showIosInstall, setShowIosInstall] = useState(false)
  const NOTIF_SNOOZE = 'notif_prompt_snooze_until'
  const snoozed = () => { try { return Number(localStorage.getItem(NOTIF_SNOOZE) || 0) > Date.now() } catch { return false } }
  const snoozeNotif = (days: number) => { try { localStorage.setItem(NOTIF_SNOOZE, String(Date.now() + days * 864e5)) } catch {} ; setShowEnableNotif(false); setShowIosInstall(false) }
  const [enablingPush, setEnablingPush] = useState(false)
  const [maintenanceMsg, setMaintenanceMsg] = useState('')
  const [showTermsConsent, setShowTermsConsent] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)
  const [termsSaving, setTermsSaving] = useState(false)
  const [profileId, setProfileId] = useState('')
  const [theme, setTheme]           = useState<'light'|'dark'>('light')
  const router   = useRouter()
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const sb = createClient()

  useEffect(()=>{
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) window.location.reload() }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  },[])

  useEffect(()=>{
    const saved = localStorage.getItem('storely_theme') as 'light'|'dark' || 'light'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
    if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{})
    load()
  },[])

  function toggleTheme() {
    const next = theme==='light'?'dark':'light'
    setTheme(next)
    localStorage.setItem('storely_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const load = useCallback(async()=>{
    // كل طلبات بداية الصفحة تنطلق مع بعض (كانت ورا بعض = ثواني انتظار قبل ما تفتح أي صفحة)
    const meRes = getMeResult()
    const msP = fetch('/api/platform-settings').then(r=>r.json())
    const subP = fetch('/api/check-subscription').then(r=>r.json())
    const tvP = fetch('/api/terms-version').then(r=>r.json())
    msP.catch(()=>{}); subP.catch(()=>{}); tvP.catch(()=>{})
    try {
      const ms = await msP
      if (ms.maintenanceMode) { setMaintenanceMsg(ms.maintenanceMessage); setShowMaintenance(true); return }
    } catch {}
    const { me, reason } = await meRes
    // جهاز جديد ما تحقق: صفحة الرمز (مو صفحة الدخول — المستخدم داخل أصلاً، والدخول يرجعه هنا فتصير حلقة)
    if(reason===DEVICE_UNVERIFIED_REASON){ window.location.href=VERIFY_DEVICE_PATH; return }
    if(!me){ router.replace(reason==='no_org'?'/pending':'/login'); return }
    const user={id:me.user_id}
    const p:any={ id:me.user_id, full_name:me.full_name, org_id:me.org_id, role:me.role, branch_id:me.branch_id, permissions:me.permissions,
      whatsapp_consent:me.whatsapp_consent, whatsapp_first_contact_confirmed:me.whatsapp_first_contact_confirmed,
      terms_version_accepted:me.terms_version_accepted, organizations:me.org }
    // فحص انتهاء الاشتراك -- بوقت السيرفر عبر api/check-subscription، مو وقت جهاز العميل
    // (وقت المتصفح لو مضبوط غلط كان يقفل حسابات عملاء اشتراكهم فعلياً ساري)
    try {
      const subRes = await subP
      if (subRes?.hasSubscription) {
        if (subRes.expired) {
          router.replace('/expired'); return
        }
        if (subRes.daysLeft!=null && subRes.daysLeft<=7 && subRes.daysLeft>=0) setSubDaysLeft(subRes.daysLeft)
      }
    } catch {
      // فشل الفحص نفسه (مشكلة شبكة مثلاً) ما لازم يقفل حساب العميل بالخطأ -- نكمّل عادي
    }
    const orgN=(p.organizations as any)?.name||''
    const orgLogoUrl=(p.organizations as any)?.logo_url||null
    const userN=p.full_name||''
    setOrgName(orgN); setUserName(userN); setUserInit(userN[0]||'م'); setOrgLogo(orgLogoUrl)
    if (p.org_id) loadAddons(p.org_id)
    setUserRole((p as any).role||'owner')
    if((p as any).role==='manager') setManagerPermissions((p as any).permissions||{})
    sessionStorage.setItem('s_org_id',p.org_id)
    sessionStorage.setItem('s_profile_id',p.id)
    setProfileId(p.id)
    if((p as any).whatsapp_consent !== true){ setShowConsent(true) }
    else if((p as any).whatsapp_first_contact_confirmed !== true){ setShowWaInvite(true) }

    // إلغاء تلقائي لحذف الحساب المجدول — مجرد تسجيل الدخول يعتبر تراجع عن طلب الحذف
    if((p as any).organizations?.deletion_scheduled_at){
      await api.patch('/api/me', { cancel_org_deletion: true })
      toast('✅ تم إلغاء حذف حسابك المجدول تلقائياً — حسابك آمن ومستمر بشكل طبيعي', 'success')
    }
    if((p as any).role==='owner'){
      try {
        const tv = await tvP
        if(!(p as any).terms_version_accepted || (p as any).terms_version_accepted !== tv.version){ setShowTermsConsent(true) }
      } catch {}
    }
    const orgData=me.org
    const orgPlan=(orgData as any)?.plan||'basic'
    setOrgPlan(orgPlan)
    setOrgFeat((orgData as any)?.features || {})
    setBranchFeat((orgData as any)?.branch_features || {})
    setTrialLocked(((orgData as any)?.trial_locked || []) as Feature[])
    setTrialEnds((me as any)?.subscription_ends_at || null)
    setOrgMaxBranches((orgData as any)?.max_branches||1)
    sessionStorage.setItem('s_plan',orgPlan)
    sessionStorage.setItem('s_country_code',(orgData as any)?.country_code||'+966')
    sessionStorage.setItem('s_max_staff',String((orgData as any)?.max_staff||1))
    sessionStorage.setItem('s_max_suppliers',String((orgData as any)?.max_suppliers||1))
    let bl:any[]=me.branches||[]
    if((p as any).role==='manager' && (p as any).branch_id){
      bl = bl.filter((b:any)=>b.id===(p as any).branch_id)
    }
    setBranches(bl)
    sessionStorage.setItem('s_branches',JSON.stringify(bl))
    if(bl.length<=1){
      const b=bl[0]||null
      if(b){sessionStorage.setItem('s_branch_id',b.id);sessionStorage.setItem('s_branch_name',b.name);setBranchName(b.name)}
    } else {
      const saved=sessionStorage.getItem('s_branch_id')
      if(saved&&bl.find((x:any)=>x.id===saved)){
        setBranchName(bl.find((x:any)=>x.id===saved)?.name||'')
      } else {
        const def=bl[0]
        if(def){sessionStorage.setItem('s_branch_id',def.id);sessionStorage.setItem('s_branch_name',def.name);setBranchName(def.name)}
      }
    }
    setReady(true)
    // استمع لتحديث اللوجو
    window.addEventListener('logo-updated', (e:any)=>{
      setOrgLogo(e.detail)
    })
    window.addEventListener('notifications-updated', async ()=>{
      const oid = sessionStorage.getItem('s_org_id')
      if(!oid) return
      const c = await api.get('/api/nav-counts', { org_id: oid, branch_id: sessionStorage.getItem('s_branch_id') })
      if (c.success) setUnread(c.unread)
    })
    if(typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("/sw.js")
        // لا نطلب الإذن تلقائياً — Safari/iOS يتجاهل الطلب لو ما كان ردة فعل مباشرة على ضغطة المستخدم.
        // بس نتحقق من الحالة الحالية، ونعرض زر "فعّل الإشعارات" لو لسا ما تقرر المستخدم.
        const ua = navigator.userAgent, isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true
        if(isIOS && !standalone && typeof (window as any).PushManager === 'undefined') {
          if(!snoozed()) setShowIosInstall(true)
        } else if(typeof Notification !== "undefined" && Notification.permission === "default") {
          if(!snoozed()) setShowEnableNotif(true)
        } else if(typeof Notification !== "undefined" && Notification.permission === "granted") {
          const reg = await navigator.serviceWorker.ready
          const existing = await reg.pushManager.getSubscription()
          // نجدد الاشتراك دايماً — يحمي من بقاء اشتراك قديم مرتبط بمفتاح VAPID سابق بعد أي تغيير للمفاتيح
          if(existing) { await existing.unsubscribe().catch(()=>{}) }
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          })
          await fetch("/api/push-subscribe", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ subscription: sub, org_id: p?.org_id })
          })
        }
      } catch(e) { console.log("Push setup error:", e) }
    }
    // polling للإشعارات وتنبيه نقص المخزون كل 30 ثانية — بدون ما يحتاج المستخدم يحدّث الصفحة
    const orgId = p?.org_id
    if(orgId){
      const notifInterval = setInterval(async()=>{
        const c = await api.get('/api/nav-counts', { org_id: orgId, branch_id: sessionStorage.getItem('s_branch_id') })
        if (c.success) { setUnread(c.unread); setLowCount(c.low) }
      }, 30000)
    }
    const counts = await api.get('/api/nav-counts', { org_id: p.org_id, branch_id: sessionStorage.getItem('s_branch_id') })
    if (counts.success) { setLowCount(counts.low); setUnread(counts.unread) }
  },[])

  async function acceptConsent(){
    if(!consentChecked || !profileId) return
    setConsentSaving(true)
    await api.patch('/api/me', { whatsapp_consent: true })
    setConsentSaving(false)
    setShowConsent(false)
    setShowWaInvite(true)
  }

  async function confirmWaFirstContact(){
    if(!profileId) return
    await api.patch('/api/me', { whatsapp_first_contact_confirmed: true })
    setShowWaInvite(false)
  }

  async function acceptTermsConsent(){
    if(!termsChecked) return
    setTermsSaving(true)
    try {
      await fetch('/api/accept-terms', { method:'POST' })
    } catch {}
    setTermsSaving(false)
    setShowTermsConsent(false)
  }

  // يُستدعى بضغطة زر المستخدم مباشرة — Safari/iOS يتجاهل طلب الإذن لو ما كان ردة فعل فورية على تفاعل حقيقي
  async function enablePush(){
    setEnablingPush(true)
    try {
      if(typeof Notification === "undefined") {
        toast('هذا المتصفح لا يدعم الإشعارات — على الآيفون أضف ستورلي إلى الشاشة الرئيسية أولاً', 'warning')
        setEnablingPush(false); setShowEnableNotif(false); return
      }
      const perm = await Notification.requestPermission()
      if(perm !== "granted") {
        toast(perm === 'denied' ? 'الإشعارات مقفلة من إعدادات المتصفح — فعّلها من إعدادات الموقع ثم أعد المحاولة' : 'لم يتم تفعيل الإشعارات', 'warning'); if(perm === 'denied') snoozeNotif(30)
        setEnablingPush(false); return
      }
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if(existing) { await existing.unsubscribe().catch(()=>{}) }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      })
      const oid = sessionStorage.getItem('s_org_id')
      const res = await fetch("/api/push-subscribe", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ subscription: sub, org_id: oid })
      })
      const data = await res.json().catch(()=>({}))
      if(res.ok && data.success) {
        toast('تم تفعيل الإشعارات — ستصلك تنبيهات ستورلي على هذا الجهاز', 'success')
      } else {
        toast('تعذّر تفعيل الإشعارات، حاول مرة أخرى', 'error')
      }
    } catch(e:any) {
      toast('تعذّر تفعيل الإشعارات، حاول مرة أخرى', 'error')
      console.log("enablePush error:", e)
    }
    setEnablingPush(false)
    setShowEnableNotif(false)
  }

  async function loadBranchLowCounts(){
    const oid = sessionStorage.getItem('s_org_id')
    if(!oid) return
    const c = await api.get('/api/nav-counts', { org_id: oid, by_branch: 1 })
    if (c.success) setBranchLowCounts(c.low_by_branch||{})
  }

  function openBranchSelector(){
    setShowBranch(true)
    loadBranchLowCounts()
  }

  function selectBranch(b:any){
    sessionStorage.setItem('s_branch_id',b.id)
    sessionStorage.setItem('s_branch_name',b.name)
    setBranchName(b.name); setShowBranch(false)
    window.location.reload()
  }

  const [confirmStopBranch, setConfirmStopBranch] = useState<any|null>(null)
  const [stoppingBranch, setStoppingBranch] = useState(false)

  async function stopBranch(b:any) {
    if (branches.length <= 1) { alert('لا يمكن إيقاف الفرع الوحيد المتبقي'); return }
    setStoppingBranch(true)
    const r = await api.patch('/api/branches', { org_id: sessionStorage.getItem('s_org_id'), id: b.id, is_active: false })
    if (!r.success) { alert(r.error || 'فشل إيقاف الفرع'); setStoppingBranch(false); return }
    const remaining = branches.filter((x:any)=>x.id!==b.id)
    setBranches(remaining)
    sessionStorage.setItem('s_branches', JSON.stringify(remaining))
    // لو كان الفرع الموقوف هو المختار حالياً، ننقل المستخدم لأول فرع متبقي
    if (sessionStorage.getItem('s_branch_id') === b.id) {
      const next = remaining[0]
      if (next) { sessionStorage.setItem('s_branch_id', next.id); sessionStorage.setItem('s_branch_name', next.name) }
    }
    setStoppingBranch(false)
    setConfirmStopBranch(null)
    window.location.reload()
  }

  // صلاحيات مدير الفرع من مصدر واحد (lib/managerPerms) — نفس القواعد اللي يطبقها الخادم
  function navVisible(href:string) {
    if(userRole!=='manager') return true
    return managerPageAllowed(href, managerPermissions)
  }
  // فتح صفحة بالرابط مباشرة بدون صلاحية → نرجعه للرئيسية
  useEffect(()=>{
    if(userRole==='manager' && managerPermissions && pathname && !managerPageAllowed(pathname, managerPermissions)) router.replace('/dashboard')
  },[userRole, managerPermissions, pathname])

  const isActive=(href:string)=>pathname===href||(href!=='/dashboard'&&pathname.startsWith(href))

  // Bottom nav items
  const BOT_NAV = [
    { href:'/dashboard', label:'الرئيسية', labelKey:'nav.dashboard', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href:'/inventory',  label:'المخزون',  labelKey:'nav.inventory', icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', badge:lowCount },
    { href:'/dispense',   label:'الصرف',   labelKey:'nav.dispense', icon:'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
    { href:'/purchases',  label:'مشتريات', labelKey:'nav.purchases', icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
  ]

  // عناصر القائمة المسموحة لهذا الحساب (الباقة، الإضافات، عدد الفروع، صلاحيات المدير، داخل التطبيق)
  function navAllowed(href:string){
    if(href==='/addons-market' && inApp) return false
    // المخزون والمشتريات: تنخفي لو ما هي باشتراكه («ابنِ باقتك»)
    const need = PAGE_FEATURES[href]
    if(need && !need.some(f => orgFeat[f] !== false)) return false
    const branchPages=['/branches','/branch-compare','/branch-managers','/transfer-stock']
    if(branchPages.includes(href) && (orgPlan==='basic'||isNewPlan(orgPlan)) && !hasExtraBranchAddon && orgMaxBranches<=1) return false
    if((href==='/attendance'||href==='/hr-management') && !planIncludes(orgPlan,'hr') && !hasHrAddon && !orgFeat.hr) return false
    if(href==='/profitability' && !planIncludes(orgPlan,'profitability') && !hasProfitAddon && !orgFeat.profitability) return false
    if(['/branch-compare','/branch-managers','/transfer-stock'].includes(href) && branches.length<=1) return false
    return navVisible(href)
  }
  // الصفحة الحالية تحتاج ميزة مو مفعّلة للفرع المختار؟ (الصفحة تنقفل مكانها بطاقة)
  const curBranch = typeof window !== 'undefined' ? sessionStorage.getItem('s_branch_id') : null
  const pageNeed = Object.entries(PAGE_FEATURES).find(([p]) => pathname === p || pathname?.startsWith(p + '/'))?.[1] || null
  const featNow = (curBranch && branchFeat[curBranch]) || orgFeat
  const pageLock: { feature: Feature; otherBranch: boolean } | null = pageNeed && !pageNeed.some(f => featNow[f] !== false)
    ? { feature: pageNeed[0], otherBranch: pageNeed.some(f => orgFeat[f] !== false) }
    : null
  const visibleGroups = NAV_GROUPS.map(g=>({...g, items:g.items.filter(i=>navAllowed(i.href))})).filter(g=>g.items.length)
  async function signOut(){ await sb.auth.signOut(); _cache=null; sessionStorage.clear(); window.location.href='/login' }

  return { showIosInstall, snoozeNotif, pageLock, branchFeat, trialLocked, trialEnds, t, lang, setLang, orgName, setOrgName, subDaysLeft, setSubDaysLeft, orgLogo, setOrgLogo, hasHrAddon, setHasHrAddon, hasProfitAddon, setHasProfitAddon, hasAiAddon, setHasAiAddon, hasExtraBranchAddon, setHasExtraBranchAddon, inApp, setInApp, branchName, setBranchName, userName, setUserName, userInit, setUserInit, lowCount, setLowCount, unread, setUnread, branches, setBranches, orgPlan, setOrgPlan, orgFeat, setOrgFeat, orgMaxBranches, setOrgMaxBranches, userRole, setUserRole, managerPermissions, setManagerPermissions, showMore, setShowMore, showBranch, setShowBranch, branchLowCounts, setBranchLowCounts, ready, setReady, showConsent, setShowConsent, showWaInvite, setShowWaInvite, consentChecked, setConsentChecked, consentSaving, setConsentSaving, showMaintenance, setShowMaintenance, showEnableNotif, setShowEnableNotif, enablingPush, setEnablingPush, maintenanceMsg, setMaintenanceMsg, showTermsConsent, setShowTermsConsent, termsChecked, setTermsChecked, termsSaving, setTermsSaving, profileId, setProfileId, theme, setTheme, confirmStopBranch, setConfirmStopBranch, stoppingBranch, setStoppingBranch, loadAddons, isDesk, router, pathname, navRef, sb, load, isActive, BOT_NAV, visibleGroups, toggleTheme, acceptConsent, confirmWaFirstContact, acceptTermsConsent, enablePush, loadBranchLowCounts, openBranchSelector, selectBranch, stopBranch, navVisible, navAllowed, signOut }
}

export type DashboardShell = ReturnType<typeof useDashboardShell>
