'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { isInApp } from '@/lib/inApp'
import { Check, Play, ArrowLeft, MessageCircle } from 'lucide-react'
import { Billing, PLAN_BRANCHES, PLANS, LS, FAQ_ITEMS, FEATURES, BRANCH_OPTIONS, BRANCH_OPTIONS_EN } from './landing-data'
import { FaqItem } from './landing-components'

// لون لكل ميزة — نفس ألوان صفحات لوحة التحكم
const FEATURE_TONES = [
  ['#0f766e', '#ecfdf8'], ['#128c7e', '#e7f8f3'], ['#7c3aed', '#f5f3ff'], ['#4f46e5', '#eef2ff'], ['#be185d', '#fdf2f8'],
  ['#c2410c', '#fff7ed'], ['#0369a1', '#f0f9ff'], ['#7c3aed', '#f5f3ff'], ['#be185d', '#fdf2f8'],
]

const WA_ICON = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z'

function PhoneVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  return (
    <div className="lp-phone">
      <video src={src} poster={poster} autoPlay muted loop playsInline preload="metadata" aria-label={label} />
    </div>
  )
}

export default function LandingPage() {
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
  const [marqueeMsgs, setMarqueeMsgs] = useState<string[]>([])
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

  return (
    <div ref={rootRef} className="lp" dir="rtl">
      <style>{LP_CSS}</style>

      {/* شريط الإعلانات */}
      {hasMarquee && (
        <div className="lp-marquee">
          <div className="lp-marquee-track">
            {[...Array(2)].map((_,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center'}}>
                {marqueeMsgs.map((m,j)=><span key={j} className="lp-marquee-item">{m}<span style={{opacity:.5}}>•</span></span>)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* القائمة العلوية */}
      <nav className={`lp-nav${scrolled?' on':''}`} style={{top}}>
        <div className="lp-wrap lp-nav-in">
          <a href="#top" className="lp-brand"><img src="/storely-logo.png" alt=""/><span>Storely</span></a>
          <div className="lp-desk lp-links">
            {navLinks.map(([l,h])=><a key={h} href={h}>{l}</a>)}
          </div>
          <div className="lp-desk" style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="lp-btn lp-btn-ghost" onClick={()=>router.push('/login')}>{t('navLogin')}</button>
            <button className="lp-btn lp-btn-dark" onClick={()=>router.push('/login?mode=register')}>{t('navStart')}</button>
          </div>
          <button className="lp-mob lp-burger" aria-label="القائمة" onClick={()=>setMenuOpen(o=>!o)}>{menuOpen?'✕':'☰'}</button>
        </div>
        {menuOpen && (
          <div className="lp-mob-menu">
            {navLinks.map(([l,h])=><a key={h} href={h} onClick={()=>setMenuOpen(false)}>{l}</a>)}
            <button className="lp-btn lp-btn-ghost" onClick={()=>router.push('/login')}>{t('navLogin')}</button>
            <button className="lp-btn lp-btn-dark" onClick={()=>router.push('/login?mode=register')}>{t('navStart')}</button>
          </div>
        )}
      </nav>

      {/* الواجهة */}
      <header id="top" className="lp-hero" style={{paddingTop:top+120}}>
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-hero-text">
            <div className="lp-pill"><span className="lp-dot"/>{t('heroBadge')}</div>
            <h1 className="lp-display">
              {t('heroTitleA')}<br/>{t('heroTitleB')} <em>{t('heroTitleC')}</em>
            </h1>
            <p className="lp-lead">{t('heroSub')}</p>
            <div className="lp-cta-row">
              <button className="lp-btn lp-btn-dark lp-btn-lg" onClick={()=>router.push('/login?mode=register')}>{t('heroStart')} <ArrowLeft size={18}/></button>
              <a className="lp-btn lp-btn-soft lp-btn-lg" href="#how"><span className="lp-play"><Play size={13} fill="currentColor"/></span>{t('heroWatch')}</a>
            </div>
            <ul className="lp-ticks">
              {['heroPoint1','heroPoint2','heroPoint3'].map(k=><li key={k}><Check size={16}/>{t(k)}</li>)}
            </ul>
          </div>

          <div className="lp-hero-media">
            <div className="lp-halo"/>
            <PhoneVideo src="/videos/storely-ad.mp4" poster="/videos/storely-ad.jpg" label="إعلان Storely"/>
            <div className="lp-float lp-float-a">
              <span className="lp-wa"><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d={WA_ICON}/></svg></span>
              <div><b>نقص مخزون: دقيق</b><small>انرسل الطلب للمورد تلقائياً</small></div>
            </div>
            <div className="lp-float lp-float-b"><span className="lp-stamp">✓ مطابق</span><small>إقفال الكاشير اليوم</small></div>
          </div>
        </div>

        {partners.length > 0 && (
          <div className="lp-wrap lp-partners">
            <p>{t('trustedBy')}</p>
            <div>{partners.map((p:any)=><img key={p.id} src={p.logo_url} alt={p.name}/>)}</div>
          </div>
        )}

        <div className="lp-wrap">
          <div className="lp-stats">
            {[['99 '+(lang==='ar'?'ر.س':'SAR'),t('statStart')],['14 '+(lang==='ar'?'يوم':'days'),t('statFree')],['7',t('statLangs')],['24/7',t('statAlerts')]].map(([n,l])=>(
              <div key={l}><strong>{n}</strong><span>{l}</span></div>
            ))}
          </div>
        </div>
      </header>

      {/* القصة — صاحب المنشأة */}
      <section className="lp-section">
        <div className="lp-wrap lp-split">
          <figure className="lp-photo rv">
            <img src="/storely-team.jpg" alt="صاحب منشأة يتابع Storely من اللابتوب"/>
            <figcaption className="lp-note">
              <span className="lp-note-ic">☀️</span>
              <div><b>صباح الخير</b><small>3 أصناف تحتاج إعادة طلب اليوم</small></div>
            </figcaption>
          </figure>
          <div className="lp-copy rv">
            <span className="lp-tag">{t('storyTag')}</span>
            <h2 className="lp-h2">{t('storyTitle')}</h2>
            <p className="lp-body">{t('storyBody')}</p>
            <ul className="lp-list">
              {['storyP1','storyP2','storyP3'].map(k=><li key={k}><span><Check size={14}/></span>{t(k)}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* كيف يشتغل */}
      <section id="how" className="lp-how">
        <div className="lp-wrap lp-split lp-split-rev">
          <div className="lp-copy rv">
            <span className="lp-tag lp-tag-light">{t('howTag')}</span>
            <h2 className="lp-h2" style={{color:'#fff'}}>{t('howTitle')}</h2>
            <ol className="lp-steps">
              {[1,2,3,4].map(n=>(
                <li key={n}>
                  <span className="lp-step-n">0{n}</span>
                  <div><b>{t(`how${n}T`)}</b><p>{t(`how${n}D`)}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="lp-how-media rv">
            <PhoneVideo src="/videos/storely-features.mp4" poster="/videos/storely-features.jpg" label="مميزات Storely"/>
          </div>
        </div>
      </section>

      {/* الموردين */}
      <section className="lp-section">
        <div className="lp-wrap lp-split lp-split-rev">
          <figure className="lp-photo lp-photo-wide rv">
            <img src="/supplier-team.jpg" alt="مورد يسلّم طلبية لصاحب منشأة"/>
            <figcaption className="lp-chat">
              <div className="lp-bubble lp-bubble-out"><b>🟢 Storely</b><br/>طلب توريد: دقيق — 20 كيس</div>
              <div className="lp-bubble">تم ✅ أبشر، بيوصلكم اليوم</div>
            </figcaption>
          </figure>
          <div className="lp-copy rv">
            <span className="lp-tag">{t('supTag')}</span>
            <h2 className="lp-h2">{t('supTitle')}</h2>
            <p className="lp-body">{t('supBody')}</p>
            <a href="#how" className="lp-link">{t('heroWatch')} <ArrowLeft size={16}/></a>
          </div>
        </div>
      </section>

      {/* المميزات */}
      <section id="features" className="lp-section lp-sand">
        <div className="lp-wrap">
          <div className="lp-head rv">
            <span className="lp-tag">{t('featuresTag')}</span>
            <h2 className="lp-h2">{t('featuresTitle')}</h2>
          </div>
          <div className="lp-feats">
            {FEATURES.map((f,i)=>{
              const [fg,bg] = FEATURE_TONES[i % FEATURE_TONES.length]
              return (
                <article key={i} className="lp-feat rv" style={{'--fg':fg,'--bg':bg} as React.CSSProperties}>
                  <span className="lp-feat-ic"><f.icon size={22} strokeWidth={2}/></span>
                  <h3>{lang==='ar'?f.title:(f as any).titleEn}{(f as any).badge && <em>{lang==='ar'?(f as any).badge:(f as any).badgeEn}</em>}</h3>
                  <p>{lang==='ar'?f.desc:(f as any).descEn}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* الأسعار */}
      <section id="pricing" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-head rv">
            <span className="lp-tag">{t('pricingTag')}</span>
            <h2 className="lp-h2">{t('pricingTitle')}</h2>
            <div className="lp-toggle">
              <button className={billing==='monthly'?'on':''} onClick={()=>setBilling('monthly')}>{t('billMonthly')}</button>
              <button className={billing==='yearly'?'on':''} onClick={()=>setBilling('yearly')}>{t('billYearly')} <span>{t('billSave')}</span></button>
            </div>
          </div>
          <div className="lp-plans">
            {PLANS.map((p,i)=>(
              <div key={i} className={`lp-plan rv${p.popular?' pop':''}`}>
                {p.popular && <div className="lp-plan-badge">{t('mostPopular')}</div>}
                <div className="lp-plan-name">{lang==='ar'?p.name:p.nameEn}</div>
                <div className="lp-plan-price"><strong>{billing==='yearly'?p.yearlyPrice:p.price}</strong><span>{lang==='ar'?'ر.س':'SAR'} {billing==='yearly'?t('perYear'):t('perMonth')}</span></div>
                <div className="lp-plan-limits">{(lang==='ar'?p.limits:p.limitsEn).join(' · ')}</div>
                <button onClick={()=>router.push(`/login?mode=register&branches=${PLAN_BRANCHES[i]}&billing=${billing}`)} className={`lp-btn lp-btn-lg ${p.popular?'lp-btn-dark':'lp-btn-line'}`} style={{width:'100%'}}>{t('startNow')}</button>
                <ul>
                  {(lang==='ar'?p.features:p.featuresEn).map((f,j)=><li key={j}><Check size={15}/>{f}</li>)}
                </ul>
                {(p as any).addonNote && <div className="lp-plan-note">{lang==='ar'?(p as any).addonNote:(p as any).addonNoteEn}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* طلب عرض النظام */}
      <section id="demo" className="lp-section lp-sand">
        <div className="lp-wrap lp-demo rv">
          <div className="lp-demo-side">
            <img src="/storely-logo.png" alt=""/>
            <h3>{t('demoSideTitle')}</h3>
            <p>{t('demoSideSub')}</p>
            <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer" className="lp-btn lp-btn-wa">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d={WA_ICON}/></svg>{t('ctaContact')}
            </a>
          </div>
          <form onSubmit={submitDemoRequest} className="lp-demo-form">
            <h2>{t('demoTitle')}</h2>
            <p>{t('demoSub')}</p>
            {submitMsg && <div className={`lp-msg ${submitMsg.ok?'ok':'err'}`}>{submitMsg.text}</div>}
            <div className="lp-fields">
              <label>{t('demoFirstName')}<input required value={form.firstName} onChange={e=>setForm(f=>({...f,firstName:e.target.value}))}/></label>
              <label>{t('demoLastName')}<input required value={form.lastName} onChange={e=>setForm(f=>({...f,lastName:e.target.value}))}/></label>
              <label className="full">{t('demoPhone')}<input required type="tel" dir="ltr" placeholder="05xxxxxxxx" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></label>
              <label className="full">{t('demoEmail')}<input required type="email" dir="ltr" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></label>
              <label>{t('demoBusiness')}<input required value={form.businessName} onChange={e=>setForm(f=>({...f,businessName:e.target.value}))}/></label>
              <label>{t('demoBranches')}
                <select value={form.branchCount} onChange={e=>setForm(f=>({...f,branchCount:e.target.value}))}>
                  <option value="">{t('demoPleaseSelect')}</option>
                  {(lang==='ar'?BRANCH_OPTIONS:BRANCH_OPTIONS_EN).map((o,oi)=><option key={o} value={BRANCH_OPTIONS[oi]}>{o}</option>)}
                </select>
              </label>
            </div>
            <label className="lp-agree">
              <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>
              <span>{t('demoAgree')} <a href="/terms" target="_blank">{t('demoTerms')}</a> {t('demoAnd')}<a href="/privacy" target="_blank">{t('demoPrivacy')}</a></span>
            </label>
            <button type="submit" disabled={submitting} className="lp-btn lp-btn-dark lp-btn-lg" style={{width:'100%'}}>{submitting?t('demoSending'):t('demoSubmit')}</button>
          </form>
        </div>
      </section>

      {/* الأسئلة */}
      <section id="faq" className="lp-section">
        <div className="lp-wrap" style={{maxWidth:760}}>
          <div className="lp-head rv">
            <span className="lp-tag">{t('faqTag')}</span>
            <h2 className="lp-h2">{t('faqTitle')}</h2>
          </div>
          <div className="lp-faq rv">
            {FAQ_ITEMS.map((f,i)=><FaqItem key={i} q={lang==='ar'?f.q:f.qEn} a={lang==='ar'?f.a:f.aEn}/>)}
          </div>
        </div>
      </section>

      {/* الدعوة الأخيرة */}
      <section className="lp-wrap">
        <div className="lp-cta rv">
          <h2>{t('ctaTitle')}</h2>
          <p>{t('ctaSub')}</p>
          <div className="lp-cta-row" style={{justifyContent:'center'}}>
            <button className="lp-btn lp-btn-white lp-btn-lg" onClick={()=>router.push('/login?mode=register')}>{t('ctaRegister')} <ArrowLeft size={18}/></button>
            <a className="lp-btn lp-btn-glass lp-btn-lg" href="https://wa.me/966594351667" target="_blank" rel="noreferrer"><MessageCircle size={18}/>{t('ctaContact')}</a>
          </div>
        </div>
      </section>

      {/* التذييل */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-foot-grid">
            <div>
              <div className="lp-brand" style={{color:'#fff'}}><img src="/storely-logo.png" alt=""/><span>Storely</span></div>
              <p className="lp-foot-tag">{t('footerTagline')}</p>
            </div>
            {[
              {title:t('footerPlatform'),links:[[t('footerLogin'),'/login'],[t('footerSignup'),'/login?mode=register'],[t('footerPricing'),'#pricing']]},
              {title:t('footerLegal'),links:[[t('footerPrivacy'),'/privacy'],[t('footerTerms'),'/terms'],[t('footerSecurity'),'/security']]},
              {title:t('footerContact'),links:[[t('footerWhatsapp'),'https://wa.me/966594351667'],[t('footerEmail'),'mailto:support@storely.dev']]},
            ].map((col,i)=>(
              <div key={i}>
                <div className="lp-foot-title">{col.title}</div>
                {col.links.map(([l,h])=><a key={l} href={h} className="lp-foot-link">{l}</a>)}
              </div>
            ))}
          </div>
          <div className="lp-foot-bottom">
            <div>
              <div>{t('footerRights')} {new Date().getFullYear()} ©</div>
              <small>{lang==='ar'?'مؤسسة باسم علي خلوي لتقنية المعلومات، رقم السجل التجاري 7055023522':'Basim Ali Khulwi Information Technology Est., Commercial Registration No. 7055023522'}</small>
            </div>
            <div dir="ltr">storely.dev</div>
          </div>
        </div>
      </footer>

      {/* واتساب */}
      <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer" className="lp-wa-float" aria-label="تواصل عبر واتساب">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d={WA_ICON}/></svg>
      </a>
    </div>
  )
}

const LP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Noto+Naskh+Arabic:wght@500;600;700&display=swap');
.lp{--ink:#14201f;--ink2:#3d4a48;--ink3:#6b7775;--line:#e7e2d8;--cream:#faf8f3;--sand:#f3eee4;--teal:#0b3b3a;--teal2:#0f766e;--mint:#5eead4;
  font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;background:var(--cream);color:var(--ink);overflow-x:hidden}
.lp *{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
.lp a{color:inherit}
.lp-wrap{max-width:1180px;margin:0 auto;padding:0 28px}
.lp-display,.lp-h2,.lp-cta h2{font-family:'Noto Naskh Arabic','IBM Plex Sans Arabic',serif;font-weight:700;letter-spacing:-.3px}

/* الأزرار */
.lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 18px;border-radius:999px;font:600 14px/1 'IBM Plex Sans Arabic',sans-serif;border:1px solid transparent;cursor:pointer;text-decoration:none;transition:transform .15s,background .2s,border-color .2s,color .2s;white-space:nowrap}
.lp-btn:active{transform:scale(.98)}
.lp-btn-lg{padding:15px 26px;font-size:15.5px}
.lp-btn-dark{background:var(--teal);color:#fff}
.lp-btn-dark:hover{background:#082e2d}
.lp-btn-ghost{background:transparent;color:var(--ink)}
.lp-btn-ghost:hover{background:rgba(20,32,31,.06)}
.lp-btn-soft{background:#fff;color:var(--ink);border-color:var(--line)}
.lp-btn-soft:hover{border-color:#cfc7b8}
.lp-btn-line{background:#fff;color:var(--ink);border-color:var(--line)}
.lp-btn-line:hover{border-color:var(--teal2);color:var(--teal2)}
.lp-btn-white{background:#fff;color:var(--teal)}
.lp-btn-glass{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.28)}
.lp-btn-glass:hover{background:rgba(255,255,255,.16)}
.lp-btn-wa{background:#25d366;color:#fff;margin-top:22px}
.lp-play{width:26px;height:26px;border-radius:50%;background:var(--teal);color:#fff;display:grid;place-items:center}

/* شريط الإعلانات */
.lp-marquee{position:fixed;top:0;right:0;left:0;z-index:1001;height:36px;background:var(--teal);overflow:hidden;display:flex;align-items:center}
.lp-marquee-track{display:flex;white-space:nowrap;animation:lpMarquee 35s linear infinite}
.lp-marquee-item{color:#fff;font-size:13px;font-weight:600;padding:0 24px;display:flex;align-items:center;gap:8px}
@keyframes lpMarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* القائمة */
.lp-nav{position:fixed;right:0;left:0;z-index:1000;transition:background .3s,box-shadow .3s,backdrop-filter .3s}
.lp-nav.on{background:rgba(250,248,243,.86);backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);box-shadow:0 1px 0 var(--line)}
.lp-nav-in{height:70px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.lp-brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:700;font-size:19px;color:var(--ink)}
.lp-brand img{width:36px;height:36px;border-radius:10px;background:#fff;object-fit:cover}
.lp-links{display:flex;gap:30px}
.lp-links a{text-decoration:none;font-size:14.5px;color:var(--ink2);font-weight:500}
.lp-links a:hover{color:var(--teal2)}
.lp-burger{background:none;border:none;font-size:24px;cursor:pointer;color:var(--ink)}
.lp-mob-menu{background:var(--cream);border-top:1px solid var(--line);padding:18px 28px 24px;display:flex;flex-direction:column;gap:10px;box-shadow:0 20px 30px -20px rgba(0,0,0,.2)}
.lp-mob-menu a{text-decoration:none;font-size:16px;padding:10px 0;border-bottom:1px solid var(--line)}

/* الواجهة */
.lp-hero{position:relative;padding-bottom:40px;background:radial-gradient(900px 500px at 15% 10%,rgba(94,234,212,.18),transparent 60%),radial-gradient(700px 400px at 90% 90%,rgba(243,226,196,.6),transparent 60%)}
.lp-hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:56px;align-items:center}
.lp-pill{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:7px 16px;font-size:13px;font-weight:600;color:var(--ink2);margin-bottom:26px}
.lp-dot{width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.15)}
.lp-display{position:relative;z-index:0;font-size:62px;line-height:1.28;color:var(--ink);margin-bottom:22px}
.lp-display em{font-style:normal;color:var(--teal2);position:relative;white-space:nowrap}
.lp-display em::after{content:'';position:absolute;right:0;left:0;bottom:6px;height:12px;background:rgba(94,234,212,.35);border-radius:6px;z-index:-1}
.lp-lead{font-size:18px;line-height:1.9;color:var(--ink2);max-width:560px;margin-bottom:34px}
.lp-cta-row{display:flex;gap:12px;flex-wrap:wrap}
.lp-ticks{list-style:none;display:flex;gap:22px;flex-wrap:wrap;margin-top:30px}
.lp-ticks li{display:flex;align-items:center;gap:7px;font-size:14px;color:var(--ink3)}
.lp-ticks svg{color:var(--teal2)}
.lp-hero-media{position:relative;display:flex;justify-content:center;padding:20px 0}
.lp-halo{position:absolute;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,#0f766e 0%,#0b3b3a 70%);top:50%;left:50%;transform:translate(-50%,-50%);opacity:.95}
.lp-halo::before{content:'';position:absolute;inset:-34px;border-radius:50%;border:1px dashed rgba(15,118,110,.35)}
.lp-phone{position:relative;width:290px;aspect-ratio:9/19.2;border-radius:44px;background:#0b1413;padding:10px;box-shadow:0 50px 80px -40px rgba(11,59,58,.7),0 0 0 1px rgba(255,255,255,.06) inset;transform:rotate(-3deg)}
.lp-phone video{width:100%;height:100%;object-fit:cover;border-radius:35px;display:block;background:#0b3b3a}
.lp-float{position:absolute;background:#fff;border-radius:18px;padding:12px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 24px 40px -20px rgba(20,32,31,.35);border:1px solid var(--line);animation:lpBob 6s ease-in-out infinite}
.lp-float b{display:block;font-size:14px}
.lp-float small{display:block;font-size:12px;color:var(--ink3);margin-top:2px}
.lp-float-a{top:12%;left:-6%}
.lp-float-b{bottom:10%;right:-4%;flex-direction:column;align-items:flex-start;gap:6px;animation-delay:-3s}
.lp-wa{width:38px;height:38px;border-radius:12px;background:#25d366;display:grid;place-items:center;flex-shrink:0}
.lp-stamp{font-weight:700;color:#047857;border:2px solid #047857;border-radius:10px;padding:3px 12px;transform:rotate(-4deg);font-size:15px}
@keyframes lpBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.lp-partners{text-align:center;margin-top:56px}
.lp-partners p{font-size:12.5px;color:var(--ink3);margin-bottom:18px}
.lp-partners>div{display:flex;flex-wrap:wrap;gap:14px;justify-content:center}
.lp-partners img{height:54px;max-width:150px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 18px}
.lp-stats{display:grid;grid-template-columns:repeat(4,1fr);margin-top:64px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.lp-stats>div{padding:24px 10px;text-align:center;border-left:1px solid var(--line)}
.lp-stats>div:last-child{border-left:none}
.lp-stats strong{display:block;font-family:'Noto Naskh Arabic',serif;font-size:30px;color:var(--teal)}
.lp-stats span{font-size:13px;color:var(--ink3)}

/* الأقسام */
.lp-section{padding:110px 0}
.lp-sand{background:var(--sand)}
.lp-head{text-align:center;max-width:680px;margin:0 auto 54px}
.lp-tag{display:inline-block;font-size:13px;font-weight:700;color:var(--teal2);background:rgba(15,118,110,.08);border-radius:999px;padding:6px 14px;margin-bottom:16px}
.lp-tag-light{color:var(--mint);background:rgba(94,234,212,.12)}
.lp-h2{font-size:42px;line-height:1.35;color:var(--ink);margin-bottom:18px}
.lp-body{font-size:17px;line-height:1.95;color:var(--ink2);margin-bottom:26px}
.lp-split{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center}
.lp-split-rev>:first-child{order:2}
.lp-photo{position:relative;border-radius:30px}
.lp-photo img{width:100%;aspect-ratio:4/3.4;object-fit:cover;border-radius:30px;display:block;box-shadow:0 40px 70px -40px rgba(20,32,31,.45)}
.lp-photo-wide img{aspect-ratio:4/3.2;object-position:35% center}
.lp-note{position:absolute;bottom:-26px;left:28px;background:#fff;border-radius:20px;padding:14px 18px;display:flex;gap:12px;align-items:center;box-shadow:0 24px 40px -18px rgba(20,32,31,.35);border:1px solid var(--line)}
.lp-note-ic{width:42px;height:42px;border-radius:13px;background:#fff7ed;display:grid;place-items:center;font-size:20px}
.lp-note b{display:block;font-size:15px}
.lp-note small{font-size:12.5px;color:var(--ink3)}
.lp-list{list-style:none;display:flex;flex-direction:column;gap:14px}
.lp-list li{display:flex;gap:12px;align-items:center;font-size:16px;color:var(--ink)}
.lp-list li>span{width:26px;height:26px;border-radius:50%;background:rgba(15,118,110,.1);color:var(--teal2);display:grid;place-items:center;flex-shrink:0}
.lp-link{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--teal2);text-decoration:none}
.lp-link:hover{gap:10px}
.lp-chat{position:absolute;bottom:22px;right:22px;left:22px;display:flex;flex-direction:column;gap:8px;max-width:300px;margin-right:auto}
.lp-bubble{background:#fff;border-radius:16px 16px 16px 4px;padding:10px 14px;font-size:13.5px;line-height:1.6;box-shadow:0 12px 24px -12px rgba(0,0,0,.3);align-self:flex-start}
.lp-bubble-out{background:#d9fdd3;border-radius:16px 16px 4px 16px;align-self:flex-end}

/* كيف يشتغل */
.lp-how{background:radial-gradient(700px 500px at 20% 30%,rgba(94,234,212,.12),transparent 60%),var(--teal);color:#fff;padding:110px 0;margin:0 20px;border-radius:40px}
.lp-how-media{display:flex;justify-content:center}
.lp-how .lp-phone{transform:rotate(2deg);box-shadow:0 50px 90px -30px rgba(0,0,0,.6)}
.lp-steps{list-style:none;display:flex;flex-direction:column;gap:6px;margin-top:10px}
.lp-steps li{display:flex;gap:18px;padding:18px 0;border-bottom:1px solid rgba(255,255,255,.1)}
.lp-steps li:last-child{border-bottom:none}
.lp-step-n{font-family:'Noto Naskh Arabic',serif;font-size:26px;color:var(--mint);min-width:40px;line-height:1.3}
.lp-steps b{font-size:18px;display:block;margin-bottom:4px}
.lp-steps p{font-size:15px;line-height:1.8;color:rgba(255,255,255,.72)}

/* المميزات */
.lp-feats{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.lp-feat{background:#fff;border:1px solid var(--line);border-radius:24px;padding:28px;transition:transform .2s,box-shadow .2s,border-color .2s}
.lp-feat:hover{transform:translateY(-3px);box-shadow:0 22px 40px -26px rgba(20,32,31,.35);border-color:#dcd4c5}
.lp-feat-ic{width:48px;height:48px;border-radius:15px;background:var(--bg);color:var(--fg);display:grid;place-items:center;margin-bottom:18px}
.lp-feat h3{font-size:18px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.lp-feat h3 em{font-style:normal;font-size:11px;font-weight:700;color:var(--fg);background:var(--bg);padding:3px 9px;border-radius:99px}
.lp-feat p{font-size:14.5px;line-height:1.85;color:var(--ink3)}

/* الأسعار */
.lp-toggle{display:inline-flex;gap:4px;background:#fff;border:1px solid var(--line);padding:4px;border-radius:999px;margin-top:6px}
.lp-toggle button{border:none;background:none;padding:9px 20px;border-radius:999px;font:600 14px 'IBM Plex Sans Arabic',sans-serif;color:var(--ink3);cursor:pointer;display:flex;align-items:center;gap:6px}
.lp-toggle button.on{background:var(--teal);color:#fff}
.lp-toggle button span{font-size:11px;background:rgba(94,234,212,.25);color:inherit;padding:2px 8px;border-radius:99px}
.lp-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:start}
.lp-plan{position:relative;background:#fff;border:1px solid var(--line);border-radius:28px;padding:30px}
.lp-plan.pop{background:var(--teal);color:#fff;border-color:var(--teal);box-shadow:0 40px 70px -40px rgba(11,59,58,.7)}
.lp-plan-badge{position:absolute;top:-13px;right:28px;background:var(--mint);color:var(--teal);font-size:12px;font-weight:700;padding:5px 14px;border-radius:99px}
.lp-plan-name{font-size:17px;font-weight:700;margin-bottom:12px}
.lp-plan-price{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.lp-plan-price strong{font-family:'Noto Naskh Arabic',serif;font-size:46px;line-height:1}
.lp-plan-price span{font-size:14px;opacity:.65}
.lp-plan-limits{font-size:13.5px;opacity:.7;margin-bottom:22px}
.lp-plan ul{list-style:none;display:flex;flex-direction:column;gap:11px;margin-top:24px;padding-top:22px;border-top:1px solid var(--line)}
.lp-plan.pop ul{border-color:rgba(255,255,255,.14)}
.lp-plan li{display:flex;gap:9px;align-items:flex-start;font-size:14px;line-height:1.5}
.lp-plan li svg{color:var(--teal2);flex-shrink:0;margin-top:2px}
.lp-plan.pop li svg{color:var(--mint)}
.lp-plan.pop .lp-btn-dark{background:#fff;color:var(--teal)}
.lp-plan-note{margin-top:20px;background:var(--sand);border-radius:14px;padding:12px 14px;font-size:12.5px;line-height:1.7;color:var(--ink2)}

/* طلب العرض */
.lp-demo{display:grid;grid-template-columns:.8fr 1.2fr;background:#fff;border-radius:34px;overflow:hidden;border:1px solid var(--line);box-shadow:0 40px 80px -50px rgba(20,32,31,.4);padding:0}
.lp-demo-side{background:radial-gradient(400px 300px at 80% 0%,rgba(94,234,212,.18),transparent 60%),var(--teal);color:#fff;padding:48px 40px;display:flex;flex-direction:column;justify-content:center}
.lp-demo-side img{width:56px;height:56px;border-radius:16px;background:#fff;margin-bottom:24px}
.lp-demo-side h3{font-family:'Noto Naskh Arabic',serif;font-size:28px;line-height:1.5;margin-bottom:14px}
.lp-demo-side p{font-size:15px;line-height:1.9;color:rgba(255,255,255,.75)}
.lp-demo-side .lp-btn-wa{align-self:flex-start}
.lp-demo-form{padding:44px}
.lp-demo-form h2{font-size:24px;font-weight:700;margin-bottom:6px}
.lp-demo-form>p{font-size:14.5px;color:var(--ink3);margin-bottom:24px}
.lp-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
.lp-fields label{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:600;color:var(--ink2)}
.lp-fields .full{grid-column:1/-1}
.lp-fields input,.lp-fields select{width:100%;padding:13px 15px;border:1px solid var(--line);border-radius:14px;font:15px 'IBM Plex Sans Arabic',sans-serif;background:var(--cream);outline:none;transition:border-color .2s,box-shadow .2s;color:var(--ink)}
.lp-fields input:focus,.lp-fields select:focus{border-color:var(--teal2);box-shadow:0 0 0 4px rgba(15,118,110,.1);background:#fff}
.lp-agree{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--ink3);margin-bottom:20px;cursor:pointer;line-height:1.6}
.lp-agree input{margin-top:4px;accent-color:var(--teal2)}
.lp-agree a{color:var(--teal2)}
.lp-msg{border-radius:12px;padding:11px 14px;margin-bottom:16px;font-size:13.5px;font-weight:600}
.lp-msg.ok{background:#ecfdf5;color:#047857}
.lp-msg.err{background:#fef2f2;color:#dc2626}

/* الأسئلة */
.lp-faq{background:#fff;border:1px solid var(--line);border-radius:26px;padding:6px 28px}
.lp-faq>div:last-child{border-bottom:none!important}

/* الدعوة */
.lp-cta{text-align:center;color:#fff;border-radius:40px;padding:84px 28px;margin-bottom:90px;background:radial-gradient(600px 300px at 50% 0%,rgba(94,234,212,.25),transparent 70%),linear-gradient(160deg,#0f5c59,#0b3b3a 60%,#072a29)}
.lp-cta h2{font-size:44px;line-height:1.4;margin-bottom:14px}
.lp-cta p{font-size:17px;color:rgba(255,255,255,.75);margin-bottom:34px}

/* التذييل */
.lp-footer{background:#072a29;color:#fff;padding:64px 0 30px}
.lp-foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:44px}
.lp-foot-tag{font-size:14px;color:rgba(255,255,255,.65);line-height:1.8;max-width:260px;margin-top:14px}
.lp-foot-title{font-size:13px;font-weight:700;color:rgba(255,255,255,.5);margin-bottom:14px}
.lp-foot-link{display:block;text-decoration:none;font-size:14.5px;color:rgba(255,255,255,.88);margin-bottom:10px}
.lp-foot-link:hover{color:var(--mint)}
.lp-foot-bottom{border-top:1px solid rgba(255,255,255,.1);padding-top:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;font-size:13px}
.lp-foot-bottom small{display:block;color:rgba(255,255,255,.45);margin-top:6px;font-size:11.5px}
.lp-wa-float{position:fixed;bottom:24px;left:24px;z-index:999;width:56px;height:56px;border-radius:50%;background:#25d366;display:grid;place-items:center;box-shadow:0 12px 26px -8px rgba(37,211,102,.55);transition:transform .2s}
.lp-wa-float:hover{transform:scale(1.08)}

/* الظهور عند التمرير */
.lp-anim .rv{opacity:0;transform:translateY(26px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}
.lp-anim .rv.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.lp-float{animation:none}.lp-marquee-track{animation-duration:80s}}

/* الشاشات */
.lp-mob{display:none}
@media(max-width:980px){
  .lp-hero-grid,.lp-split{grid-template-columns:1fr;gap:48px}
  .lp-split-rev>:first-child{order:0}
  .lp-display{font-size:46px}
  .lp-h2{font-size:34px}
  .lp-feats,.lp-plans{grid-template-columns:1fr 1fr}
  .lp-demo{grid-template-columns:1fr}
  .lp-foot-grid{grid-template-columns:1fr 1fr}
}
@media(max-width:720px){
  .lp-desk{display:none!important}
  .lp-mob{display:block}
  .lp-wrap{padding:0 18px}
  .lp-display{font-size:36px}
  .lp-lead{font-size:16px}
  .lp-h2{font-size:29px}
  .lp-section,.lp-how{padding:72px 0}
  .lp-how{margin:0 10px;border-radius:28px}
  .lp-feats,.lp-plans{grid-template-columns:1fr}
  .lp-stats{grid-template-columns:1fr 1fr}
  .lp-stats>div:nth-child(2){border-left:none}
  .lp-stats>div:nth-child(-n+2){border-bottom:1px solid var(--line)}
  .lp-halo{width:300px;height:300px}
  .lp-phone{width:240px}
  .lp-float-a{left:0;top:4%}
  .lp-float-b{right:0}
  .lp-fields{grid-template-columns:1fr}
  .lp-demo-form,.lp-demo-side{padding:30px 22px}
  .lp-cta{border-radius:28px;padding:60px 20px}
  .lp-cta h2{font-size:32px}
  .lp-cta-row .lp-btn{width:100%}
  .lp-foot-grid{grid-template-columns:1fr}
  .lp-note{left:14px;bottom:-22px}
}
`
