'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const BUSINESSES = [
  { icon: '🍔', label: 'مطاعم' },
  { icon: '☕', label: 'كافيهات' },
  { icon: '🥖', label: 'مخابز' },
  { icon: '🛒', label: 'بقاليات' },
  { icon: '💊', label: 'صيدليات' },
  { icon: '🏭', label: 'مستودعات' },
  { icon: '🛍️', label: 'متاجر' },
]

const FEATURES = [
  { icon: '📦', title: 'تتبع المخزون لحظة بلحظة', desc: 'راقب كميات منتجاتك بدقة واستقبل تنبيهات فورية قبل أن ينفد أي صنف', color: '#16a34a' },
  { icon: '📲', title: 'تنبيهات واتساب تلقائية', desc: 'يصلك إشعار فوري على واتساب لما يوصل أي صنف للحد الأدنى — بدون مراقبة يدوية', color: '#25d366' },
  { icon: '👥', title: 'موظفون بصلاحيات محدودة', desc: 'أضف موظفين يصرفون من المخزون برمز PIN فقط — بدون وصول لأي بيانات حساسة', color: '#2563eb' },
  { icon: '🌍', title: 'واجهة بـ 7 لغات', desc: 'موظفوك الأجانب يتعاملون مع النظام بلغتهم — عربي، إنجليزي، أردو، هندي، تاغالوغ، بنغالي، فرنسي', color: '#7c3aed' },
  { icon: '📊', title: 'تقارير احترافية', desc: 'تقارير الصرف والمشتريات والجرد اليومي جاهزة — صدّر بـ CSV بضغطة واحدة', color: '#d97706' },
  { icon: '🏪', title: 'إدارة متعددة الفروع', desc: 'أدر جميع فروعك من لوحة تحكم واحدة — كل فرع بمخزونه المستقل', color: '#0891b2' },
]

const PROBLEMS = [
  { problem: 'ما تعرف وش نفد من مخزونك إلا بعد ما ينتهي', solution: 'تنبيهات فورية قبل النفاد' },
  { problem: 'تسجيل المخزون يدوياً في ورق أو Excel', solution: 'نظام رقمي احترافي وسريع' },
  { problem: 'ما تقدر تتابع الصرف اليومي من الموظفين', solution: 'سجل صرف تفصيلي لكل موظف' },
  { problem: 'الموظفون الأجانب ما يفهمون النظام', solution: 'واجهة بـ 7 لغات فورية' },
]

const STEPS = [
  { n: '01', title: 'سجّل منشأتك', desc: 'أنشئ حساب وأضف بيانات منشأتك خلال دقيقتين' },
  { n: '02', title: 'أضف مخزونك', desc: 'أدخل منتجاتك يدوياً أو اختر من القوالب الجاهزة' },
  { n: '03', title: 'أضف موظفيك', desc: 'كل موظف يحصل على رمز PIN خاص للصرف من المخزون' },
  { n: '04', title: 'تحكم من أي مكان', desc: 'راقب مخزونك واستقبل تقارير يومية على جوالك' },
]

const PLANS = [
  { name: 'الأساسية', price: '149', color: '#16a34a', popular: false, badge: '', features: [
    { label: 'الفروع',           value: '1 فرع',           included: true },
    { label: 'الموظفون',         value: '2 موظفين',        included: true },
    { label: 'الموردون',         value: '3 موردين',        included: true },
    { label: 'تنبيهات واتساب',   value: '✓',               included: true },
    { label: 'تقارير أساسية',    value: '✓',               included: true },
    { label: 'تقارير متقدمة',    value: '—',               included: false },
    { label: 'دعم ذو أولوية',    value: '—',               included: false },
    { label: 'دعم 24/7',         value: '—',               included: false },
  ]},
  { name: 'المتوسطة', price: '249', color: '#2563eb', popular: true, badge: 'الأكثر طلباً', features: [
    { label: 'الفروع',           value: '3 فروع',          included: true },
    { label: 'الموظفون',         value: '10 موظفين',       included: true },
    { label: 'الموردون',         value: '10 موردين',       included: true },
    { label: 'تنبيهات واتساب',   value: '✓',               included: true },
    { label: 'تقارير أساسية',    value: '✓',               included: true },
    { label: 'تقارير متقدمة',    value: '✓',               included: true },
    { label: 'دعم ذو أولوية',    value: '✓',               included: true },
    { label: 'دعم 24/7',         value: '—',               included: false },
  ]},
  { name: 'المتقدمة', price: '399', color: '#7c3aed', popular: false, badge: 'الأفضل للسلاسل', features: [
    { label: 'الفروع',           value: 'غير محدودة',      included: true },
    { label: 'الموظفون',         value: 'غير محدودين',     included: true },
    { label: 'الموردون',         value: 'غير محدودين',     included: true },
    { label: 'تنبيهات واتساب',   value: '✓',               included: true },
    { label: 'تقارير أساسية',    value: '✓',               included: true },
    { label: 'تقارير متقدمة',    value: '✓',               included: true },
    { label: 'دعم ذو أولوية',    value: '✓',               included: true },
    { label: 'دعم 24/7',         value: '✓',               included: true },
  ]},
]

const TESTIMONIALS = [
  { name: 'أحمد العتيبي', role: 'صاحب مطعم — الرياض', text: 'قبل Storely كنت أعرف نفاد المواد بعد ما ينتهي الطبخ. الحين يجيني تنبيه واتساب قبل أي نقص.', stars: 5 },
  { name: 'سارة المطيري', role: 'مديرة سلسلة كافيهات — جدة', text: 'ثلاث فروع وكلها تحت عيني من جوالي. التقارير اليومية وفّرت علي ساعات من المتابعة اليدوية.', stars: 5 },
  { name: 'خالد الشمري', role: 'صاحب صيدلية — الدمام', text: 'الموظفين الأجانب عندي يستخدمون النظام بلغتهم بدون أي مشكلة. أفضل قرار اتخذته لمتجري.', stars: 5 },
]

function Stars({ n }: { n: number }) {
  return <div style={{ color: '#f59e0b', fontSize: 14, letterSpacing: 2 }}>{'★'.repeat(n)}</div>
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #f1f5f9' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right' as const }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{q}</span>
        <span style={{ fontSize: 22, color: '#16a34a', transition: 'transform .3s', transform: open ? 'rotate(45deg)' : 'none', flexShrink: 0, marginRight: 16 }}>+</span>
      </button>
      {open && <div style={{ paddingBottom: 22, fontSize: 15, color: '#64748b', lineHeight: 1.8 }}>{a}</div>}
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [activeBiz, setActiveBiz] = useState(0)
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getSession().then(({ data: { session } }) => {
        if (session) router.replace('/dashboard')
      })
    })
  }, [router])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setActiveBiz(b => (b + 1) % BUSINESSES.length), 2000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setVisibleSections(p => new Set([...p, e.target.id])) })
    }, { threshold: 0.12 })
    document.querySelectorAll('[data-animate]').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const isVis = (id: string) => visibleSections.has(id)

  return (
    <div style={{ fontFamily: "'IBM Plex Sans Arabic',system-ui,sans-serif", direction: 'rtl', background: '#ffffff', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        .fade-up{opacity:0;transform:translateY(28px);transition:opacity .65s ease,transform .65s ease}
        .fade-up.visible{opacity:1;transform:none}
        .nav-link{color:#475569;text-decoration:none;font-size:15px;font-weight:600;transition:color .2s}
        .nav-link:hover{color:#16a34a}
        .feat-card{background:white;border:1.5px solid #f1f5f9;border-radius:20px;padding:28px;transition:all .3s}
        .feat-card:hover{border-color:#bbf7d0;transform:translateY(-6px);box-shadow:0 20px 40px rgba(22,163,74,.08)}
        .prob-row{display:flex;align-items:center;gap:16px;padding:18px 22px;border-radius:14px;margin-bottom:12px;background:#f8fafc;transition:all .2s}
        .prob-row:hover{background:#f0fdf4}
        .step-card{background:white;border:1.5px solid #f1f5f9;border-radius:20px;padding:28px 24px;transition:all .3s}
        .step-card:hover{border-color:#bbf7d0;box-shadow:0 12px 32px rgba(22,163,74,.08)}
        .plan-card{border-radius:24px;padding:36px 28px;transition:all .3s}
        .plan-card:hover{transform:translateY(-8px)}
        .testi-card{background:white;border:1.5px solid #f1f5f9;border-radius:20px;padding:28px;transition:all .3s}
        .testi-card:hover{border-color:#bbf7d0;box-shadow:0 12px 32px rgba(22,163,74,.06)}
        .btn-primary{background:#16a34a;color:white;border:none;border-radius:14px;padding:16px 32px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .25s;box-shadow:0 6px 20px rgba(22,163,74,.3)}
        .btn-primary:hover{background:#15803d;transform:translateY(-2px);box-shadow:0 10px 28px rgba(22,163,74,.4)}
        .biz-chip{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:99px;padding:8px 18px;font-size:15px;font-weight:600;color:white;transition:all .3s}
        .biz-chip.active{background:rgba(74,222,128,.15);border-color:rgba(74,222,128,.4);color:#4ade80;transform:scale(1.05)}
        @media(max-width:768px){
          .hero-title{font-size:34px!important}
          .feat-grid{grid-template-columns:1fr!important}
          .plan-grid{grid-template-columns:1fr!important}
          .step-grid{grid-template-columns:1fr 1fr!important}
          .prob-grid{grid-template-columns:1fr!important}
          .testi-grid{grid-template-columns:1fr!important}
          .nav-desktop{display:none!important}
          .hero-btns{flex-direction:column!important;align-items:stretch!important}
          .who-grid{grid-template-columns:repeat(2,1fr)!important}
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ position:'fixed',top:0,right:0,left:0,zIndex:1000,padding:'14px 32px',display:'flex',alignItems:'center',justifyContent:'space-between',background:scrolled?'rgba(255,255,255,.97)':'transparent',backdropFilter:scrolled?'blur(12px)':'none',borderBottom:scrolled?'1px solid #f1f5f9':'none',transition:'all .3s',boxShadow:scrolled?'0 2px 20px rgba(0,0,0,.06)':'none' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:38,height:38,borderRadius:10,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🏪</div>
          <span style={{ fontSize:20,fontWeight:900,color:scrolled?'#0f172a':'white' }}>Storely</span>
        </div>
        <div className="nav-desktop" style={{ display:'flex',gap:32,alignItems:'center' }}>
          {[['المميزات','#features'],['كيف يعمل','#how'],['آراء العملاء','#testimonials'],['الأسعار','#pricing']].map(([l,h])=>(
            <a key={h} href={h} className="nav-link" style={{ color:scrolled?'#475569':'rgba(255,255,255,.8)' }}>{l}</a>
          ))}
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={()=>router.push('/login?mode=register')} style={{ background:scrolled?'#f1f5f9':'rgba(255,255,255,.12)',color:scrolled?'#1e293b':'white',border:'none',borderRadius:10,padding:'10px 20px',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>دخول</button>
          <button onClick={()=>router.push('/login?mode=register')} className="btn-primary" style={{ padding:'10px 22px',fontSize:14 }}>ابدأ مجاناً ←</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight:'100vh',background:'linear-gradient(160deg,#0a1f13 0%,#0d2818 50%,#0a1a0d 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'120px 24px 80px',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 20% 50%,rgba(22,163,74,.12) 0%,transparent 60%),radial-gradient(circle at 80% 20%,rgba(37,99,235,.08) 0%,transparent 50%)' }}/>
        <div style={{ position:'absolute',inset:0,opacity:.04,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px)' }}/>
        <div style={{ position:'relative',zIndex:1,maxWidth:820 }}>
          <div style={{ display:'inline-block',background:'rgba(74,222,128,.12)',border:'1px solid rgba(74,222,128,.25)',borderRadius:99,padding:'8px 22px',fontSize:13,fontWeight:700,color:'#4ade80',marginBottom:28 }}>
            🚀 نظام إدارة مخزون سعودي متكامل
          </div>
          <h1 className="hero-title" style={{ fontSize:58,fontWeight:900,lineHeight:1.15,color:'white',marginBottom:20,letterSpacing:'-1px' }}>
            خلّ مخزونك يشتغل<br/>
            <span style={{ background:'linear-gradient(90deg,#4ade80,#22c55e)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}>وأنت مرتاح</span>
          </h1>
          <p style={{ fontSize:18,color:'rgba(255,255,255,.65)',maxWidth:560,margin:'0 auto 36px',lineHeight:1.8 }}>
            منصة عربية ذكية تتابع مخزونك، تنبّهك على واتساب قبل النفاد، وتخلّي موظفيك يصرفون بضغطة واحدة
          </p>
          <div style={{ display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginBottom:44 }}>
            {BUSINESSES.map((b,i)=>(
              <div key={i} className={`biz-chip${activeBiz===i?' active':''}`}>
                <span>{b.icon}</span><span>{b.label}</span>
              </div>
            ))}
          </div>
          <div className="hero-btns" style={{ display:'flex',gap:14,justifyContent:'center' }}>
            <button onClick={()=>router.push('/login?mode=register')} className="btn-primary" style={{ fontSize:17,padding:'16px 36px' }}>ابدأ مجاناً الآن ←</button>
            <a href="#features" style={{ display:'flex',alignItems:'center',gap:8,padding:'16px 28px',border:'1.5px solid rgba(255,255,255,.2)',borderRadius:14,color:'rgba(255,255,255,.8)',textDecoration:'none',fontSize:15,fontWeight:600,background:'rgba(255,255,255,.05)' }}>
              اكتشف المميزات
            </a>
          </div>
          <div style={{ display:'flex',gap:48,justifyContent:'center',marginTop:64,flexWrap:'wrap' }}>
            {[['149 ر.س','يبدأ من'],['7','لغات مدعومة'],['24/7','تنبيهات تلقائية']].map(([n,l])=>(
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontSize:30,fontWeight:900,color:'#4ade80' }}>{n}</div>
                <div style={{ fontSize:13,color:'rgba(255,255,255,.4)',marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position:'absolute',bottom:32,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:6,opacity:.4 }}>
          <div style={{ fontSize:12,color:'white' }}>اسحب للأسفل</div>
          <div style={{ width:1,height:32,background:'rgba(255,255,255,.3)' }}/>
        </div>
      </section>

      {/* PROBLEMS */}
      <section style={{ padding:'100px 24px',background:'#f8fafc' }}>
        <div style={{ maxWidth:900,margin:'0 auto' }}>
          <div id="prob-title" data-animate style={{ textAlign:'center',marginBottom:56 }} className={"fade-up"+(isVis("prob-title")?" visible":"")}>
            <div style={{ fontSize:13,fontWeight:700,color:'#16a34a',letterSpacing:'.1em',textTransform:'uppercase' as const,marginBottom:12 }}>المشاكل التي نحلها</div>
            <h2 style={{ fontSize:38,fontWeight:900,color:'#0f172a',marginBottom:12 }}>هل تعاني من هذي المشاكل؟</h2>
            <p style={{ fontSize:16,color:'#64748b' }}>Storely صُمّم خصيصاً لحل هذي التحديات اليومية</p>
          </div>
          <div className="prob-grid" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            {PROBLEMS.map((p,i)=>(
              <div key={i} id={"prob-"+i} data-animate className={`prob-row fade-up${isVis("prob-"+i)?' visible':''}`} style={{ transitionDelay:(i*.1)+'s' }}>
                <div style={{ width:36,height:36,borderRadius:10,background:'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>❌</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14,color:'#475569',marginBottom:6 }}>{p.problem}</div>
                  <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                    <div style={{ width:20,height:20,borderRadius:6,background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10 }}>✓</div>
                    <div style={{ fontSize:13,fontWeight:700,color:'#16a34a' }}>{p.solution}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding:'100px 24px',background:'white' }}>
        <div style={{ maxWidth:1100,margin:'0 auto' }}>
          <div id="feat-title" data-animate style={{ textAlign:'center',marginBottom:64 }} className={"fade-up"+(isVis("feat-title")?" visible":"")}>
            <div style={{ fontSize:13,fontWeight:700,color:'#16a34a',letterSpacing:'.1em',textTransform:'uppercase' as const,marginBottom:12 }}>المميزات</div>
            <h2 style={{ fontSize:38,fontWeight:900,color:'#0f172a',marginBottom:12 }}>كل شي تحتاجه في مكان واحد</h2>
            <p style={{ fontSize:16,color:'#64748b',maxWidth:500,margin:'0 auto' }}>أدوات احترافية مصممة لاحتياجات المنشآت السعودية</p>
          </div>
          <div className="feat-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20 }}>
            {FEATURES.map((f,i)=>(
              <div key={i} id={"feat-"+i} data-animate className={`feat-card fade-up${isVis("feat-"+i)?' visible':''}`} style={{ transitionDelay:(i*.08)+'s' }}>
                <div style={{ width:52,height:52,borderRadius:14,background:f.color+'15',border:`1.5px solid ${f.color}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,marginBottom:18 }}>{f.icon}</div>
                <h3 style={{ fontSize:17,fontWeight:800,color:'#0f172a',marginBottom:10 }}>{f.title}</h3>
                <p style={{ fontSize:14,color:'#64748b',lineHeight:1.75 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding:'100px 24px',background:'linear-gradient(160deg,#0a1f13,#0d2818)' }}>
        <div style={{ maxWidth:1000,margin:'0 auto' }}>
          <div id="how-title" data-animate style={{ textAlign:'center',marginBottom:64 }} className={"fade-up"+(isVis("how-title")?" visible":"")}>
            <div style={{ fontSize:13,fontWeight:700,color:'#4ade80',letterSpacing:'.1em',textTransform:'uppercase' as const,marginBottom:12 }}>كيف يعمل</div>
            <h2 style={{ fontSize:38,fontWeight:900,color:'white',marginBottom:12 }}>ابدأ في 4 خطوات بسيطة</h2>
            <p style={{ fontSize:16,color:'rgba(255,255,255,.5)' }}>إعداد سريع — لا تحتاج خبرة تقنية</p>
          </div>
          <div className="step-grid" style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16 }}>
            {STEPS.map((s,i)=>(
              <div key={i} id={"step-"+i} data-animate className={`step-card fade-up${isVis("step-"+i)?' visible':''}`} style={{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',transitionDelay:(i*.1)+'s' }}>
                <div style={{ fontSize:32,fontWeight:900,color:'#4ade80',marginBottom:14 }}>{s.n}</div>
                <h3 style={{ fontSize:16,fontWeight:800,color:'white',marginBottom:10 }}>{s.title}</h3>
                <p style={{ fontSize:13,color:'rgba(255,255,255,.5)',lineHeight:1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO WE SERVE */}
      <section style={{ padding:'100px 24px',background:'#f8fafc' }}>
        <div style={{ maxWidth:900,margin:'0 auto',textAlign:'center' }}>
          <div id="who-title" data-animate style={{ marginBottom:52 }} className={"fade-up"+(isVis("who-title")?" visible":"")}>
            <div style={{ fontSize:13,fontWeight:700,color:'#16a34a',letterSpacing:'.1em',textTransform:'uppercase' as const,marginBottom:12 }}>من نخدم</div>
            <h2 style={{ fontSize:38,fontWeight:900,color:'#0f172a',marginBottom:12 }}>مناسب لكل نشاط تجاري</h2>
          </div>
          <div className="who-grid" style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14 }}>
            {BUSINESSES.map((b,i)=>(
              <div key={i} id={"biz-"+i} data-animate className={"fade-up"+(isVis("biz-"+i)?" visible":"")}
                style={{ background:'white',border:'1.5px solid #f1f5f9',borderRadius:18,padding:'24px 16px',textAlign:'center',transition:'all .25s',transitionDelay:(i*.06)+'s' }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='#bbf7d0';(e.currentTarget as HTMLElement).style.transform='translateY(-4px)'}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='#f1f5f9';(e.currentTarget as HTMLElement).style.transform='none'}}>
                <div style={{ fontSize:36,marginBottom:12 }}>{b.icon}</div>
                <div style={{ fontSize:14,fontWeight:700,color:'#1e293b' }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" style={{ padding:'100px 24px',background:'white' }}>
        <div style={{ maxWidth:1000,margin:'0 auto' }}>
          <div id="testi-title" data-animate style={{ textAlign:'center',marginBottom:64 }} className={"fade-up"+(isVis("testi-title")?" visible":"")}>
            <div style={{ fontSize:13,fontWeight:700,color:'#16a34a',letterSpacing:'.1em',textTransform:'uppercase' as const,marginBottom:12 }}>آراء العملاء</div>
            <h2 style={{ fontSize:38,fontWeight:900,color:'#0f172a',marginBottom:12 }}>ماذا يقول عملاؤنا؟</h2>
            <p style={{ fontSize:16,color:'#64748b' }}>تجارب حقيقية من منشآت سعودية تستخدم Storely</p>
          </div>
          <div className="testi-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20 }}>
            {TESTIMONIALS.map((t,i)=>(
              <div key={i} id={"testi-"+i} data-animate className={`testi-card fade-up${isVis("testi-"+i)?' visible':''}`} style={{ transitionDelay:(i*.1)+'s' }}>
                <Stars n={t.stars}/>
                <p style={{ fontSize:15,color:'#475569',lineHeight:1.8,margin:'16px 0 20px',fontStyle:'italic' }}>"{t.text}"</p>
                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                  <div style={{ width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'white',flexShrink:0 }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize:14,fontWeight:700,color:'#0f172a' }}>{t.name}</div>
                    <div style={{ fontSize:12,color:'#94a3b8',marginTop:2 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding:'100px 24px',background:'#f8fafc' }}>
        <div style={{ maxWidth:1000,margin:'0 auto' }}>
          <div id="price-title" data-animate style={{ textAlign:'center',marginBottom:64 }} className={"fade-up"+(isVis("price-title")?" visible":"")}>
            <div style={{ fontSize:13,fontWeight:700,color:'#16a34a',letterSpacing:'.1em',textTransform:'uppercase' as const,marginBottom:12 }}>الأسعار</div>
            <h2 style={{ fontSize:38,fontWeight:900,color:'#0f172a',marginBottom:12 }}>باقات تناسب حجم عملك</h2>
            <p style={{ fontSize:16,color:'#64748b' }}>جميع الباقات تشمل كامل المميزات — الفرق في عدد الفروع</p>
          </div>
          <div className="plan-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20 }}>
            {PLANS.map((p,i)=>(
              <div key={i} id={"plan-"+i} data-animate className={"plan-card fade-up"+(isVis("plan-"+i)?" visible":"")}
                style={{ background:p.popular?'linear-gradient(160deg,#0a1f13,#0d2818)':'white',border:p.popular?'2px solid #16a34a':'1.5px solid #e2e8f0',position:'relative',transitionDelay:(i*.1)+'s' }}>
                {p.popular&&<div style={{ position:'absolute',top:-14,right:'50%',transform:'translateX(50%)',background:'#16a34a',color:'white',padding:'5px 20px',borderRadius:99,fontSize:12,fontWeight:700,whiteSpace:'nowrap' as const }}>الأكثر طلباً</div>}
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontSize:15,fontWeight:700,color:p.popular?'rgba(255,255,255,.6)':'#64748b',marginBottom:12 }}>{p.name}</div>
                  <div style={{ display:'flex',alignItems:'baseline',gap:6,marginBottom:8 }}>
                    <span style={{ fontSize:48,fontWeight:900,color:p.popular?'white':'#0f172a' }}>{p.price}</span>
                    <span style={{ fontSize:15,color:p.popular?'rgba(255,255,255,.5)':'#94a3b8' }}>ر.س / شهر</span>
                  </div>
                </div>
                <div style={{ display:'flex',flexDirection:'column' as const,gap:10,marginBottom:28 }}>
                  {p.features.map((f,j)=>(
                    <div key={j} style={{ display:'flex',alignItems:'center',gap:10,fontSize:14,color:p.popular?'rgba(255,255,255,.85)':'#475569' }}>
                      <span style={{ color:p.popular?'#4ade80':'#16a34a',flexShrink:0 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <button onClick={()=>router.push('/login?mode=register')} style={{ width:'100%',padding:'14px',background:p.popular?'#16a34a':'white',color:p.popular?'white':'#16a34a',border:p.popular?'none':'2px solid #16a34a',borderRadius:14,fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .2s',boxShadow:p.popular?'0 6px 20px rgba(22,163,74,.4)':'none' }}>
                  ابدأ الآن
                </button>
              </div>
            ))}
          </div>
          <p style={{ textAlign:'center',color:'#94a3b8',fontSize:13,marginTop:24 }}>💳 الدفع عبر تحويل بنكي — التفعيل خلال 24 ساعة</p>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'100px 24px',background:'linear-gradient(160deg,#0a1f13,#0d2818)',textAlign:'center' }}>
        <div id="cta" data-animate style={{ maxWidth:600,margin:'0 auto' }} className={"fade-up"+(isVis("cta")?" visible":"")}>
          <div style={{ fontSize:52,marginBottom:20 }}>🚀</div>
          <h2 style={{ fontSize:36,fontWeight:900,color:'white',marginBottom:14 }}>جاهز تبدأ؟</h2>
          <p style={{ fontSize:17,color:'rgba(255,255,255,.6)',marginBottom:36,lineHeight:1.8 }}>
            سجّل الآن وابدأ بتجربة Storely — فريقنا جاهز لمساعدتك في الإعداد
          </p>
          <div style={{ display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap' as const }}>
            <button onClick={()=>router.push('/login?mode=register')} className="btn-primary" style={{ fontSize:17,padding:'17px 40px' }}>سجّل مجاناً الآن ←</button>
            <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer"
              style={{ display:'flex',alignItems:'center',gap:10,padding:'17px 32px',borderRadius:14,background:'#25d366',color:'white',textDecoration:'none',fontSize:16,fontWeight:700,boxShadow:'0 6px 20px rgba(37,211,102,.35)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              تواصل معنا
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding:'100px 24px',background:'white' }}>
        <div style={{ maxWidth:720,margin:'0 auto' }}>
          <div style={{ textAlign:'center',marginBottom:56 }}>
            <div style={{ fontSize:13,fontWeight:700,color:'#16a34a',letterSpacing:'.1em',textTransform:'uppercase' as const,marginBottom:12 }}>الأسئلة الشائعة</div>
            <h2 style={{ fontSize:38,fontWeight:900,color:'#0f172a' }}>عندك سؤال؟</h2>
          </div>
          {[
            { q:'هل فيه تجربة مجانية؟', a:'نعم — يمكنك تجربة Storely مجاناً وإعداد مخزونك الأول بدون أي رسوم. التفعيل الكامل يتطلب الاشتراك.' },
            { q:'كيف يتم الدفع؟', a:'الدفع عبر تحويل بنكي. بعد التحويل يتم تفعيل حسابك خلال 24 ساعة.' },
            { q:'هل يدعم متعدد الفروع؟', a:'نعم — باقة 249 ر.س تدعم حتى 3 فروع، وباقة 399 ر.س تدعم فروع غير محدودة.' },
            { q:'هل الموظفون يحتاجون تدريب؟', a:'لا — واجهة الموظفين بسيطة جداً بضغطة واحدة للصرف، وتدعم 7 لغات لأي جنسية.' },
            { q:'هل بياناتي آمنة؟', a:'نعم — بياناتك محفوظة على سيرفرات مشفرة مع نسخ احتياطية تلقائية منتظمة.' },
            { q:'هل يمكن الإلغاء في أي وقت؟', a:'نعم — لا يوجد عقود طويلة. يمكنك إلغاء اشتراكك في أي وقت.' },
          ].map((faq,i)=><FaqItem key={i} q={faq.q} a={faq.a}/>)}
        </div>
      </section>

      {/* WhatsApp float */}
      <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer"
        style={{ position:'fixed',bottom:28,left:28,zIndex:9999,width:58,height:58,borderRadius:'50%',background:'#25d366',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(37,211,102,.5)',textDecoration:'none',transition:'transform .2s' }}
        onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.1)')}
        onMouseLeave={e=>(e.currentTarget.style.transform='none')}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>

      {/* FOOTER */}
      <footer style={{ background:'#020c05',padding:'48px 32px 32px' }}>
        <div style={{ maxWidth:1100,margin:'0 auto' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap' as const,gap:32,marginBottom:40 }}>
            <div>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
                <div style={{ width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🏪</div>
                <span style={{ fontSize:20,fontWeight:800,color:'white' }}>Storely</span>
              </div>
              <p style={{ fontSize:13,color:'rgba(255,255,255,.4)',lineHeight:1.7,maxWidth:240 }}>منصة إدارة المخزون الذكية للمنشآت السعودية</p>
            </div>
            <div style={{ display:'flex',gap:48,flexWrap:'wrap' as const }}>
              <div>
                <div style={{ fontSize:12,fontWeight:700,color:'#4ade80',marginBottom:14,letterSpacing:'.08em' }}>المنصة</div>
                <div style={{ display:'flex',flexDirection:'column' as const,gap:10 }}>
                  {[['تسجيل الدخول','/login'],['إنشاء حساب','/login'],['الأسعار','#pricing']].map(([l,h])=>(
                    <a key={l} href={h} style={{ color:'rgba(255,255,255,.4)',textDecoration:'none',fontSize:13,transition:'color .2s' }}
                      onMouseEnter={e=>(e.currentTarget.style.color='white')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,.4)')}>{l}</a>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:12,fontWeight:700,color:'#4ade80',marginBottom:14,letterSpacing:'.08em' }}>قانوني</div>
                <div style={{ display:'flex',flexDirection:'column' as const,gap:10 }}>
                  {[['سياسة الخصوصية','/privacy'],['الشروط والأحكام','/terms']].map(([l,h])=>(
                    <a key={l} href={h} style={{ color:'rgba(255,255,255,.4)',textDecoration:'none',fontSize:13 }}>{l}</a>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:12,fontWeight:700,color:'#4ade80',marginBottom:14,letterSpacing:'.08em' }}>تواصل</div>
                <div style={{ display:'flex',flexDirection:'column' as const,gap:10 }}>
                  <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer" style={{ color:'rgba(255,255,255,.4)',textDecoration:'none',fontSize:13 }}>واتساب</a>
                  <a href="mailto:support@storely.dev" style={{ color:'rgba(255,255,255,.4)',textDecoration:'none',fontSize:13 }}>support@storely.dev</a>
                </div>
              </div>
            </div>
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,.08)',paddingTop:24,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap' as const,gap:12 }}>
            <div style={{ fontSize:12,color:'rgba(255,255,255,.2)' }}>© {new Date().getFullYear()} Storely — جميع الحقوق محفوظة</div>
            <div style={{ fontSize:12,color:'rgba(255,255,255,.2)' }}>storely.dev</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
