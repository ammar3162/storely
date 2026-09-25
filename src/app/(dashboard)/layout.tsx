'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { getMeResult } from '@/lib/session'
import { useRouter, usePathname } from 'next/navigation'

import AIAssistant from '@/components/AIAssistant'
import { Bell, Check, ChevronDown, HelpCircle, LogOut, Moon, Pause, Settings, Store, Sun, Wrench } from 'lucide-react'
import { toast } from '@/components/toast'
import { colors as dsColors } from '@/lib/ds'
import { isInApp } from '@/lib/inApp'
import { LanguageProvider, useTranslation } from '@/lib/i18n/LanguageContext'

// موحّد مع نظام التصميم المشترك (@/lib/ds)
const C = {
  primary: dsColors.primary, primaryD: dsColors.primaryDark, primaryL: dsColors.primaryLight, primaryB: dsColors.primaryBorder,
  danger:  dsColors.danger, dangerL:  dsColors.dangerLight,
  text:    dsColors.text, text2: dsColors.text2, text3: dsColors.text3, text4: dsColors.text4,
  bg:      dsColors.bg, surface: dsColors.surface, border: dsColors.border, border2: dsColors.border2,
}

const NAV_GROUPS = [
  {
    label: 'راقب أداءك', labelKey: 'nav.groupPerformance',
    items: [
      { href:'/dashboard', label:'الرئيسية', labelKey:'nav.dashboard', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href:'/reports',    label:'التقارير', labelKey:'nav.reports', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { href:'/notifications', label:'الإشعارات', labelKey:'nav.notifications', icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    ]
  },
  {
    label: 'إدارة المخزون', labelKey: 'nav.groupInventory',
    items: [
      { href:'/inventory',  label:'المخزون',  labelKey:'nav.inventory', icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { href:'/dispense',   label:'الصرف',   labelKey:'nav.dispense', icon:'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
      { href:'/purchases',  label:'مشتريات', labelKey:'nav.purchases', icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
      { href:'/transfer-stock', label:'نقل بين الفروع', labelKey:'nav.transferStock', icon:'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5' },
    ]
  },
  {
    label: 'إدارة الفريق', labelKey: 'nav.groupTeam',
    items: [
      { href:'/staff-management', label:'الموظفون', labelKey:'nav.staffManagement', icon:'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 11-8 0' },
      { href:'/hr-management', label:'إدارة الموظفين', labelKey:'nav.hrManagement', icon:'M12 8c-1.657 0-3 1.567-3 3.5S10.343 15 12 15s3-1.567 3-3.5S13.657 8 12 8zM3 21c0-3.314 3.582-6 8-6s8 2.686 8 6H3zm14-11h4m-2-2v4' },
      { href:'/attendance', label:'الحضور والانصراف', labelKey:'nav.attendance', icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href:'/branch-managers', label:'مديرو الفروع', labelKey:'nav.branchManagers', icon:'M12 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM5.5 20a6.5 6.5 0 0113 0' },
    ]
  },
  {
    label: 'المتجر', labelKey: 'nav.groupStore',
    items: [
      { href:'/online-store', label:'المنيو الإلكتروني', labelKey:'nav.onlineStore', icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
      { href:'/addons-market', label:'الإضافات', labelKey:'nav.addonsMarket', icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    ]
  },
  {
    label: 'الفروع والموردين', labelKey: 'nav.groupBranchesSuppliers',
    items: [
      { href:'/branches', label:'إدارة الفروع', labelKey:'nav.branches', icon:'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4' },
      { href:'/branch-compare', label:'مقارنة الفروع', labelKey:'nav.branchCompare', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { href:'/suppliers',  label:'الموردين', labelKey:'nav.suppliers', icon:'M3 7h13l3 5v5h-3m-10 0H3v-7m13-3v10m-13 0a2 2 0 104 0m-4 0a2 2 0 114 0m9 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
      { href:'/marketplace', label:'موردون معتمدون', labelKey:'nav.marketplace', icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    ]
  },
  {
    label: 'أدوات متقدمة', labelKey: 'nav.groupAdvancedTools',
    items: [
      { href:'/ai-tools',   label:'أدوات الذكاء', labelKey:'nav.aiTools', icon:'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z' },
      { href:'/profitability', label:'الربحية', labelKey:'nav.profitability', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    ]
  },
  {
    label: 'إدارة حسابك', labelKey: 'nav.groupAccount',
    items: [
      { href:'/settings',   label:'الإعدادات', labelKey:'nav.settings', icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { href:'https://wa.me/966594351667?text=أحتاج مساعدة في Storely', label:'الدعم الفني', labelKey:'nav.support', icon:'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347' },
    ]
  },
]

const NAV_MAIN = NAV_GROUPS.flatMap(g=>g.items)
const NAV_MORE: {href:string;label:string;labelKey:string;icon:string}[] = []

let _cache: any = null

function Icon({ d, size=20, stroke='currentColor', width=2 }: { d:string; size?:number; stroke?:string; width?:number }) {
  return (
    <svg width={size} height={size} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      {d.split(' M').map((p,i)=><path key={i} d={(i===0?'':' M')+p}/>)}
    </svg>
  )
}

// لا نضيف شيء هنا — الإشعار سيكون في الداشبورد مباشرة
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang } = useTranslation()
  const [orgName, setOrgName]       = useState('')
  const [subDaysLeft, setSubDaysLeft] = useState<number|null>(null)
  const [orgLogo, setOrgLogo]       = useState<string|null>(null)
  const [hasMenuAddon, setHasMenuAddon] = useState(false)
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
  const [orgMaxBranches, setOrgMaxBranches] = useState<number>(1)
  const [userRole, setUserRole]     = useState<string>('owner')
  const [managerPermissions, setManagerPermissions] = useState<Record<string,boolean>|null>(null)
  const [showMore, setShowMore]     = useState(false)
  const [showBranch, setShowBranch] = useState(false)
  const [branchLowCounts, setBranchLowCounts] = useState<Record<string, number>>({})
  const [ready, setReady]           = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [showWaInvite, setShowWaInvite] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentSaving, setConsentSaving] = useState(false)
  const [showMaintenance, setShowMaintenance] = useState(false)
  const [showEnableNotif, setShowEnableNotif] = useState(false)
  const [enablingPush, setEnablingPush] = useState(false)
  const [maintenanceMsg, setMaintenanceMsg] = useState('')
  const [showTermsConsent, setShowTermsConsent] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)
  const [termsSaving, setTermsSaving] = useState(false)
  const [profileId, setProfileId] = useState('')
  const [onboardingStep, setOnboardingStep] = useState(0)
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
    const meRes = getMeResult()
    try {
      const ms = await fetch('/api/platform-settings').then(r=>r.json())
      if (ms.maintenanceMode) { setMaintenanceMsg(ms.maintenanceMessage); setShowMaintenance(true); return }
    } catch {}
    const { me, reason } = await meRes
    if(!me){ router.replace(reason==='no_org'?'/pending':'/login'); return }
    const user={id:me.user_id}
    const p:any={ id:me.user_id, full_name:me.full_name, org_id:me.org_id, role:me.role, branch_id:me.branch_id, permissions:me.permissions,
      whatsapp_consent:me.whatsapp_consent, whatsapp_first_contact_confirmed:me.whatsapp_first_contact_confirmed,
      terms_version_accepted:me.terms_version_accepted, organizations:me.org }
    // فحص انتهاء الاشتراك -- بوقت السيرفر عبر api/check-subscription، مو وقت جهاز العميل
    // (وقت المتصفح لو مضبوط غلط كان يقفل حسابات عملاء اشتراكهم فعلياً ساري)
    try {
      const subRes = await fetch(`/api/check-subscription?profile_id=${user.id}`).then(r=>r.json())
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
    if (p.org_id) {
      fetch(`/api/addons-market?org_id=${p.org_id}`).then(r=>r.json()).then(j=>{
        if (j.success) {
          const menuAddon = (j.addons||[]).find((a:any)=>a.slug==='online_menu')
          setHasMenuAddon(!!menuAddon?.subscription?.isValid)
          const hrAddon = (j.addons||[]).find((a:any)=>a.slug==='hr_full')
          setHasHrAddon(!!hrAddon?.subscription?.isValid)
          const profitAddon = (j.addons||[]).find((a:any)=>a.slug==='profitability')
          setHasProfitAddon(!!profitAddon?.subscription?.isValid)
          const aiAddon = (j.addons||[]).find((a:any)=>a.slug==='ai_tools')
          setHasAiAddon(!!aiAddon?.subscription?.isValid)
          const branchAddon = (j.addons||[]).find((a:any)=>a.slug==='extra_branch')
          setHasExtraBranchAddon(!!branchAddon?.subscription?.isValid)
        }
      }).catch(()=>{})
    }
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
        const tv = await fetch('/api/terms-version').then(r=>r.json())
        if(!(p as any).terms_version_accepted || (p as any).terms_version_accepted !== tv.version){ setShowTermsConsent(true) }
      } catch {}
    }
    const orgData=me.org
    const orgPlan=(orgData as any)?.plan||'basic'
    setOrgPlan(orgPlan)
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
        if(typeof Notification !== "undefined" && Notification.permission === "default") {
          setShowEnableNotif(true)
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
        alert("⚠️ متصفحك لا يدعم الإشعارات إطلاقاً")
        setEnablingPush(false); setShowEnableNotif(false); return
      }
      const perm = await Notification.requestPermission()
      if(perm !== "granted") {
        alert(`❌ الإذن لم يُمنح — الحالة: ${perm}`)
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
        alert("✅ تم تفعيل الإشعارات بنجاح!")
      } else {
        alert(`❌ فشل حفظ الاشتراك بالسيرفر: ${data.error || res.status}`)
      }
    } catch(e:any) {
      alert(`❌ خطأ: ${e?.message || e}`)
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

  const PERM_MAP: Record<string,string> = {
    '/inventory':'inventory', '/dispense':'dispense', '/purchases':'purchases',
    '/reports':'reports', '/profitability':'profitability', '/suppliers':'suppliers', '/staff-management':'staff',
  }
  const MANAGER_HIDDEN = ['/branches','/branch-compare','/settings','/ai-tools','/marketplace','/branch-managers','/transfer-stock']
  function navVisible(href:string) {
    if(userRole!=='manager') return true
    if(MANAGER_HIDDEN.includes(href)) return false
    if(PERM_MAP[href]) return !!managerPermissions?.[PERM_MAP[href]]
    return true
  }

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
    const branchPages=['/branches','/branch-compare','/branch-managers','/transfer-stock']
    if(branchPages.includes(href) && orgPlan==='basic' && !hasExtraBranchAddon && orgMaxBranches<=1) return false
    if((href==='/attendance'||href==='/hr-management') && orgPlan==='basic' && !hasHrAddon) return false
    if(href==='/profitability' && orgPlan==='basic' && !hasProfitAddon) return false
    if(href==='/online-store' && !hasMenuAddon) return false
    if(['/branch-compare','/branch-managers','/transfer-stock'].includes(href) && branches.length<=1) return false
    return navVisible(href)
  }
  const visibleGroups = NAV_GROUPS.map(g=>({...g, items:g.items.filter(i=>navAllowed(i.href))})).filter(g=>g.items.length)
  async function signOut(){ await sb.auth.signOut(); _cache=null; sessionStorage.clear(); window.location.href='/login' }

  const banners = (
    <>
      {subDaysLeft!==null && (
        <div className="sh-banner sh-banner-warn">
          <span style={{flex:1}}>
            {subDaysLeft===0?'ينتهي اشتراكك اليوم.':`ينتهي اشتراكك خلال ${subDaysLeft} ${subDaysLeft===1?'يوم':'أيام'}.`} <span className="hide-in-app">جدّد عشان ما يتوقف حسابك.</span>
          </span>
          <button className="sh-btn sh-btn-sm hide-in-app" onClick={()=>router.push('/settings')}>تجديد</button>
        </div>
      )}
      {showEnableNotif && (
        <div className="sh-banner">
          <span style={{flex:1}}>فعّل الإشعارات عشان توصلك تنبيهات نقص المخزون وإقفال الكاشير حتى لو التطبيق مقفول.</span>
          <button className="sh-btn sh-btn-sm sh-btn-primary" onClick={enablePush} disabled={enablingPush}>{enablingPush?'جاري التفعيل...':'تفعيل'}</button>
          <button className="sh-btn sh-btn-sm sh-btn-ghost" onClick={()=>setShowEnableNotif(false)}>لاحقاً</button>
        </div>
      )}
    </>
  )

  if (showMaintenance) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:'32px 28px',maxWidth:420,width:'100%',textAlign:'center'}}>
        <div style={{width:48,height:48,borderRadius:12,background:C.primaryL,color:C.primary,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><Wrench size={22}/></div>
        <div style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:8}}>النظام تحت صيانة مؤقتة</div>
        <div style={{fontSize:14,color:C.text3,lineHeight:1.8}}>{maintenanceMsg}</div>
      </div>
    </div>
  )

  return (
    <>
      {/* موافقة الشروط المحدّثة (المالك فقط) */}
      {showTermsConsent && (
        <div className="sh-overlay" style={{zIndex:3100}}>
          <div className="sh-modal" style={{maxWidth:440}}>
            <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>تحديث على الشروط والأحكام</div>
            <div style={{fontSize:14,color:C.text2,lineHeight:1.8,marginBottom:18}}>حدّثنا الشروط والأحكام وسياسة الخصوصية. وافق عليها عشان تكمل استخدام حسابك.</div>
            <label style={{display:'flex',alignItems:'flex-start',gap:10,fontSize:13,color:C.text2,cursor:'pointer',marginBottom:18,lineHeight:1.7}}>
              <input type="checkbox" checked={termsChecked} onChange={e=>setTermsChecked(e.target.checked)} style={{marginTop:3,width:17,height:17,flexShrink:0,accentColor:C.primary}}/>
              <span>أوافق على <a href="/terms" target="_blank" rel="noopener noreferrer" style={{color:C.primary,fontWeight:600,textDecoration:'underline'}}>الشروط والأحكام</a> و<a href="/privacy" target="_blank" rel="noopener noreferrer" style={{color:C.primary,fontWeight:600,textDecoration:'underline'}}>سياسة الخصوصية</a></span>
            </label>
            <button className="sh-btn sh-btn-primary" style={{width:'100%'}} onClick={acceptTermsConsent} disabled={!termsChecked||termsSaving}>{termsSaving?'جاري الحفظ...':'موافق، متابعة'}</button>
          </div>
        </div>
      )}

      {/* موافقة استلام رسائل واتساب */}
      {showConsent && (
        <div className="sh-overlay" style={{zIndex:3000}}>
          <div className="sh-modal" style={{maxWidth:420}}>
            <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>تنبيهات واتساب</div>
            <div style={{fontSize:14,color:C.text2,lineHeight:1.8,marginBottom:18}}>نرسل لك على واتساب تنبيهات نقص المخزون وإقفال الكاشير اليومي وطلبات التوريد. نحتاج موافقتك قبل الإرسال.</div>
            <label style={{display:'flex',alignItems:'flex-start',gap:10,padding:'12px 14px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,cursor:'pointer',marginBottom:16,fontSize:13,color:C.text2,lineHeight:1.7}}>
              <input type="checkbox" checked={consentChecked} onChange={e=>setConsentChecked(e.target.checked)} style={{marginTop:3,width:17,height:17,flexShrink:0,accentColor:C.primary}}/>
              <span>أوافق على استلام رسائل واتساب من Storely المتعلقة بإدارة منشأتي</span>
            </label>
            <button className="sh-btn sh-btn-primary" style={{width:'100%'}} onClick={acceptConsent} disabled={!consentChecked||consentSaving}>{consentSaving?'جاري الحفظ...':'متابعة'}</button>
          </div>
        </div>
      )}

      {showWaInvite && (
        <div className="sh-overlay" style={{zIndex:3000}}>
          <div className="sh-modal" style={{maxWidth:420}}>
            <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>تفعيل تنبيهات واتساب</div>
            <div style={{fontSize:14,color:C.text2,lineHeight:1.8,marginBottom:18}}>واتساب يطلب إن أول رسالة تكون منك. اضغط "إرسال رسالة التفعيل" (الرسالة جاهزة)، أرسلها، وبعدها ارجع هنا وأكّد.</div>
            <a href="https://wa.me/966594351667?text=أطلب%20تفعيل%20استلام%20تنبيهات%20حسابي%20على%20Storely" target="_blank" rel="noopener noreferrer" className="sh-btn" style={{width:'100%',textDecoration:'none',marginBottom:8}}>إرسال رسالة التفعيل</a>
            <button className="sh-btn sh-btn-primary" style={{width:'100%'}} onClick={confirmWaFirstContact}>أرسلتها، متابعة</button>
          </div>
        </div>
      )}

      {/* اختيار الفرع */}
      {showBranch && branches.length>1 && (
        <div className="sh-overlay sh-sheet-wrap" onClick={()=>setShowBranch(false)}>
          <div className="sh-sheet" onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,borderRadius:99,background:C.border2,margin:'0 auto 16px'}}/>
            <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:12}}>اختر الفرع</div>
            {branches.map((b:any)=>{
              const current = sessionStorage.getItem('s_branch_id')===b.id
              return (
                <div key={b.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <button onClick={()=>selectBranch(b)}
                    style={{flex:1,display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:10,border:`1px solid ${current?C.primary:C.border}`,background:current?C.primaryL:C.surface,cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
                    <Store size={18} color={current?C.primary:C.text4}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:C.text}}>{b.name}</div>
                      {b.location&&<div style={{fontSize:12,color:C.text3}}>{b.location}</div>}
                    </div>
                    {branchLowCounts[b.id]>0&&<span style={{fontSize:12,fontWeight:600,color:C.danger}}>{branchLowCounts[b.id]} ناقص</span>}
                    {current&&<Check size={17} color={C.primary}/>}
                  </button>
                  <button onClick={()=>setConfirmStopBranch(b)} title="إيقاف الفرع" className="sh-icon-btn" style={{border:`1px solid ${C.border}`}}><Pause size={16}/></button>
                </div>
              )
            })}
            <button className="sh-btn" style={{width:'100%',marginTop:4}} onClick={()=>setShowBranch(false)}>إغلاق</button>
          </div>
        </div>
      )}

      {/* تأكيد إيقاف الفرع */}
      {confirmStopBranch && (
        <div className="sh-overlay" style={{zIndex:2100}} onClick={()=>{if(!stoppingBranch)setConfirmStopBranch(null)}}>
          <div className="sh-modal" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:8}}>إيقاف فرع {confirmStopBranch.name}</div>
            <div style={{fontSize:14,color:C.text2,lineHeight:1.8,marginBottom:20}}>يختفي الفرع من القوائم والتقارير. بياناته تبقى محفوظة، وتقدر تفعّله من جديد من صفحة الفروع.</div>
            <div style={{display:'flex',gap:8}}>
              <button className="sh-btn" style={{flex:1}} onClick={()=>setConfirmStopBranch(null)} disabled={stoppingBranch}>إلغاء</button>
              <button className="sh-btn sh-btn-danger" style={{flex:1}} onClick={()=>stopBranch(confirmStopBranch)} disabled={stoppingBranch}>{stoppingBranch?'جاري الإيقاف...':'إيقاف الفرع'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding — أول دخول */}
      {showOnboarding && (() => {
        const steps = [
          { title:'أهلاً بك في Storely', body:'أربع خطوات وتكون جاهز: المنتجات، الموظفين، الموردين، والإشعارات.', go:null },
          { title:'أضف منتجاتك', body:'من صفحة المخزون اضغط "إضافة منتج" وأدخل الاسم والكمية وحد إعادة الطلب.', go:{ href:'/inventory', label:'فتح المخزون' } },
          { title:'أضف موظفيك', body:'من صفحة الموظفين أضف كل موظف برقم جواله، ويدخل برمز PIN خاص فيه.', go:{ href:'/staff-management', label:'فتح الموظفين' } },
          { title:'أضف موردينك', body:'اربط كل منتج بمورده، ويوصل المورد طلب توريد على واتساب لما ينقص الصنف.', go:{ href:'/suppliers', label:'فتح الموردين' } },
          { title:'كل شي جاهز', body:'تقدر تبدأ الحين. الدعم الفني متاح من القائمة لو احتجت أي شي.', go:null },
        ]
        const s = steps[onboardingStep] || steps[0]
        const done = () => { localStorage.setItem('onboarding_done','1'); setShowOnboarding(false) }
        return (
          <div className="sh-overlay" style={{zIndex:9999}}>
            <div className="sh-modal" style={{maxWidth:440}}>
              <div style={{fontSize:12,color:C.text3,fontWeight:600,marginBottom:6}}>الخطوة {onboardingStep+1} من {steps.length}</div>
              <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>{s.title}</div>
              <div style={{fontSize:14,color:C.text2,lineHeight:1.8,marginBottom:20}}>{s.body}</div>
              <div style={{display:'flex',gap:4,marginBottom:20}}>
                {steps.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:99,background:i<=onboardingStep?C.primary:C.border}}/>)}
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {onboardingStep<steps.length-1
                  ? <button className="sh-btn sh-btn-primary" onClick={()=>setOnboardingStep(v=>v+1)}>التالي</button>
                  : <button className="sh-btn sh-btn-primary" onClick={done}>ابدأ</button>}
                {s.go && <button className="sh-btn" onClick={()=>{done();router.push(s.go!.href)}}>{s.go.label}</button>}
                {onboardingStep<steps.length-1 && <button className="sh-btn sh-btn-ghost" style={{marginInlineStart:'auto'}} onClick={done}>تخطي</button>}
              </div>
            </div>
          </div>
        )
      })()}

      {/* More — قائمة الجوال */}
      {showMore && (
        <div className="sh-overlay sh-sheet-wrap" onClick={()=>setShowMore(false)}>
          <div data-no-pull className="sh-sheet" onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,borderRadius:99,background:C.border2,margin:'0 auto 16px'}}/>
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'4px 4px 16px',borderBottom:`1px solid ${C.border}`,marginBottom:8}}>
              <div className="sh-avatar" style={{width:40,height:40,fontSize:15}}>{userInit}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{userName}</div>
                <div style={{fontSize:12,color:C.text3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{orgName}{branchName?` · ${branchName}`:''}</div>
              </div>
              {branches.length>1&&<button className="sh-btn sh-btn-sm" onClick={()=>{setShowMore(false);openBranchSelector()}}>تغيير الفرع</button>}
            </div>
            {visibleGroups.map(g=>(
              <div key={g.labelKey} style={{marginTop:10}}>
                <div className="sh-group-label">{t(g.labelKey)}</div>
                {g.items.map(item=>{
                  const active=isActive(item.href)
                  const external=item.href.startsWith('http')
                  const badge=item.href==='/inventory'?lowCount:item.href==='/notifications'?unread:0
                  return (
                    <button key={item.href} className={`sh-nav${active?' on':''}`}
                      onClick={()=>{ if(external) window.open(item.href,'_blank'); else router.push(item.href); setShowMore(false) }}>
                      <Icon d={item.icon} size={18} width={1.75}/>
                      <span style={{flex:1}}>{t(item.labelKey)}</span>
                      {badge>0&&<span className="sh-count">{badge}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
            <div style={{display:'flex',gap:8,marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
              <button className="sh-btn" style={{flex:1}} onClick={toggleTheme}>{theme==='light'?<Moon size={16}/>:<Sun size={16}/>} {theme==='light'?'الوضع الداكن':'الوضع الفاتح'}</button>
              <button className="sh-btn sh-btn-danger" style={{flex:1}} onClick={signOut}><LogOut size={16}/> تسجيل الخروج</button>
            </div>
          </div>
        </div>
      )}

      <div className="sh-root">
        <style>{SHELL_CSS}</style>

        {/* ═══ الجوال ═══ */}
        <div className="mob-layout">
          <header className="mob-header">
            <img src={orgLogo||'/storely-logo.png'} alt="" className="sh-logo"/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{orgName||'Storely'}</div>
              {branchName&&(
                <button className="sh-branch-inline" onClick={()=>branches.length>1&&openBranchSelector()} disabled={branches.length<2}>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0}}>{branchName}</span>
                  {branches.length>1&&<ChevronDown size={13}/>}
                </button>
              )}
            </div>
            <button className="sh-icon-btn" aria-label="الإشعارات" onClick={()=>router.push('/notifications')}>
              <Bell size={20}/>{unread>0&&<span className="sh-dot"/>}
            </button>
            <button className="sh-avatar" aria-label="حسابي" onClick={()=>setShowMore(true)}>{userInit}</button>
          </header>

          <div className="mob-content">
            {banners}
            {ready ? children : <div className="sh-loading"><span className="sh-spinner"/></div>}
          </div>

          <nav className="mob-bottom-nav">
            {BOT_NAV.filter(item=>navVisible(item.href)).map(item=>{
              const active=isActive(item.href)
              return (
                <button key={item.href} className={`sh-tab${active?' on':''}`} onClick={()=>router.push(item.href)} onMouseEnter={()=>router.prefetch(item.href)}>
                  <span style={{position:'relative',display:'flex'}}>
                    <Icon d={item.icon} size={22} width={active?2:1.75}/>
                    {(item as any).badge>0&&<span className="sh-count sh-count-float">{(item as any).badge}</span>}
                  </span>
                  <span>{t(item.labelKey)}</span>
                </button>
              )
            })}
            <button className="sh-tab" onClick={()=>setShowMore(true)}>
              <span style={{position:'relative',display:'flex'}}>
                <Icon d="M4 6h16M4 12h16M4 18h16" size={22} width={1.75}/>
                {(unread>0||lowCount>0)&&<span className="sh-dot" style={{top:-2,right:-3}}/>}
              </span>
              <span>المزيد</span>
            </button>
          </nav>
        </div>

        {/* ═══ الكمبيوتر ═══ */}
        <div className="desk-layout">
          <aside className="desk-sidebar">
            <div style={{padding:'16px 14px 12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <img src={orgLogo||'/storely-logo.png'} alt="" className="sh-logo"/>
                <div style={{fontSize:14,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0}}>{orgName||'Storely'}</div>
              </div>
              {branchName&&(
                <button className="sh-branch" onClick={()=>branches.length>1&&openBranchSelector()} disabled={branches.length<2}>
                  <Store size={15}/>
                  <span style={{flex:1,textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{branchName}</span>
                  {branches.length>1&&<ChevronDown size={15}/>}
                </button>
              )}
            </div>

            <nav ref={navRef} className="sh-nav-scroll">
              {visibleGroups.map(g=>(
                <div key={g.labelKey} style={{marginBottom:12}}>
                  <div className="sh-group-label">{t(g.labelKey)}</div>
                  {g.items.map(item=>{
                    const active=isActive(item.href)
                    const external=item.href.startsWith('http')
                    const badge=item.href==='/inventory'?lowCount:item.href==='/notifications'?unread:0
                    return (
                      <button key={item.href} className={`sh-nav${active?' on':''}`}
                        onClick={()=>external?window.open(item.href,'_blank'):router.push(item.href)}
                        onMouseEnter={()=>!external&&router.prefetch(item.href)}>
                        <Icon d={item.icon} size={18} width={1.75}/>
                        <span style={{flex:1}}>{t(item.labelKey)}</span>
                        {badge>0&&<span className="sh-count">{badge}</span>}
                      </button>
                    )
                  })}
                </div>
              ))}
            </nav>

            <div style={{padding:'10px 12px',borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10}}>
              <div className="sh-avatar">{userInit}</div>
              <div style={{flex:1,minWidth:0,fontSize:13,fontWeight:600,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userName}</div>
              <button className="sh-icon-btn sh-icon-sm" title={theme==='light'?'الوضع الداكن':'الوضع الفاتح'} onClick={toggleTheme}>{theme==='light'?<Moon size={16}/>:<Sun size={16}/>}</button>
              <button className="sh-icon-btn sh-icon-sm" title="تسجيل الخروج" onClick={signOut}><LogOut size={16}/></button>
            </div>
          </aside>

          <header className="desk-topbar">
            <div style={{fontSize:13,color:C.text3,display:'flex',alignItems:'center',gap:6,minWidth:0}}>
              <span style={{fontWeight:600,color:C.text2}}>{orgName}</span>{branchName&&<><span>/</span><span>{branchName}</span></>}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <button className="sh-icon-btn" title="الدعم الفني" onClick={()=>window.open('https://wa.me/966594351667','_blank')}><HelpCircle size={19}/></button>
              <button className="sh-icon-btn" title="الإعدادات" onClick={()=>router.push('/settings')}><Settings size={19}/></button>
              <button className="sh-icon-btn" title="الإشعارات" onClick={()=>router.push('/notifications')}><Bell size={19}/>{unread>0&&<span className="sh-dot"/>}</button>
            </div>
          </header>

          <main className="desk-content">
            {banners}
            {ready ? children : <div className="sh-loading"><span className="sh-spinner"/></div>}
          </main>
        </div>
      </div>
      <AIAssistant/>
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </LanguageProvider>
  )
}

const SHELL_CSS = `
  .sh-root{font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;direction:rtl;min-height:100vh;background:${C.bg}}
  .sh-root *{box-sizing:border-box}
  @keyframes spin{to{transform:rotate(360deg)}}
  .sh-loading{display:flex;align-items:center;justify-content:center;min-height:60vh}
  .sh-spinner{width:28px;height:28px;border:3px solid ${C.border};border-top-color:${C.primary};border-radius:50%;animation:spin .8s linear infinite}

  .sh-logo{width:32px;height:32px;border-radius:8px;object-fit:cover;border:1px solid ${C.border};background:white;flex-shrink:0}
  .sh-avatar{width:32px;height:32px;border-radius:50%;background:${C.primaryL};color:${C.primary};border:none;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;cursor:pointer;font-family:inherit}
  .sh-icon-btn{position:relative;width:38px;height:38px;border-radius:8px;border:none;background:transparent;color:${C.text3};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
  .sh-icon-btn:hover{background:#f2f4f7;color:${C.text}}
  .sh-icon-sm{width:32px;height:32px}
  .sh-dot{position:absolute;top:8px;right:9px;width:7px;height:7px;border-radius:50%;background:${C.danger};border:1.5px solid white}
  .sh-count{min-width:20px;height:20px;padding:0 6px;border-radius:99px;background:#f2f4f7;color:${C.text2};font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
  .sh-count-float{position:absolute;top:-6px;right:-10px;background:${C.danger};color:white;min-width:17px;height:17px;font-size:10px;border:1.5px solid white}

  .sh-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;border-radius:8px;border:1px solid ${C.border2};background:${C.surface};color:${C.text};font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap}
  .sh-btn:hover:not(:disabled){background:#f9fafb}
  .sh-btn:disabled{opacity:.55;cursor:not-allowed}
  .sh-btn-sm{padding:6px 11px;font-size:12.5px}
  .sh-btn-primary{background:${C.primary};border-color:${C.primary};color:white}
  .sh-btn-primary:hover:not(:disabled){background:${C.primaryD}}
  .sh-btn-danger{color:${C.danger};border-color:#fecdca}
  .sh-btn-danger:hover:not(:disabled){background:${C.dangerL}}
  .sh-btn-ghost{border-color:transparent;background:transparent;color:${C.text3}}

  .sh-group-label{font-size:12px;font-weight:600;color:${C.text4};padding:0 10px 6px}
  .sh-nav{width:100%;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;border:none;background:transparent;color:${C.text2};font-size:13.5px;font-weight:500;font-family:inherit;cursor:pointer;text-align:right;margin-bottom:1px}
  .sh-nav svg{color:${C.text4};flex-shrink:0}
  .sh-nav:hover{background:#f2f4f7;color:${C.text}}
  .sh-nav.on{background:${C.primaryL};color:${C.primary};font-weight:600}
  .sh-nav.on svg{color:${C.primary}}
  .sh-nav-scroll{flex:1;overflow-y:auto;padding:4px 10px 12px}

  .sh-branch{margin-top:12px;width:100%;display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid ${C.border};border-radius:8px;background:${C.surface};color:${C.text2};font-size:13px;font-weight:600;font-family:inherit;cursor:pointer}
  .sh-branch:disabled{cursor:default}
  .sh-branch:hover:not(:disabled){border-color:${C.border2};background:#f9fafb}
  .sh-branch-inline{display:inline-flex;align-items:center;gap:3px;max-width:100%;min-width:0;padding:0;border:none;background:none;color:${C.text3};font-size:12px;font-weight:500;font-family:inherit;cursor:pointer}
  .sh-branch-inline:disabled{cursor:default}

  .sh-banner{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;margin-bottom:16px;border-radius:10px;border:1px solid ${C.primaryB};background:${C.primaryL};color:${C.text};font-size:13px}
  .sh-banner-warn{border-color:#fedf89;background:#fffaeb}

  .sh-overlay{position:fixed;inset:0;z-index:1000;background:rgba(16,24,40,.45);display:flex;align-items:center;justify-content:center;padding:20px;font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;direction:rtl}
  .sh-modal{background:${C.surface};border-radius:14px;width:100%;padding:24px;box-shadow:0 20px 40px rgba(16,24,40,.18)}
  .sh-sheet-wrap{align-items:flex-end;padding:0}
  .sh-sheet{background:${C.surface};border-radius:16px 16px 0 0;width:100%;max-width:560px;padding:12px 16px calc(24px + env(safe-area-inset-bottom));max-height:90dvh;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;animation:shUp .22s ease}
  @keyframes shUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}

  /* الجوال */
  .desk-layout{display:none}
  .mob-layout{display:flex;flex-direction:column;min-height:100vh}
  .mob-header{position:fixed;top:0;right:0;left:0;z-index:100;display:flex;align-items:center;gap:10px;height:60px;padding:0 12px 0 14px;background:${C.surface};border-bottom:1px solid ${C.border}}
  .mob-content{flex:1;padding:16px 14px 88px;margin-top:60px}
  .mob-bottom-nav{position:fixed;bottom:0;right:0;left:0;z-index:100;display:flex;background:${C.surface};border-top:1px solid ${C.border};padding-bottom:env(safe-area-inset-bottom)}
  .sh-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:9px 2px 8px;border:none;background:none;color:${C.text4};font-size:11px;font-weight:500;font-family:inherit;cursor:pointer}
  .sh-tab.on{color:${C.primary};font-weight:700}

  /* الكمبيوتر */
  @media(min-width:768px){
    .mob-layout{display:none}
    .desk-layout{display:block;min-height:100vh}
    .desk-sidebar{position:fixed;top:0;right:0;bottom:0;width:244px;display:flex;flex-direction:column;background:${C.surface};border-left:1px solid ${C.border};z-index:100}
    .desk-topbar{position:fixed;top:0;right:244px;left:0;height:56px;z-index:99;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:${C.surface};border-bottom:1px solid ${C.border}}
    .desk-content{margin-right:244px;padding:80px 28px 40px;min-height:100vh;max-width:calc(100vw - 244px)}
  }
`

