'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { isInApp } from '@/lib/inApp'
import { Billing, LS } from '../landing-data'

/** حالة صفحة الهبوط ودوالها — منقولة كما هي من LandingPageClient.tsx */
export function useLanding(initialMarquee?: string[]) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const [billing, setBilling] = useState<Billing>('monthly')
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [form, setForm] = useState({firstName:'',lastName:'',phone:'',email:'',businessName:'',branchCount:''})
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ok:boolean,text:string}|null>(null)
  const [partners, setPartners] = useState<any[]>([])
  const [lang, setLangState] = useState<'ar'|'en'>('ar')
  function t(key: string) { return (LS as any)[key]?.[lang] || key }
  // داخل تطبيق Google Play ما نعرض صفحة التسويق والأسعار — نروح للدخول مباشرة
  useEffect(() => { if (isInApp()) router.replace('/login') }, [router])
  useEffect(() => {
    try {
      const saved = localStorage.getItem('storely_lang')
      if (saved === 'ar' || saved === 'en') setLangState(saved)
    } catch {}
  }, [])
  const [marqueeMsgs, setMarqueeMsgs] = useState<string[]>(initialMarquee || [])
  const hasMarquee = marqueeMsgs.length>0

  useEffect(()=>{
    import('@/lib/supabase/client').then(({createClient})=>{
      createClient().auth.getSession().then(({data:{session}})=>{
        if(session) router.replace('/dashboard')
      })
    })
  },[router])

  useEffect(()=>{
    const fn=()=>setScrolled(window.scrollY>30)
    fn(); window.addEventListener('scroll',fn,{passive:true})
    return ()=>window.removeEventListener('scroll',fn)
  },[])

  useEffect(()=>{
    fetch('/api/partners').then(r=>r.json()).then(d=>setPartners(d.partners||[])).catch(()=>{})
  },[])

  useEffect(()=>{
    if (initialMarquee) return   // جات من الخادم
    fetch('/api/marquee-messages').then(r=>r.json()).then(d=>{
      const msgs = (d.messages||[]).map((m:any)=>m.message)
      if(msgs.length>0) setMarqueeMsgs(msgs)
    }).catch(()=>{})
  },[])

  // ظهور تدريجي للأقسام عند التمرير — المحتوى ظاهر أصلاً لو ما اشتغل الجافاسكربت
  useEffect(()=>{
    const root = rootRef.current
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    root.classList.add('lp-anim')
    const io = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target) } }),{rootMargin:'0px 0px -8% 0px'})
    root.querySelectorAll('.rv').forEach(el=>io.observe(el))
    return ()=>io.disconnect()
  },[])

  async function submitDemoRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) { setSubmitMsg({ok:false,text:'لازم توافق على الشروط والأحكام أولاً'}); return }
    setSubmitting(true); setSubmitMsg(null)
    try {
      const res = await fetch('/api/demo-request', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
      const data = await res.json()
      if (data.success) {
        setSubmitMsg({ok:true,text:'✅ تم إرسال طلبك بنجاح! بنتواصل معك قريباً عبر واتساب'})
        setForm({firstName:'',lastName:'',phone:'',email:'',businessName:'',branchCount:''})
        setAgreed(false)
      } else {
        setSubmitMsg({ok:false,text:data.error || 'حدث خطأ، حاول مرة ثانية'})
      }
    } catch { setSubmitMsg({ok:false,text:'خطأ بالاتصال، حاول مرة ثانية'}) }
    setSubmitting(false)
  }

  const navLinks: [string,string][] = [[t('navHow'),'#how'],[t('navFeatures'),'#features'],[t('navPricing'),'#pricing'],[t('navFaq'),'#faq']]
  const top = hasMarquee ? 36 : 0

  return { billing, setBilling, scrolled, setScrolled, menuOpen, setMenuOpen, form, setForm, agreed, setAgreed, submitting, setSubmitting, submitMsg, setSubmitMsg, partners, setPartners, lang, setLangState, marqueeMsgs, setMarqueeMsgs, router, rootRef, hasMarquee, navLinks, top, t, submitDemoRequest }
}

export type LandingState = ReturnType<typeof useLanding>
