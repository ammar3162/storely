'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PLANS = [
  { name:'الأساسية', price:'149', color:'#16a34a', popular:false,
    limits:['فرع واحد','2 موظفين','3 موردين'],
    features:['تتبع المخزون','تنبيهات واتساب','تقارير أساسية','—','—','—'] },
  { name:'المتوسطة', price:'249', color:'#16a34a', popular:true,
    limits:['3 فروع','10 موظفين','10 موردين'],
    features:['تتبع المخزون','تنبيهات واتساب','تقارير أساسية','تقارير متقدمة','دعم ذو أولوية','—'] },
  { name:'المتقدمة', price:'399', color:'#16a34a', popular:false,
    limits:['غير محدود','غير محدود','غير محدود'],
    features:['تتبع المخزون','تنبيهات واتساب','تقارير أساسية','تقارير متقدمة','دعم ذو أولوية','دعم 24/7'] },
]

const FEATURES = [
  { icon:'📦', title:'تتبع لحظي', desc:'راقب كل صنف في الوقت الحقيقي. كل صرف وكل شراء يُسجَّل فوراً.' },
  { icon:'📲', title:'واتساب تلقائي', desc:'تنبيه فوري لك وللمورد لما يوصل أي صنف للحد الأدنى.' },
  { icon:'👥', title:'إدارة الموظفين', desc:'كل موظف برمز PIN خاص يصرف من المخزون بدون وصول لبياناتك.' },
  { icon:'🌍', title:'7 لغات', desc:'واجهة موظفين بالعربي والإنجليزي والأردو والهندي والتاغالوغ والبنغالي والفرنسي.' },
  { icon:'📊', title:'تقارير ذكية', desc:'تقارير الصرف والمشتريات والجرد. صدّرها بـ CSV بضغطة واحدة.' },
  { icon:'🏪', title:'متعدد الفروع', desc:'أدر جميع فروعك من لوحة تحكم واحدة مع مخزون مستقل لكل فرع.' },
]

const TESTIMONIALS = [
  { name:'أحمد العتيبي', role:'صاحب مطعم — الرياض', text:'قبل Storely كنت أعرف نقص المواد بعد ما تنتهي. الحين يجيني واتساب قبل أي نقص بوقت كافي.' },
  { name:'سارة المطيري', role:'مديرة سلسلة كافيهات — جدة', text:'ثلاث فروع تحت عيني من جوالي. التقارير اليومية وفّرت علي ساعات من المتابعة.' },
  { name:'خالد الشمري', role:'صاحب صيدلية — الدمام', text:'الموظفين الأجانب يستخدمون النظام بلغتهم بدون أي مشكلة. أفضل قرار اتخذته.' },
]

function FaqItem({ q, a }: { q:string; a:string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{borderBottom:'1px solid #f3f4f6'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 0',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
        <span style={{fontSize:16,fontWeight:600,color:'#111827'}}>{q}</span>
        <span style={{fontSize:20,color:'#16a34a',transition:'transform .25s',transform:open?'rotate(45deg)':'none',flexShrink:0,marginRight:16}}>+</span>
      </button>
      {open && <p style={{paddingBottom:20,fontSize:14,color:'#6b7280',lineHeight:1.8}}>{a}</p>}
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',background:'white',color:'#111827'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        .nav-link{color:#4b5563;text-decoration:none;font-size:14px;font-weight:500;transition:color .2s}
        .nav-link:hover{color:#16a34a}
        .btn-primary{background:#16a34a;color:white;border:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .2s;text-decoration:none;display:inline-block}
        .btn-primary:hover{background:#15803d}
        .btn-outline{background:white;color:#111827;border:1.5px solid #e5e7eb;border-radius:8px;padding:11px 22px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;text-decoration:none;display:inline-block}
        .btn-outline:hover{border-color:#16a34a;color:#16a34a}
        .feat-card{background:white;border:1px solid #f3f4f6;border-radius:16px;padding:28px;transition:all .25s}
        .feat-card:hover{border-color:#e5e7eb;box-shadow:0 4px 20px rgba(0,0,0,.06)}
        .testi-card{background:#f9fafb;border-radius:16px;padding:28px}
        .plan-card{border:1.5px solid #e5e7eb;border-radius:16px;padding:28px;transition:all .2s;background:white}
        .plan-card:hover{border-color:#16a34a}
        .plan-card.popular{border-color:#16a34a;border-width:2px}
        @media(max-width:768px){
          .desk-nav{display:none!important}
          .mob-menu-btn{display:flex!important}
          .hero-h1{font-size:36px!important}
          .hero-btns{flex-direction:column!important}
          .feat-grid{grid-template-columns:1fr!important}
          .plan-grid{grid-template-columns:1fr!important}
          .testi-grid{grid-template-columns:1fr!important}
          .stats-row{flex-wrap:wrap!important;gap:20px!important}
          .footer-grid{grid-template-columns:1fr!important}
          .section-pad{padding:60px 20px!important}
        }
        @media(min-width:769px){.mob-menu-btn{display:none!important}.mob-menu{display:none!important}}
      `}</style>

      {/* NAVBAR */}
      <nav style={{position:'fixed',top:0,right:0,left:0,zIndex:1000,background:scrolled?'rgba(255,255,255,.97)':'white',borderBottom:scrolled?'1px solid #f3f4f6':'1px solid transparent',backdropFilter:scrolled?'blur(10px)':'none',transition:'all .3s',padding:'0 40px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17}}>🏪</div>
          <span style={{fontSize:18,fontWeight:800,color:'#111827',letterSpacing:'-0.3px'}}>Storely</span>
        </div>
        <div className="desk-nav" style={{display:'flex',gap:28,alignItems:'center'}}>
          {[['المميزات','#features'],['الأسعار','#pricing'],['آراء العملاء','#testimonials'],['الأسئلة','#faq']].map(([l,h])=>(
            <a key={h} href={h} className="nav-link">{l}</a>
          ))}
        </div>
        <div className="desk-nav" style={{display:'flex',gap:10,alignItems:'center'}}>
          <button onClick={()=>router.push('/login')} className="btn-outline" style={{padding:'8px 18px',fontSize:14}}>دخول</button>
          <button onClick={()=>router.push('/login?mode=register')} className="btn-primary" style={{padding:'9px 20px',fontSize:14}}>ابدأ مجاناً</button>
        </div>
        <button className="mob-menu-btn" onClick={()=>setMenuOpen(o=>!o)}
          style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#111827',padding:4}}>
          {menuOpen?'✕':'☰'}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mob-menu" style={{position:'fixed',top:64,right:0,left:0,zIndex:999,background:'white',borderBottom:'1px solid #f3f4f6',padding:'20px 24px',display:'flex',flexDirection:'column',gap:16}}>
          {[['المميزات','#features'],['الأسعار','#pricing'],['آراء العملاء','#testimonials']].map(([l,h])=>(
            <a key={h} href={h} onClick={()=>setMenuOpen(false)} style={{color:'#374151',textDecoration:'none',fontSize:16,fontWeight:500,padding:'8px 0',borderBottom:'1px solid #f9fafb'}}>{l}</a>
          ))}
          <button onClick={()=>router.push('/login?mode=register')} className="btn-primary" style={{textAlign:'center'}}>ابدأ مجاناً — مجاناً</button>
        </div>
      )}

      {/* HERO */}
      <section style={{paddingTop:120,paddingBottom:80,padding:'120px 40px 80px',textAlign:'center',maxWidth:900,margin:'0 auto'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:99,padding:'6px 16px',fontSize:13,fontWeight:600,color:'#16a34a',marginBottom:28}}>
          ✓ تجربة مجانية 7 أيام — لا يتطلب بطاقة ائتمانية
        </div>
        <h1 className="hero-h1" style={{fontSize:56,fontWeight:900,color:'#111827',lineHeight:1.1,marginBottom:20,letterSpacing:'-2px'}}>
          نظام إدارة المخزون<br/>
          <span style={{color:'#16a34a'}}>الأذكى في المنطقة</span>
        </h1>
        <p style={{fontSize:18,color:'#6b7280',maxWidth:560,margin:'0 auto 36px',lineHeight:1.7}}>
          تتبع مخزونك لحظة بلحظة، واستقبل تنبيهات واتساب عند نقص الأصناف، وأدر موظفيك وفروعك من مكان واحد
        </p>
        <div className="hero-btns" style={{display:'flex',gap:12,justifyContent:'center',marginBottom:56}}>
          <button onClick={()=>router.push('/login?mode=register')} className="btn-primary" style={{fontSize:16,padding:'14px 32px'}}>
            ابدأ تجربتك المجانية
          </button>
          <a href="#features" className="btn-outline" style={{fontSize:16,padding:'14px 28px'}}>اكتشف المميزات</a>
        </div>
        <div className="stats-row" style={{display:'flex',justifyContent:'center',gap:48}}>
          {[['149 ر.س','يبدأ من'],['7 أيام','مجاناً'],['7','لغات'],['24/7','تنبيهات']].map(([n,l])=>(
            <div key={l} style={{textAlign:'center'}}>
              <div style={{fontSize:26,fontWeight:900,color:'#111827'}}>{n}</div>
              <div style={{fontSize:12,color:'#9ca3af',marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Logos / Business types */}
      <div style={{background:'#f9fafb',padding:'28px 40px',textAlign:'center',borderTop:'1px solid #f3f4f6',borderBottom:'1px solid #f3f4f6'}}>
        <p style={{fontSize:13,color:'#9ca3af',marginBottom:20,fontWeight:500}}>يناسب جميع أنواع المنشآت</p>
        <div style={{display:'flex',justifyContent:'center',gap:12,flexWrap:'wrap'}}>
          {['🍔 مطاعم','☕ كافيهات','🥖 مخابز','🛒 بقاليات','💊 صيدليات','🏭 مستودعات','🛍️ متاجر'].map(b=>(
            <span key={b} style={{background:'white',border:'1px solid #e5e7eb',borderRadius:99,padding:'7px 16px',fontSize:13,fontWeight:600,color:'#374151'}}>{b}</span>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="section-pad" style={{padding:'80px 40px',maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:56}}>
          <p style={{fontSize:13,fontWeight:700,color:'#16a34a',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>المميزات</p>
          <h2 style={{fontSize:38,fontWeight:900,color:'#111827',marginBottom:14,letterSpacing:'-1px'}}>كل شي تحتاجه في مكان واحد</h2>
          <p style={{fontSize:16,color:'#6b7280',maxWidth:480,margin:'0 auto'}}>أدوات احترافية مصممة لاحتياجات المنشآت السعودية والخليجية</p>
        </div>
        <div className="feat-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
          {FEATURES.map((f,i)=>(
            <div key={i} className="feat-card">
              <div style={{width:48,height:48,borderRadius:12,background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,marginBottom:16}}>{f.icon}</div>
              <h3 style={{fontSize:17,fontWeight:700,color:'#111827',marginBottom:8}}>{f.title}</h3>
              <p style={{fontSize:14,color:'#6b7280',lineHeight:1.7}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section style={{background:'#f9fafb',padding:'80px 40px',borderTop:'1px solid #f3f4f6',borderBottom:'1px solid #f3f4f6'}}>
        <div style={{maxWidth:900,margin:'0 auto',textAlign:'center'}}>
          <p style={{fontSize:13,fontWeight:700,color:'#16a34a',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>كيف يعمل</p>
          <h2 style={{fontSize:38,fontWeight:900,color:'#111827',marginBottom:48,letterSpacing:'-1px'}}>ابدأ في 4 خطوات بسيطة</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            {[
              {n:'01',title:'سجّل منشأتك',desc:'أنشئ حساب وأضف بيانات منشأتك في دقيقتين'},
              {n:'02',title:'أضف مخزونك',desc:'أدخل منتجاتك أو اختر من القوالب الجاهزة'},
              {n:'03',title:'أضف موظفيك',desc:'كل موظف يحصل على رمز PIN للصرف'},
              {n:'04',title:'تحكم من أي مكان',desc:'راقب مخزونك واستقبل تقارير على جوالك'},
            ].map((s,i)=>(
              <div key={i} style={{background:'white',border:'1px solid #e5e7eb',borderRadius:14,padding:'24px 20px',textAlign:'right'}}>
                <div style={{fontSize:32,fontWeight:900,color:'#16a34a',marginBottom:12}}>{s.n}</div>
                <h3 style={{fontSize:15,fontWeight:700,color:'#111827',marginBottom:8}}>{s.title}</h3>
                <p style={{fontSize:13,color:'#6b7280',lineHeight:1.7}}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="section-pad" style={{padding:'80px 40px',maxWidth:1000,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:56}}>
          <p style={{fontSize:13,fontWeight:700,color:'#16a34a',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>آراء العملاء</p>
          <h2 style={{fontSize:38,fontWeight:900,color:'#111827',letterSpacing:'-1px'}}>ماذا يقول عملاؤنا؟</h2>
        </div>
        <div className="testi-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
          {TESTIMONIALS.map((t,i)=>(
            <div key={i} className="testi-card">
              <div style={{color:'#16a34a',fontSize:14,letterSpacing:2,marginBottom:14}}>★★★★★</div>
              <p style={{fontSize:14,color:'#374151',lineHeight:1.8,marginBottom:20}}>"{t.text}"</p>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:40,height:40,borderRadius:10,background:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'white',flexShrink:0}}>{t.name[0]}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'#111827'}}>{t.name}</div>
                  <div style={{fontSize:12,color:'#9ca3af',marginTop:1}}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{background:'#f9fafb',padding:'80px 40px',borderTop:'1px solid #f3f4f6',borderBottom:'1px solid #f3f4f6'}}>
        <div style={{maxWidth:1000,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:56}}>
            <p style={{fontSize:13,fontWeight:700,color:'#16a34a',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>الأسعار</p>
            <h2 style={{fontSize:38,fontWeight:900,color:'#111827',marginBottom:12,letterSpacing:'-1px'}}>باقات تناسب حجم عملك</h2>
            <p style={{fontSize:16,color:'#6b7280'}}>7 أيام تجربة مجانية على كل الباقات</p>
          </div>
          <div className="plan-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {PLANS.map((p,i)=>(
              <div key={i} className={`plan-card${p.popular?' popular':''}`}>
                {p.popular && <div style={{display:'inline-block',background:'#16a34a',color:'white',fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:99,marginBottom:16}}>الأكثر طلباً</div>}
                {!p.popular && <div style={{height:28,marginBottom:16}}/>}
                <div style={{fontSize:13,fontWeight:600,color:'#6b7280',marginBottom:8}}>{p.name}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:16}}>
                  <span style={{fontSize:42,fontWeight:900,color:'#111827',letterSpacing:'-1px'}}>{p.price}</span>
                  <span style={{fontSize:14,color:'#9ca3af'}}>ر.س/شهر</span>
                </div>
                <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
                  {p.limits.map((l,j)=>(
                    <span key={j} style={{background:'#f0fdf4',color:'#16a34a',fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:99,border:'1px solid #bbf7d0'}}>{l}</span>
                  ))}
                </div>
                <div style={{height:1,background:'#f3f4f6',marginBottom:18}}/>
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
                  {p.features.map((f,j)=>(
                    <div key={j} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:f==='—'?'#d1d5db':'#374151'}}>
                      <span style={{color:f==='—'?'#d1d5db':'#16a34a',fontWeight:700,flexShrink:0}}>{f==='—'?'—':'✓'}</span>
                      {f!=='—'&&f}
                    </div>
                  ))}
                </div>
                <button onClick={()=>router.push('/login?mode=register')}
                  style={{width:'100%',padding:'13px',background:p.popular?'#16a34a':'white',color:p.popular?'white':'#16a34a',border:`1.5px solid #16a34a`,borderRadius:9,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .2s'}}>
                  ابدأ تجربتك المجانية
                </button>
                <p style={{textAlign:'center',fontSize:11,color:'#9ca3af',marginTop:10}}>7 أيام مجاناً · لا يتطلب بطاقة</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:'80px 40px',textAlign:'center',background:'#16a34a'}}>
        <div style={{maxWidth:600,margin:'0 auto'}}>
          <h2 style={{fontSize:38,fontWeight:900,color:'white',marginBottom:14,letterSpacing:'-1px'}}>جاهز تبدأ؟</h2>
          <p style={{fontSize:17,color:'rgba(255,255,255,.8)',marginBottom:36,lineHeight:1.7}}>
            سجّل الآن واستمتع بـ 7 أيام تجربة مجانية كاملة
          </p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={()=>router.push('/login?mode=register')}
              style={{background:'white',color:'#16a34a',border:'none',borderRadius:9,padding:'14px 32px',fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
              سجّل مجاناً الآن
            </button>
            <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer"
              style={{display:'flex',alignItems:'center',gap:8,padding:'14px 24px',borderRadius:9,background:'rgba(255,255,255,.15)',color:'white',textDecoration:'none',fontSize:15,fontWeight:700,border:'1.5px solid rgba(255,255,255,.3)'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              تواصل معنا
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{padding:'80px 40px',maxWidth:700,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:48}}>
          <p style={{fontSize:13,fontWeight:700,color:'#16a34a',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>الأسئلة الشائعة</p>
          <h2 style={{fontSize:38,fontWeight:900,color:'#111827',letterSpacing:'-1px'}}>عندك سؤال؟</h2>
        </div>
        {[
          {q:'هل فيه تجربة مجانية؟',a:'نعم — 7 أيام مجانية كاملة بدون بطاقة ائتمانية. استكشف جميع المميزات من أول يوم.'},
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
                <div style={{width:32,height:32,borderRadius:8,background:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🏪</div>
                <span style={{fontSize:18,fontWeight:800,color:'white'}}>Storely</span>
              </div>
              <p style={{fontSize:13,color:'#6b7280',lineHeight:1.7,maxWidth:220}}>منصة إدارة المخزون الذكية للمنشآت السعودية والخليجية</p>
            </div>
            {[
              {title:'المنصة',links:[['تسجيل الدخول','/login'],['إنشاء حساب','/login?mode=register'],['الأسعار','#pricing']]},
              {title:'قانوني',links:[['سياسة الخصوصية','/privacy'],['الشروط والأحكام','/terms']]},
              {title:'تواصل',links:[['واتساب','https://wa.me/966594351667'],['البريد الإلكتروني','mailto:support@storely.dev']]},
            ].map((col,i)=>(
              <div key={i}>
                <div style={{fontSize:12,fontWeight:700,color:'#9ca3af',marginBottom:14,letterSpacing:'.08em',textTransform:'uppercase'}}>{col.title}</div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {col.links.map(([l,h])=>(
                    <a key={l} href={h} style={{color:'#6b7280',textDecoration:'none',fontSize:14,transition:'color .2s'}}
                      onMouseEnter={e=>(e.currentTarget.style.color='white')}
                      onMouseLeave={e=>(e.currentTarget.style.color='#6b7280')}>{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{borderTop:'1px solid #1f2937',paddingTop:24,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <div style={{fontSize:13,color:'#4b5563'}}>© {new Date().getFullYear()} Storely — جميع الحقوق محفوظة</div>
            <div style={{fontSize:13,color:'#4b5563'}}>storely.dev</div>
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
