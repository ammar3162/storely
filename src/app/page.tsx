'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const PLANS = [
  { name: 'الأساسية', price: '149', color: '#16a34a', popular: false, badge: '',
    limits: { branches: '1 فرع', staff: '2 موظفين', suppliers: '3 موردين' },
    features: [
      { label: 'تتبع المخزون', ok: true },
      { label: 'تنبيهات واتساب', ok: true },
      { label: 'تقارير أساسية', ok: true },
      { label: 'تقارير متقدمة', ok: false },
      { label: 'دعم ذو أولوية', ok: false },
      { label: 'دعم 24/7', ok: false },
    ]
  },
  { name: 'المتوسطة', price: '249', color: '#2563eb', popular: true, badge: 'الأكثر طلباً',
    limits: { branches: '3 فروع', staff: '10 موظفين', suppliers: '10 موردين' },
    features: [
      { label: 'تتبع المخزون', ok: true },
      { label: 'تنبيهات واتساب', ok: true },
      { label: 'تقارير أساسية', ok: true },
      { label: 'تقارير متقدمة', ok: true },
      { label: 'دعم ذو أولوية', ok: true },
      { label: 'دعم 24/7', ok: false },
    ]
  },
  { name: 'المتقدمة', price: '399', color: '#7c3aed', popular: false, badge: 'للسلاسل',
    limits: { branches: 'غير محدود', staff: 'غير محدود', suppliers: 'غير محدود' },
    features: [
      { label: 'تتبع المخزون', ok: true },
      { label: 'تنبيهات واتساب', ok: true },
      { label: 'تقارير أساسية', ok: true },
      { label: 'تقارير متقدمة', ok: true },
      { label: 'دعم ذو أولوية', ok: true },
      { label: 'دعم 24/7', ok: true },
    ]
  },
]

const FEATURES = [
  { icon: '📦', title: 'تتبع لحظي', desc: 'راقب كل صنف في الوقت الحقيقي مع تحديثات فورية عند كل صرف أو شراء', color: '#16a34a' },
  { icon: '📲', title: 'واتساب تلقائي', desc: 'تنبيهات فورية لك وللمورد لما يوصل أي صنف للحد الأدنى — بدون أي تدخل', color: '#25d366' },
  { icon: '👥', title: 'إدارة الموظفين', desc: 'كل موظف برمز PIN خاص يصرف من المخزون بدون وصول لبياناتك الحساسة', color: '#2563eb' },
  { icon: '🌍', title: '7 لغات', desc: 'واجهة موظفين بالعربي والإنجليزي والأردو والهندي والتاغالوغ والبنغالي والفرنسي', color: '#7c3aed' },
  { icon: '📊', title: 'تقارير ذكية', desc: 'تقارير الصرف والمشتريات والجرد — صدّرها بـ CSV بضغطة واحدة في أي وقت', color: '#d97706' },
  { icon: '🏪', title: 'متعدد الفروع', desc: 'أدر جميع فروعك من لوحة تحكم واحدة مع مخزون مستقل لكل فرع', color: '#0891b2' },
]

const TESTIMONIALS = [
  { name: 'أحمد العتيبي', role: 'صاحب مطعم — الرياض', text: 'قبل Storely كنت أعرف نقص المواد بعد ما تنتهي. الحين يجيني واتساب قبل أي نقص بوقت كافي.', avatar: 'أ' },
  { name: 'سارة المطيري', role: 'مديرة سلسلة كافيهات — جدة', text: 'ثلاث فروع تحت عيني من جوالي. التقارير اليومية وفّرت علي ساعات من المتابعة اليدوية.', avatar: 'س' },
  { name: 'خالد الشمري', role: 'صاحب صيدلية — الدمام', text: 'الموظفين الأجانب يستخدمون النظام بلغتهم بدون أي مشكلة. أفضل قرار اتخذته.', avatar: 'خ' },
]

const BUSINESSES = ['🍔 مطاعم','☕ كافيهات','🥖 مخابز','🛒 بقاليات','💊 صيدليات','🏭 مستودعات','🛍️ متاجر']

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom:'1px solid rgba(255,255,255,.06)' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 0',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'right' as const }}>
        <span style={{ fontSize:16,fontWeight:700,color:'#e2e8f0' }}>{q}</span>
        <span style={{ fontSize:20,color:'#16a34a',transition:'transform .3s',transform:open?'rotate(45deg)':'none',flexShrink:0,marginRight:16 }}>+</span>
      </button>
      {open && <div style={{ paddingBottom:20,fontSize:14,color:'#94a3b8',lineHeight:1.8 }}>{a}</div>}
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [activeBiz, setActiveBiz] = useState(0)
  const [visible, setVisible] = useState<Set<string>>(new Set())
  const observer = useRef<IntersectionObserver|null>(null)

  useEffect(()=>{
    import('@/lib/supabase/client').then(({createClient})=>{
      createClient().auth.getSession().then(({data:{session}})=>{
        if(session) router.replace('/dashboard')
      })
    })
  },[router])

  useEffect(()=>{
    const onScroll=()=>setScrolled(window.scrollY>60)
    window.addEventListener('scroll',onScroll)
    return ()=>window.removeEventListener('scroll',onScroll)
  },[])

  useEffect(()=>{
    const t=setInterval(()=>setActiveBiz(b=>(b+1)%BUSINESSES.length),2000)
    return ()=>clearInterval(t)
  },[])

  useEffect(()=>{
    observer.current=new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting) setVisible(p=>new Set([...p,e.target.id])) })
    },{threshold:.1})
    document.querySelectorAll('[data-obs]').forEach(el=>observer.current?.observe(el))
    return ()=>observer.current?.disconnect()
  },[])

  const vis=(id:string)=>visible.has(id)

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',background:'#0a0f0d',overflowX:'hidden',color:'white'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        .fade{opacity:0;transform:translateY(24px);transition:opacity .7s ease,transform .7s ease}
        .fade.in{opacity:1;transform:none}
        .nav-a{color:rgba(255,255,255,.6);text-decoration:none;font-size:14px;font-weight:500;transition:color .2s}
        .nav-a:hover{color:white}
        .feat-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:28px;transition:all .3s}
        .feat-card:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);transform:translateY(-4px)}
        .plan-card{border-radius:24px;padding:32px;transition:all .3s;position:relative}
        .plan-card:hover{transform:translateY(-6px)}
        .testi-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:28px;transition:all .3s}
        .testi-card:hover{border-color:rgba(255,255,255,.12)}
        .btn-green{background:linear-gradient(135deg,#16a34a,#15803d);color:white;border:none;border-radius:14px;padding:16px 32px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit;transition:all .25s;box-shadow:0 6px 24px rgba(22,163,74,.3)}
        .btn-green:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(22,163,74,.4)}
        .btn-ghost{background:rgba(255,255,255,.06);color:rgba(255,255,255,.8);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:16px 28px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;text-decoration:none;display:inline-flex;align-items:center}
        .btn-ghost:hover{background:rgba(255,255,255,.1)}
        .biz-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:7px 16px;font-size:14px;font-weight:600;transition:all .3s}
        .biz-tag.active{background:rgba(74,222,128,.12);border-color:rgba(74,222,128,.3);color:#4ade80}
        @media(max-width:768px){
          .hero-h1{font-size:36px!important}
          .feat-grid{grid-template-columns:1fr!important}
          .plan-grid{grid-template-columns:1fr!important}
          .testi-grid{grid-template-columns:1fr!important}
          .nav-links{display:none!important}
          .hero-btns{flex-direction:column!important}
          .stats-row{gap:24px!important}
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{position:'fixed',top:0,right:0,left:0,zIndex:1000,padding:'0 32px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between',background:scrolled?'rgba(10,15,13,.95)':'transparent',backdropFilter:scrolled?'blur(20px)':'none',borderBottom:scrolled?'1px solid rgba(255,255,255,.06)':'none',transition:'all .3s'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏪</div>
          <span style={{fontSize:20,fontWeight:900,color:'white',letterSpacing:'-0.5px'}}>Storely</span>
        </div>
        <div className="nav-links" style={{display:'flex',gap:28,alignItems:'center'}}>
          {[['المميزات','#features'],['الأسعار','#pricing'],['آراء العملاء','#testimonials'],['الأسئلة','#faq']].map(([l,h])=>(
            <a key={h} href={h} className="nav-a">{l}</a>
          ))}
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <button onClick={()=>router.push('/login')} style={{background:'none',border:'none',color:'rgba(255,255,255,.7)',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',padding:'8px 16px'}}>دخول</button>
          <button onClick={()=>router.push('/login?mode=register')} className="btn-green" style={{padding:'9px 20px',fontSize:14}}>ابدأ مجاناً ←</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'120px 24px 80px',position:'relative',overflow:'hidden'}}>
        {/* bg */}
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 80% 60% at 50% -20%,rgba(22,163,74,.15),transparent)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'60%',left:'10%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(37,99,235,.08),transparent 70%)',pointerEvents:'none'}}/>
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.03,pointerEvents:'none'}} xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="g" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0L0 0 0 44" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>

        <div style={{position:'relative',zIndex:1,maxWidth:860}}>
          {/* Badge */}
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(74,222,128,.1)',border:'1px solid rgba(74,222,128,.2)',borderRadius:99,padding:'7px 18px',fontSize:13,fontWeight:700,color:'#4ade80',marginBottom:32}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',display:'inline-block'}}/>
            نظام إدارة مخزون سعودي متكامل
          </div>

          <h1 className="hero-h1" style={{fontSize:64,fontWeight:900,lineHeight:1.1,color:'white',marginBottom:24,letterSpacing:'-2px'}}>
            خلّ مخزونك يشتغل<br/>
            <span style={{background:'linear-gradient(135deg,#4ade80 0%,#16a34a 50%,#15803d 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>وأنت مرتاح</span>
          </h1>

          <p style={{fontSize:18,color:'rgba(255,255,255,.55)',maxWidth:580,margin:'0 auto 40px',lineHeight:1.8}}>
            منصة عربية تتابع مخزونك لحظة بلحظة، وتنبّهك على واتساب قبل النفاد، وتخلّي موظفيك يصرفون بضغطة واحدة
          </p>

          {/* Biz tags */}
          <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginBottom:44}}>
            {BUSINESSES.map((b,i)=>(
              <span key={i} className={`biz-tag${activeBiz===i?' active':''}`}>{b}</span>
            ))}
          </div>

          {/* CTAs */}
          <div className="hero-btns" style={{display:'flex',gap:14,justifyContent:'center',marginBottom:64}}>
            <button onClick={()=>router.push('/login?mode=register')} className="btn-green" style={{fontSize:17,padding:'17px 40px'}}>
              ابدأ تجربتك المجانية ←
            </button>
            <a href="#features" className="btn-ghost">اكتشف المميزات</a>
          </div>

          {/* Stats */}
          <div className="stats-row" style={{display:'flex',gap:56,justifyContent:'center',flexWrap:'wrap'}}>
            {[['149 ر.س','يبدأ من'],['7 أيام','تجربة مجانية'],['7','لغات مدعومة'],['24/7','تنبيهات تلقائية']].map(([n,l])=>(
              <div key={l} style={{textAlign:'center'}}>
                <div style={{fontSize:28,fontWeight:900,color:'#4ade80',letterSpacing:'-0.5px'}}>{n}</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,.35)',marginTop:4,fontWeight:500}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{position:'absolute',bottom:32,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:6,opacity:.3}}>
          <div style={{fontSize:11,color:'white',fontWeight:500}}>اسحب للأسفل</div>
          <div style={{width:1,height:28,background:'white'}}/>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{padding:'100px 24px',background:'#0d1410'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div id="feat-t" data-obs style={{textAlign:'center',marginBottom:64}} className={`fade${vis('feat-t')?' in':''}`}>
            <div style={{fontSize:12,fontWeight:700,color:'#4ade80',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:12}}>المميزات</div>
            <h2 style={{fontSize:40,fontWeight:900,color:'white',marginBottom:14,letterSpacing:'-1px'}}>كل شي تحتاجه في مكان واحد</h2>
            <p style={{fontSize:16,color:'rgba(255,255,255,.4)',maxWidth:480,margin:'0 auto'}}>أدوات احترافية مصممة لاحتياجات المنشآت السعودية والخليجية</p>
          </div>
          <div className="feat-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {FEATURES.map((f,i)=>(
              <div key={i} id={`feat-${i}`} data-obs className={`feat-card fade${vis(`feat-${i}`)?' in':''}`} style={{transitionDelay:`${i*.07}s`}}>
                <div style={{width:52,height:52,borderRadius:14,background:f.color+'18',border:`1px solid ${f.color}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,marginBottom:18}}>{f.icon}</div>
                <h3 style={{fontSize:17,fontWeight:800,color:'white',marginBottom:10}}>{f.title}</h3>
                <p style={{fontSize:14,color:'rgba(255,255,255,.45)',lineHeight:1.75}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" style={{padding:'100px 24px',background:'#0a0f0d'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div id="how-t" data-obs style={{textAlign:'center',marginBottom:64}} className={`fade${vis('how-t')?' in':''}`}>
            <div style={{fontSize:12,fontWeight:700,color:'#4ade80',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:12}}>كيف يعمل</div>
            <h2 style={{fontSize:40,fontWeight:900,color:'white',marginBottom:14,letterSpacing:'-1px'}}>ابدأ في 4 خطوات</h2>
            <p style={{fontSize:16,color:'rgba(255,255,255,.4)'}}>إعداد سريع — لا تحتاج خبرة تقنية</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            {[
              {n:'01',title:'سجّل منشأتك',desc:'أنشئ حساب وأضف بيانات منشأتك خلال دقيقتين'},
              {n:'02',title:'أضف مخزونك',desc:'أدخل منتجاتك أو اختر من القوالب الجاهزة'},
              {n:'03',title:'أضف موظفيك',desc:'كل موظف يحصل على رمز PIN للصرف من المخزون'},
              {n:'04',title:'تحكم من أي مكان',desc:'راقب مخزونك واستقبل تقارير يومية على جوالك'},
            ].map((s,i)=>(
              <div key={i} id={`step-${i}`} data-obs className={`fade${vis(`step-${i}`)?' in':''}`}
                style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:20,padding:'28px 22px',transitionDelay:`${i*.1}s`}}>
                <div style={{fontSize:36,fontWeight:900,color:'#4ade80',marginBottom:14,fontVariantNumeric:'tabular-nums'}}>{s.n}</div>
                <h3 style={{fontSize:16,fontWeight:800,color:'white',marginBottom:10}}>{s.title}</h3>
                <p style={{fontSize:13,color:'rgba(255,255,255,.4)',lineHeight:1.7}}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" style={{padding:'100px 24px',background:'#0d1410'}}>
        <div style={{maxWidth:1000,margin:'0 auto'}}>
          <div id="testi-t" data-obs style={{textAlign:'center',marginBottom:64}} className={`fade${vis('testi-t')?' in':''}`}>
            <div style={{fontSize:12,fontWeight:700,color:'#4ade80',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:12}}>آراء العملاء</div>
            <h2 style={{fontSize:40,fontWeight:900,color:'white',marginBottom:14,letterSpacing:'-1px'}}>ماذا يقول عملاؤنا؟</h2>
          </div>
          <div className="testi-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {TESTIMONIALS.map((t,i)=>(
              <div key={i} id={`testi-${i}`} data-obs className={`testi-card fade${vis(`testi-${i}`)?' in':''}`} style={{transitionDelay:`${i*.1}s`}}>
                <div style={{color:'#fbbf24',fontSize:14,letterSpacing:2,marginBottom:16}}>★★★★★</div>
                <p style={{fontSize:15,color:'rgba(255,255,255,.65)',lineHeight:1.8,marginBottom:20,fontStyle:'italic'}}>"{t.text}"</p>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,fontWeight:800,color:'white',flexShrink:0}}>{t.avatar}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'white'}}>{t.name}</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,.35)',marginTop:2}}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{padding:'100px 24px',background:'#0a0f0d'}}>
        <div style={{maxWidth:1020,margin:'0 auto'}}>
          <div id="price-t" data-obs style={{textAlign:'center',marginBottom:64}} className={`fade${vis('price-t')?' in':''}`}>
            <div style={{fontSize:12,fontWeight:700,color:'#4ade80',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:12}}>الأسعار</div>
            <h2 style={{fontSize:40,fontWeight:900,color:'white',marginBottom:14,letterSpacing:'-1px'}}>باقات تناسب حجم عملك</h2>
            <p style={{fontSize:16,color:'rgba(255,255,255,.4)'}}>7 أيام تجربة مجانية — لا يتطلب بطاقة ائتمانية</p>
          </div>
          <div className="plan-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {PLANS.map((p,i)=>(
              <div key={i} id={`plan-${i}`} data-obs className={`plan-card fade${vis(`plan-${i}`)?' in':''}`}
                style={{background:p.popular?`linear-gradient(160deg,${p.color}18,${p.color}08)`:'rgba(255,255,255,.03)',border:p.popular?`1.5px solid ${p.color}50`:'1px solid rgba(255,255,255,.07)',transitionDelay:`${i*.1}s`}}>
                {p.badge && <div style={{display:'inline-block',background:p.color,color:'white',fontSize:11,fontWeight:700,padding:'4px 14px',borderRadius:99,marginBottom:20}}>{p.badge}</div>}
                {!p.badge && <div style={{height:28,marginBottom:20}}/>}
                
                <div style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,.4)',marginBottom:10}}>{p.name}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:20}}>
                  <span style={{fontSize:48,fontWeight:900,color:'white',letterSpacing:'-1px'}}>{p.price}</span>
                  <span style={{fontSize:14,color:'rgba(255,255,255,.3)'}}>ر.س/شهر</span>
                </div>

                {/* Limits */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:24}}>
                  {Object.values(p.limits).map((v,j)=>(
                    <div key={j} style={{background:'rgba(255,255,255,.05)',borderRadius:10,padding:'8px 6px',textAlign:'center'}}>
                      <div style={{fontSize:11,fontWeight:700,color:p.color}}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{height:1,background:'rgba(255,255,255,.06)',marginBottom:20}}/>

                {/* Features */}
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:28}}>
                  {p.features.map((f,j)=>(
                    <div key={j} style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:13,color:f.ok?p.color:'rgba(255,255,255,.15)',flexShrink:0,fontWeight:700}}>{f.ok?'✓':'—'}</span>
                      <span style={{fontSize:13,color:f.ok?'rgba(255,255,255,.75)':'rgba(255,255,255,.25)'}}>{f.label}</span>
                    </div>
                  ))}
                </div>

                <button onClick={()=>router.push('/login?mode=register')}
                  style={{width:'100%',padding:'14px',background:p.popular?p.color:'rgba(255,255,255,.06)',color:'white',border:p.popular?'none':`1px solid rgba(255,255,255,.1)`,borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',transition:'all .2s',boxShadow:p.popular?`0 6px 24px ${p.color}40`:'none'}}>
                  ابدأ تجربتك المجانية ←
                </button>
              </div>
            ))}
          </div>
          <p style={{textAlign:'center',color:'rgba(255,255,255,.2)',fontSize:13,marginTop:24}}>💳 الدفع عبر تحويل بنكي — التفعيل خلال 24 ساعة</p>
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:'100px 24px',background:'#0d1410',textAlign:'center'}}>
        <div id="cta" data-obs style={{maxWidth:600,margin:'0 auto'}} className={`fade${vis('cta')?' in':''}`}>
          <div style={{width:72,height:72,borderRadius:20,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,margin:'0 auto 24px',boxShadow:'0 12px 32px rgba(22,163,74,.3)'}}>🚀</div>
          <h2 style={{fontSize:40,fontWeight:900,color:'white',marginBottom:14,letterSpacing:'-1px'}}>جاهز تبدأ؟</h2>
          <p style={{fontSize:17,color:'rgba(255,255,255,.45)',marginBottom:40,lineHeight:1.8}}>
            سجّل الآن واستمتع بـ 7 أيام تجربة مجانية كاملة — لا يتطلب بطاقة ائتمانية
          </p>
          <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={()=>router.push('/login?mode=register')} className="btn-green" style={{fontSize:17,padding:'18px 44px'}}>
              سجّل مجاناً الآن ←
            </button>
            <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer"
              style={{display:'flex',alignItems:'center',gap:10,padding:'18px 32px',borderRadius:14,background:'#25d366',color:'white',textDecoration:'none',fontSize:16,fontWeight:800,boxShadow:'0 6px 24px rgba(37,211,102,.3)'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              تواصل معنا
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{padding:'100px 24px',background:'#0a0f0d'}}>
        <div style={{maxWidth:700,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:56}}>
            <div style={{fontSize:12,fontWeight:700,color:'#4ade80',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:12}}>الأسئلة الشائعة</div>
            <h2 style={{fontSize:40,fontWeight:900,color:'white',letterSpacing:'-1px'}}>عندك سؤال؟</h2>
          </div>
          {[
            {q:'هل فيه تجربة مجانية؟',a:'نعم — 7 أيام مجانية كاملة بدون بطاقة ائتمانية. استكشف جميع المميزات وأضف مخزونك من أول يوم.'},
            {q:'كيف يتم الدفع؟',a:'الدفع عبر تحويل بنكي. بعد التحويل يتم تفعيل حسابك خلال 24 ساعة.'},
            {q:'كم عدد الموردين في كل باقة؟',a:'الأساسية: 3 موردين، المتوسطة: 10 موردين، المتقدمة: غير محدود.'},
            {q:'هل يدعم متعدد الفروع؟',a:'نعم — الأساسية: فرع واحد، المتوسطة: 3 فروع، المتقدمة: فروع غير محدودة.'},
            {q:'هل الموظفون يحتاجون تدريب؟',a:'لا — واجهة الموظفين بسيطة جداً بضغطة واحدة للصرف، وتدعم 7 لغات لأي جنسية.'},
            {q:'هل بياناتي آمنة؟',a:'نعم — بياناتك محفوظة على سيرفرات مشفرة مع نسخ احتياطية تلقائية منتظمة.'},
            {q:'هل يمكن الإلغاء في أي وقت؟',a:'نعم — لا يوجد عقود. يمكنك إلغاء اشتراكك في أي وقت.'},
          ].map((faq,i)=><FaqItem key={i} q={faq.q} a={faq.a}/>)}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:'#060a07',padding:'56px 32px 32px',borderTop:'1px solid rgba(255,255,255,.05)'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:32,marginBottom:48}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏪</div>
                <span style={{fontSize:20,fontWeight:800,color:'white'}}>Storely</span>
              </div>
              <p style={{fontSize:13,color:'rgba(255,255,255,.25)',lineHeight:1.7,maxWidth:220}}>منصة إدارة المخزون الذكية للمنشآت السعودية والخليجية</p>
            </div>
            <div style={{display:'flex',gap:48,flexWrap:'wrap'}}>
              {[
                {title:'المنصة', links:[['تسجيل الدخول','/login'],['إنشاء حساب','/login?mode=register'],['الأسعار','#pricing']]},
                {title:'قانوني', links:[['سياسة الخصوصية','/privacy'],['الشروط والأحكام','/terms']]},
                {title:'تواصل', links:[['واتساب','https://wa.me/966594351667'],['support@storely.dev','mailto:support@storely.dev']]},
              ].map((col,i)=>(
                <div key={i}>
                  <div style={{fontSize:11,fontWeight:700,color:'#4ade80',marginBottom:14,letterSpacing:'.1em',textTransform:'uppercase'}}>{col.title}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {col.links.map(([l,h])=>(
                      <a key={l} href={h} style={{color:'rgba(255,255,255,.3)',textDecoration:'none',fontSize:13,transition:'color .2s'}}
                        onMouseEnter={e=>(e.currentTarget.style.color='white')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,.3)')}>{l}</a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{borderTop:'1px solid rgba(255,255,255,.05)',paddingTop:24,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,.15)'}}>© {new Date().getFullYear()} Storely — جميع الحقوق محفوظة</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.15)'}}>storely.dev</div>
          </div>
        </div>
      </footer>

      {/* WhatsApp float */}
      <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer"
        style={{position:'fixed',bottom:28,left:28,zIndex:9999,width:56,height:56,borderRadius:'50%',background:'#25d366',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(37,211,102,.4)',textDecoration:'none',transition:'transform .2s'}}
        onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.1)')}
        onMouseLeave={e=>(e.currentTarget.style.transform='none')}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>
    </div>
  )
}
