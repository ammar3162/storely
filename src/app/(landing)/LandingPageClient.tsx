'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, MessageCircle, Users, Wallet, Globe, BarChart3, Store, Bot, ShoppingBag } from 'lucide-react'

type Billing = 'monthly'|'yearly'

const PLAN_BRANCHES = [1, 3, 10]

const PLANS = [
  { name:'الأساسية', price:'149', yearlyPrice:'1430', color:'#15803d', popular:false,
    limits:['فرع واحد','2 موظفين','3 موردين'],
    features:['تتبع المخزون لحظياً','صرف يومي بصلاحيات موظفين','المشتريات وإدارة الموردين','تنبيهات واتساب تلقائية','كشف الهدر','تقارير أساسية قابلة للتصدير','نسخ احتياطي يومي','دعم عبر واتساب'] },
  { name:'المتوسطة', price:'249', yearlyPrice:'2390', color:'#15803d', popular:true,
    limits:['3 فروع','10 موظفين','10 موردين'],
    features:['تتبع المخزون','تنبيهات واتساب','إدارة الموظفين','تقارير أساسية','إدارة الموردين','تقارير متقدمة','إقفال الكاشير اليومي','الحضور والانصراف بـGPS 📍','اقتراح الشراء الذكي 🤖','توقع نفاد المخزون 🔮','تحليل الموسمية','تحسين نقطة إعادة الطلب 🎯'] },
  { name:'المتقدمة', price:'399', yearlyPrice:'3830', color:'#15803d', popular:false,
    limits:['غير محدود','غير محدود','غير محدود'],
    features:['تتبع المخزون','تنبيهات واتساب','إدارة الموظفين','تقارير أساسية','إدارة الموردين','تقارير متقدمة','إقفال الكاشير اليومي','الحضور والانصراف بـGPS 📍','اقتراح الشراء الذكي 🤖','توقع نفاد المخزون 🔮','تحليل الموسمية','تحسين نقطة إعادة الطلب 🎯','مقارنة الفروع 🤖','المخزون الراكد 🐌','كشف الهدر الحقيقي 🗑️','دعم ذو أولوية','دعم 24/7'] },
]

const FEATURES = [
  { icon:Package, title:'تتبع لحظي', desc:'راقب كل صنف في الوقت الحقيقي. كل صرف وكل شراء يُسجَّل فوراً.' },
  { icon:MessageCircle, title:'واتساب تلقائي', desc:'تنبيه فوري لك وللمورد لما يوصل أي صنف للحد الأدنى.' },
  { icon:Users, title:'إدارة الموظفين', desc:'كل موظف برمز PIN خاص يصرف من المخزون بدون وصول لبياناتك.' },
  { icon:Wallet, title:'إقفال الكاشير اليومي', desc:'تسوية الصندوق بخطوات بسيطة مع صور إثبات، وتنبيه واتساب فوري لك عند أي عجز أو زيادة.' },
  { icon:Globe, title:'7 لغات', desc:'واجهة موظفين بالعربي والإنجليزي والأردو والهندي والتاغالوغ والبنغالي والفرنسي.' },
  { icon:BarChart3, title:'تقارير ذكية', desc:'تقارير الصرف والمشتريات والجرد وإقفال الكاشير. صدّرها بـ PDF أو CSV بضغطة واحدة.' },
  { icon:Store, title:'متعدد الفروع', desc:'أدر جميع فروعك من لوحة تحكم واحدة مع مخزون مستقل لكل فرع.' },
  { icon:Bot, title:'أدوات الذكاء الاصطناعي', desc:'اقتراح الشراء الذكي بناءً على اتجاه استهلاكك الفعلي، ومقارنة أداء الفروع تلقائياً.' },
  { icon:ShoppingBag, title:'المتجر — حل تقني متكامل', desc:'صفحة عرض منتجات أنيقة برابط أو QR + نظام حجوزات إلكتروني كامل بلوحة إدارة للكاشير وإشعارات واتساب تلقائية — كل شي تحت سقف واحد.', badge:'حل تقني' },
]

const TRUST_POINTS = [
  { icon:'🔒', label:'بياناتك محمية بنسخ احتياطي يومي' },
  { icon:'⚡', label:'إعداد حسابك خلال دقائق' },
  { icon:'📱', label:'دعم عربي كامل عبر واتساب' },
  { icon:'🌍', label:'واجهة موظفين بـ7 لغات' },
]

const BRANCH_OPTIONS = ['فرع واحد','2-3 فروع','4-10 فروع','أكثر من 10 فروع']


function FaqItem({ q, a }: { q:string; a:string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{borderBottom:'1px solid #f3f4f6'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 0',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
        <span style={{fontSize:16,fontWeight:600,color:'#111827'}}>{q}</span>
        <span style={{fontSize:20,color:'#15803d',transition:'transform .25s',transform:open?'rotate(45deg)':'none',flexShrink:0,marginRight:16}}>+</span>
      </button>
      {open && <p style={{paddingBottom:20,fontSize:14,color:'#6b7280',lineHeight:1.8}}>{a}</p>}
    </div>
  )
}

function MiniMockup({ variant }: { variant: 'stats'|'whatsapp'|'staff'|'chart' }) {
  if (variant === 'whatsapp') return (
    <div style={{background:'white',borderRadius:16,padding:16,height:'100%',display:'flex',flexDirection:'column',gap:8,justifyContent:'center'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
        <div style={{width:26,height:26,borderRadius:8,background:'#25d366',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>📲</div>
        <span style={{fontSize:11,fontWeight:800,color:'#111827'}}>تنبيه واتساب</span>
      </div>
      <div style={{background:'#dcf8c6',borderRadius:'10px 10px 10px 2px',padding:'8px 10px',fontSize:11,color:'#111827',lineHeight:1.6}}>
        ⚠️ صنف "جبنة شيدر" وصل للحد الأدنى — 3 كيلو متبقية فقط
      </div>
    </div>
  )
  if (variant === 'staff') return (
    <div style={{background:'white',borderRadius:16,padding:16,height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10}}>
      <div style={{fontSize:11,fontWeight:700,color:'#6b7280'}}>ادخل رمزك</div>
      <div style={{display:'flex',gap:6}}>
        {[1,2,3,4].map(i=><div key={i} style={{width:22,height:26,borderRadius:6,background:'#f0fdf4',border:'1.5px solid #15803d'}}/>)}
      </div>
      <div style={{fontSize:9,color:'#9ca3af'}}>موظف: محمد أمين</div>
    </div>
  )
  if (variant === 'chart') return (
    <div style={{background:'white',borderRadius:16,padding:16,height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',gap:8}}>
      <div style={{fontSize:11,fontWeight:800,color:'#111827',marginBottom:2}}>اتجاه الاستهلاك الشهري</div>
      <div style={{display:'flex',alignItems:'flex-end',gap:5,height:50}}>
        {[40,65,50,80,60,90].map((h,i)=><div key={i} style={{flex:1,height:`${h}%`,background:i===5?'#15803d':'#d1fae5',borderRadius:3}}/>)}
      </div>
    </div>
  )
  return (
    <div style={{background:'white',borderRadius:16,padding:18,height:'100%'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
        {[['15','صرف اليوم','#15803d'],['4','ناقص','#dc2626'],['72','بالمخزون','#2563eb']].map(([v,l,c])=>(
          <div key={l} style={{background:'#f8fafc',borderRadius:10,padding:'10px 6px',textAlign:'center' as const}}>
            <div style={{fontSize:16,fontWeight:900,color:c}}>{v}</div>
            <div style={{fontSize:8,color:'#9ca3af',marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {[['جبنة شيدر','−2','#dc2626'],['صوص باربكيو','−1','#dc2626'],['علبة مايونيز','+10','#15803d']].map(([n,q,c])=>(
          <div key={n} style={{display:'flex',justifyContent:'space-between',padding:'7px 10px',background:'#fafafa',borderRadius:8}}>
            <span style={{fontSize:11,color:'#374151',fontWeight:600}}>{n}</span>
            <span style={{fontSize:11,fontWeight:800,color:c}}>{q}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<Billing>('monthly')
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [form, setForm] = useState({firstName:'',lastName:'',phone:'',email:'',businessName:'',branchCount:''})
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ok:boolean,text:string}|null>(null)
  const [partners, setPartners] = useState<any[]>([])
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
    const fn=()=>setScrolled(window.scrollY>50)
    window.addEventListener('scroll',fn)
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

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',background:'white',color:'#111827'}}>
      <style>{`
        @keyframes marqueeScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800;900&family=Noto+Naskh+Arabic:wght@500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        .nav-link{color:#4b5563;text-decoration:none;font-size:14px;font-weight:500;transition:color .2s}
        .nav-link:hover{color:#15803d}
        .btn-primary{background:#15803d;color:white;border:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .2s;text-decoration:none;display:inline-block}
        .btn-primary:hover{background:#14532d}
        .btn-outline{background:white;color:#111827;border:1.5px solid #e5e7eb;border-radius:8px;padding:11px 22px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;text-decoration:none;display:inline-block}
        .btn-outline:hover{border-color:#15803d;color:#15803d}
        .feat-card{background:white;border:1px solid #f3f4f6;border-radius:16px;padding:28px;transition:all .25s}
        .feat-card:hover{border-color:#e5e7eb;box-shadow:0 4px 20px rgba(0,0,0,.06)}
        .plan-card{border:1.5px solid #e5e7eb;border-radius:16px;padding:28px;transition:all .2s;background:white}
        .plan-card:hover{border-color:#15803d}
        .plan-card.popular{border-color:#15803d;border-width:2px}
        .demo-input{width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s}
        .demo-input:focus{border-color:#15803d}
        @media(max-width:768px){
          .desk-nav{display:none!important}
          .mob-menu-btn{display:flex!important}
          .hero-h1{font-size:34px!important}
          .hero-btns{flex-direction:column!important}
          .collage-grid{grid-template-columns:1fr 1fr!important;height:auto!important}
          .feat-grid{grid-template-columns:1fr!important}
          .plan-grid{grid-template-columns:1fr!important}
          .stats-row{flex-wrap:wrap!important;gap:20px!important}
          .footer-grid{grid-template-columns:1fr!important}
          .demo-grid{grid-template-columns:1fr!important}
          .demo-fields{grid-template-columns:1fr!important}
          .section-pad{padding:60px 20px!important}
        }
        @media(min-width:769px){.mob-menu-btn{display:none!important}.mob-menu{display:none!important}}
      `}</style>

      {/* MARQUEE */}
      {hasMarquee && (
        <div style={{position:'fixed',top:0,right:0,left:0,zIndex:1001,height:36,background:'#15803d',overflow:'hidden',display:'flex',alignItems:'center'}}>
          <div style={{display:'flex',whiteSpace:'nowrap' as const,animation:'marqueeScroll 35s linear infinite'}}>
            {[...Array(2)].map((_,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center'}}>
                {marqueeMsgs.map((m,j)=>(
                  <span key={j} style={{color:'white',fontSize:13,fontWeight:700,padding:'0 24px',display:'flex',alignItems:'center',gap:8}}>
                    {m}
                    <span style={{opacity:.5}}>•</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <div style={{background:'linear-gradient(155deg,#0a1f13 0%,#123822 45%,#1a4f31 100%)',paddingBottom:80,position:'relative' as const,overflow:'hidden'}}>
        <div style={{position:'absolute' as const,top:-120,left:-120,width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(255,255,255,.06),transparent 70%)'}}/>
        <div style={{position:'absolute' as const,bottom:-160,right:-100,width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(255,255,255,.05),transparent 70%)'}}/>

        <nav style={{position:'fixed',top:hasMarquee?36:0,right:0,left:0,zIndex:1000,background:scrolled?'rgba(10,31,19,.92)':'transparent',borderBottom:scrolled?'1px solid rgba(255,255,255,.08)':'1px solid transparent',backdropFilter:scrolled?'blur(10px)':'none',transition:'all .3s',padding:'0 40px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <img src="/storely-logo.png" alt="Storely" style={{width:38,height:38,borderRadius:10,objectFit:'cover'}}/>
            <span style={{fontSize:18,fontWeight:800,color:'white',letterSpacing:'-0.3px'}}>Storely</span>
          </div>
          <div className="desk-nav" style={{display:'flex',gap:28,alignItems:'center'}}>
            {[['المميزات','#features'],['الأسعار','#pricing'],['الأسئلة','#faq']].map(([l,h])=>(
              <a key={h} href={h} style={{color:'rgba(255,255,255,.75)',textDecoration:'none',fontSize:14,fontWeight:500,transition:'color .2s'}}>{l}</a>
            ))}
          </div>
          <div className="desk-nav" style={{display:'flex',gap:10,alignItems:'center'}}>
            <button onClick={()=>router.push('/login')} style={{padding:'8px 18px',fontSize:14,fontWeight:700,background:'transparent',color:'white',border:'1px solid rgba(255,255,255,.25)',borderRadius:99,cursor:'pointer',fontFamily:'inherit'}}>دخول</button>
            <a href="#demo" style={{padding:'9px 20px',fontSize:14,fontWeight:700,background:'white',color:'#0a1f13',borderRadius:99,textDecoration:'none'}}>اطلب عرض النظام</a>
          </div>
          <button className="mob-menu-btn" onClick={()=>setMenuOpen(o=>!o)}
            style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'white',padding:4}}>
            {menuOpen?'✕':'☰'}
          </button>
        </nav>

        {menuOpen && (
          <div className="mob-menu" style={{position:'fixed',top:hasMarquee?100:64,right:0,left:0,zIndex:999,background:'#0a1f13',borderBottom:'1px solid rgba(255,255,255,.08)',padding:'20px 24px',display:'flex',flexDirection:'column',gap:16}}>
            {[['المميزات','#features'],['الأسعار','#pricing'],['الأسئلة','#faq']].map(([l,h])=>(
              <a key={h} href={h} onClick={()=>setMenuOpen(false)} style={{color:'rgba(255,255,255,.85)',textDecoration:'none',fontSize:16,fontWeight:500,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.08)'}}>{l}</a>
            ))}
            <a href="#demo" onClick={()=>setMenuOpen(false)} style={{textAlign:'center',padding:'12px',background:'white',color:'#0a1f13',borderRadius:99,fontWeight:700,textDecoration:'none'}}>اطلب عرض النظام</a>
          </div>
        )}

        {/* HERO */}
        <section style={{paddingTop:hasMarquee?166:130,paddingBottom:8,padding:hasMarquee?'166px 40px 8px':'130px 40px 8px',maxWidth:1000,margin:'0 auto',textAlign:'center' as const,position:'relative' as const,zIndex:1}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.18)',borderRadius:99,padding:'7px 18px',fontSize:13,fontWeight:600,color:'white',marginBottom:28}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#4ade80'}}/>
            تجربة مجانية 14 يوماً — بدون بطاقة ائتمانية
          </div>
          <h1 className="hero-h1" style={{fontFamily:"'Noto Naskh Arabic',serif",fontSize:58,fontWeight:600,color:'white',lineHeight:1.25,marginBottom:22,letterSpacing:'-0.5px',maxWidth:820,margin:'0 auto 22px'}}>
            نصمّم مستقبل الإدارة الذكية<br/>
            <span style={{color:'#86efac',fontStyle:'italic' as const}}>لكل منشأة تطمح للنمو</span>
          </h1>
          <p style={{fontSize:17,color:'rgba(255,255,255,.65)',maxWidth:580,margin:'0 auto 34px',lineHeight:1.7}}>
            من المخزون والمشتريات، لصفحة عرض منتجاتك والحجوزات الإلكترونية، وإدارة الموظفين والفروع — كل شي بمكان واحد
          </p>
          <div className="hero-btns" style={{display:'flex',gap:12,justifyContent:'center',marginBottom:56}}>
            <a href="#demo" style={{fontSize:16,padding:'14px 28px',background:'transparent',color:'white',border:'1.5px solid rgba(255,255,255,.3)',borderRadius:99,textDecoration:'none',fontWeight:700}}>جرب نظام Storely</a>
            <button onClick={()=>router.push('/login?mode=register')} style={{fontSize:16,padding:'14px 32px',background:'white',color:'#0a1f13',border:'none',borderRadius:99,cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>
              ابدأ تجربتك المجانية
            </button>
          </div>
        </section>

        {/* شعارات العملاء — فوق الخلفية الملوّنة مباشرة، زي Tines */}
        {partners.length > 0 && (
          <div style={{maxWidth:1000,margin:'0 auto',padding:'0 40px',position:'relative' as const,zIndex:1}}>
            <p style={{textAlign:'center' as const,fontSize:12,fontWeight:700,color:'rgba(255,255,255,.4)',letterSpacing:'.1em',textTransform:'uppercase' as const,marginBottom:24}}>موثوق من قبل منشآت رائدة</p>
            <div style={{display:'flex',flexWrap:'wrap' as const,gap:36,justifyContent:'center',alignItems:'center',opacity:.85}}>
              {partners.map((p:any)=>(
                <img key={p.id} src={p.logo_url} alt={p.name} style={{height:26,maxWidth:110,objectFit:'contain',filter:'brightness(0) invert(1)',opacity:.75}}/>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* شبكة معاينات — تطفو فوق حافة الخلفية الملوّنة، زي بطاقات Tines */}
      <div style={{maxWidth:1100,margin:'-60px auto 0',padding:'0 40px',position:'relative' as const,zIndex:2}}>
        <div className="collage-grid" style={{display:'grid',gridTemplateColumns:'1.1fr 0.9fr 0.9fr 1.3fr',gap:14,height:340,boxShadow:'0 30px 70px rgba(0,0,0,.18)',borderRadius:24}}>
          <div style={{background:'linear-gradient(160deg,#f0fdf4,#dcfce7)',borderRadius:20,padding:10}}><MiniMockup variant="whatsapp"/></div>
          <div style={{background:'linear-gradient(160deg,#eff6ff,#dbeafe)',borderRadius:20,padding:10}}><MiniMockup variant="staff"/></div>
          <div style={{background:'linear-gradient(160deg,#fefce8,#fef9c3)',borderRadius:20,padding:10}}><MiniMockup variant="chart"/></div>
          <div style={{background:'linear-gradient(160deg,#f0fdf4,#bbf7d0)',borderRadius:20,padding:10}}><MiniMockup variant="stats"/></div>
        </div>

        <div className="stats-row" style={{display:'flex',gap:40,justifyContent:'center',marginTop:48}}>
          {[['149 ر.س','يبدأ من'],['14 يوم','مجاناً'],['7','لغات'],['24/7','تنبيهات']].map(([n,l])=>(
            <div key={l}>
              <div style={{fontSize:24,fontWeight:900,color:'#111827'}}>{n}</div>
              <div style={{fontSize:12,color:'#9ca3af',marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TRUST */}
      <section style={{padding:'50px 40px',background:'#fafafa',borderTop:'1px solid #f3f4f6',borderBottom:'1px solid #f3f4f6'}}>
        <div style={{maxWidth:1000,margin:'0 auto',textAlign:'center' as const}}>
          <h2 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:32}}>نبني الثقة مع منشآت في كل مكان</h2>
          <div style={{display:'flex',flexWrap:'wrap' as const,gap:28,justifyContent:'center'}}>
            {TRUST_POINTS.map((t,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,background:'white',border:'1px solid #f3f4f6',borderRadius:99,padding:'10px 18px'}}>
                <span style={{fontSize:16}}>{t.icon}</span>
                <span style={{fontSize:13,fontWeight:600,color:'#374151'}}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section-pad" style={{padding:'90px 40px',maxWidth:1200,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:56}}>
          <p style={{fontSize:13,fontWeight:700,color:'#15803d',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>المميزات</p>
          <h2 style={{fontSize:38,fontWeight:900,color:'#111827',letterSpacing:'-1px'}}>كل شي تحتاجه لإدارة مخزونك</h2>
        </div>
        <div className="feat-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20}}>
          {FEATURES.map((f,i)=>(
            <div key={i} className="feat-card">
              <div style={{width:52,height:52,borderRadius:14,background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,color:'#16a34a'}}>
                <f.icon size={24} strokeWidth={2}/>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap' as const}}>
                <div style={{fontSize:17,fontWeight:800,color:'#111827'}}>{f.title}</div>
                {(f as any).badge && (
                  <span style={{fontSize:11,fontWeight:800,color:'#16a34a',background:'#f0fdf4',border:'1px solid #bbf7d0',padding:'2px 9px',borderRadius:99}}>{(f as any).badge}</span>
                )}
              </div>
              <div style={{fontSize:14,color:'#6b7280',lineHeight:1.7}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO REQUEST FORM */}
      <section id="demo" className="section-pad" style={{padding:'90px 40px',background:'#fafafa'}}>
        <div className="demo-grid" style={{maxWidth:1000,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,borderRadius:20,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.08)'}}>
          <form onSubmit={submitDemoRequest} style={{background:'white',padding:40}}>
            <h2 style={{fontSize:24,fontWeight:900,color:'#111827',marginBottom:6}}>اطلب عرض النظام</h2>
            <p style={{fontSize:14,color:'#6b7280',marginBottom:24}}>عبّي بياناتك وبنتواصل معك خلال ساعات عبر واتساب</p>
            {submitMsg && (
              <div style={{background:submitMsg.ok?'#f0fdf4':'#fef2f2',border:`1px solid ${submitMsg.ok?'#bbf7d0':'#fecaca'}`,borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,fontWeight:600,color:submitMsg.ok?'#15803d':'#dc2626'}}>
                {submitMsg.text}
              </div>
            )}
            <div className="demo-fields" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>الاسم *</label>
                <input required className="demo-input" value={form.firstName} onChange={e=>setForm(f=>({...f,firstName:e.target.value}))}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>اسم العائلة *</label>
                <input required className="demo-input" value={form.lastName} onChange={e=>setForm(f=>({...f,lastName:e.target.value}))}/>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>رقم الهاتف *</label>
              <input required type="tel" placeholder="05xxxxxxxx" className="demo-input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني *</label>
              <input required type="email" className="demo-input" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
            </div>
            <div className="demo-fields" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>اسم المنشأة *</label>
                <input required className="demo-input" value={form.businessName} onChange={e=>setForm(f=>({...f,businessName:e.target.value}))}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>عدد الفروع</label>
                <select className="demo-input" value={form.branchCount} onChange={e=>setForm(f=>({...f,branchCount:e.target.value}))}>
                  <option value="">يرجى التحديد</option>
                  {BRANCH_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <label style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:12,color:'#6b7280',marginBottom:20,cursor:'pointer'}}>
              <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{marginTop:2}}/>
              أؤكد أني قرأت وأوافق على <a href="/terms" target="_blank" style={{color:'#15803d'}}>الشروط والأحكام</a> و<a href="/privacy" target="_blank" style={{color:'#15803d'}}>سياسة الخصوصية</a>
            </label>
            <button type="submit" disabled={submitting} className="btn-primary" style={{width:'100%',padding:'13px',fontSize:15,opacity:submitting?.6:1}}>
              {submitting?'⏳ جاري الإرسال...':'إرسال الطلب'}
            </button>
          </form>
          <div style={{background:'linear-gradient(160deg,#15803d,#14532d)',padding:40,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',textAlign:'center' as const}}>
            <div style={{width:70,height:70,borderRadius:18,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,marginBottom:20}}>📦</div>
            <h3 style={{fontSize:22,fontWeight:900,color:'white',marginBottom:12,lineHeight:1.4}}>اطلب تجربة نظام Storely لإدارة المخزون مجاناً</h3>
            <p style={{fontSize:14,color:'rgba(255,255,255,.85)',lineHeight:1.8}}>بنساعدك تختار الباقة الأنسب لمنشأتك، ونجاوب على كل أسئلتك مباشرة</p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="section-pad" style={{padding:'90px 40px',maxWidth:1200,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <p style={{fontSize:13,fontWeight:700,color:'#15803d',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>الأسعار</p>
          <h2 style={{fontSize:38,fontWeight:900,color:'#111827',letterSpacing:'-1px'}}>باقة تناسب كل حجم منشأة</h2>
        </div>
        <div style={{display:'flex',justifyContent:'center',marginBottom:40}}>
          <div style={{display:'inline-flex',gap:4,background:'#f3f4f6',padding:4,borderRadius:12}}>
            <button onClick={()=>setBilling('monthly')} style={{padding:'9px 20px',borderRadius:9,border:'none',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',background:billing==='monthly'?'white':'transparent',color:billing==='monthly'?'#111827':'#6b7280',boxShadow:billing==='monthly'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>شهري</button>
            <button onClick={()=>setBilling('yearly')} style={{padding:'9px 20px',borderRadius:9,border:'none',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,background:billing==='yearly'?'white':'transparent',color:billing==='yearly'?'#111827':'#6b7280',boxShadow:billing==='yearly'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
              سنوي <span style={{background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:99}}>وفّر 20%</span>
            </button>
          </div>
        </div>
        <div className="plan-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20}}>
          {PLANS.map((p,i)=>(
            <div key={i} className={`plan-card${p.popular?' popular':''}`} style={{position:'relative'}}>
              {p.popular && <div style={{position:'absolute',top:-13,right:24,background:'#15803d',color:'white',fontSize:11,fontWeight:800,padding:'4px 12px',borderRadius:99}}>الأكثر شيوعاً</div>}
              <div style={{fontSize:16,fontWeight:800,color:'#111827',marginBottom:8}}>{p.name}</div>
              <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:10}}>
                <span style={{fontSize:34,fontWeight:900,color:'#111827'}}>{billing==='yearly'?p.yearlyPrice:p.price}</span>
                <span style={{fontSize:14,color:'#9ca3af'}}>ر.س / {billing==='yearly'?'سنوياً':'شهرياً'}</span>
              </div>
              <div style={{display:'inline-block',background:'#f0fdf4',color:'#15803d',fontSize:11,fontWeight:800,padding:'3px 10px',borderRadius:99,marginBottom:16}}>{p.features.length} ميزة متاحة</div>
              <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:16,paddingBottom:16,borderBottom:'1px solid #f3f4f6'}}>
                {p.limits.map((l,j)=><div key={j} style={{fontSize:13,color:'#6b7280'}}>• {l}</div>)}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
                {p.features.map((f,j)=>(
                  <div key={j} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#374151'}}>
                    <span style={{color:'#15803d'}}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={()=>router.push(`/login?mode=register&branches=${PLAN_BRANCHES[i]}&billing=${billing}`)} className={p.popular?'btn-primary':'btn-outline'} style={{width:'100%',textAlign:'center' as const}}>ابدأ الآن</button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{background:'linear-gradient(135deg,#15803d,#14532d)',padding:'70px 40px',textAlign:'center' as const}}>
        <h2 style={{fontSize:32,fontWeight:900,color:'white',marginBottom:14}}>جاهز تبدأ؟</h2>
        <p style={{fontSize:16,color:'rgba(255,255,255,.85)',marginBottom:32}}>جرّب Storely مجاناً 14 يوماً — بدون بطاقة ائتمانية</p>
        <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap' as const}}>
          <button onClick={()=>router.push('/login?mode=register')}
            style={{background:'white',color:'#15803d',border:'none',borderRadius:9,padding:'14px 32px',fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
            سجّل مجاناً الآن
          </button>
          <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer"
            style={{display:'flex',alignItems:'center',gap:8,padding:'14px 24px',borderRadius:9,background:'rgba(255,255,255,.15)',color:'white',textDecoration:'none',fontSize:15,fontWeight:700,border:'1.5px solid rgba(255,255,255,.3)'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            تواصل معنا
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{padding:'80px 40px',maxWidth:700,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:48}}>
          <p style={{fontSize:13,fontWeight:700,color:'#15803d',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>الأسئلة الشائعة</p>
          <h2 style={{fontSize:38,fontWeight:900,color:'#111827',letterSpacing:'-1px'}}>عندك سؤال؟</h2>
        </div>
        {[
          {q:'هل فيه تجربة مجانية؟',a:'نعم — 14 يوماً مجانية كاملة بدون بطاقة ائتمانية. استكشف جميع المميزات من أول يوم.'},
          {q:'كيف يتم الدفع؟',a:'الدفع عبر تحويل بنكي. بعد التحويل يتم تفعيل حسابك خلال 24 ساعة.'},
          {q:'كم عدد الموردين في كل باقة؟',a:'الأساسية: 3 موردين، المتوسطة: 10 موردين، المتقدمة: غير محدود.'},
          {q:'هل يدعم متعدد الفروع؟',a:'نعم — الأساسية: فرع واحد، المتوسطة: 3 فروع، المتقدمة: فروع غير محدودة.'},
          {q:'هل الموظفون يحتاجون تدريب؟',a:'لا — واجهة الموظفين بسيطة جداً بضغطة واحدة، وتدعم 7 لغات لأي جنسية.'},
          {q:'هل يمكن الإلغاء في أي وقت؟',a:'نعم — لا يوجد عقود. يمكنك إلغاء اشتراكك في أي وقت.'},
        ].map((f,i)=><FaqItem key={i} q={f.q} a={f.a}/>)}
      </section>

      {/* FOOTER */}
      <footer style={{background:'#111827',padding:'56px 40px 32px'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div className="footer-grid" style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:40,marginBottom:48}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <img src="/storely-logo.png" alt="Storely" style={{width:32,height:32,borderRadius:8}}/>
                <span style={{fontSize:18,fontWeight:800,color:'white'}}>Storely</span>
              </div>
              <p style={{fontSize:13,color:'white',lineHeight:1.7,maxWidth:220}}>منصة إدارة المخزون الذكية لكل المنشآت</p>
            </div>
            {[
              {title:'المنصة',links:[['تسجيل الدخول','/login'],['إنشاء حساب','/login?mode=register'],['الأسعار','#pricing']]},
              {title:'قانوني',links:[['سياسة الخصوصية','/privacy'],['الشروط والأحكام','/terms'],['سياسة الأمان','/security']]},
              {title:'تواصل',links:[['واتساب','https://wa.me/966594351667'],['البريد الإلكتروني','mailto:support@storely.dev']]},
            ].map((col,i)=>(
              <div key={i}>
                <div style={{fontSize:12,fontWeight:700,color:'#9ca3af',marginBottom:14,letterSpacing:'.08em',textTransform:'uppercase'}}>{col.title}</div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {col.links.map(([l,h])=>(
                    <a key={l} href={h} style={{color:'white',textDecoration:'none',fontSize:14,transition:'color .2s'}}
                      onMouseEnter={e=>(e.currentTarget.style.color='#4ade80')}
                      onMouseLeave={e=>(e.currentTarget.style.color='white')}>{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{borderTop:'1px solid #1f2937',paddingTop:24,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{fontSize:13,color:'white'}}>جميع الحقوق محفوظة لدى Storely {new Date().getFullYear()} ©</div>
              <div style={{fontSize:11,color:'#6b7280',marginTop:6}}>مؤسسة باسم علي خلوي لتقنية المعلومات، رقم السجل التجاري 7055023522</div>
            </div>
            <div style={{fontSize:13,color:'white'}}>storely.dev</div>
          </div>
        </div>
      </footer>

      {/* WhatsApp */}
      <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer"
        style={{position:'fixed',bottom:24,left:24,zIndex:9999,width:52,height:52,borderRadius:'50%',background:'#25d366',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(37,211,102,.35)',textDecoration:'none',transition:'transform .2s'}}
        onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.1)')}
        onMouseLeave={e=>(e.currentTarget.style.transform='none')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>
    </div>
  )
}
