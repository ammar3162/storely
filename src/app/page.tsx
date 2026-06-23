'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const FEATURES = [
  { icon: '📦', title: 'تتبع المخزون', desc: 'راقب كميات منتجاتك لحظة بلحظة مع تنبيهات فورية عند نقص المخزون' },
  { icon: '🌍', title: 'واجهة متعددة اللغات', desc: 'صفحة الموظفين تدعم 7 لغات — عربي، إنجليزي، أردو، هندي، تاغالوغ، بنغالي، فرنسي' },
  { icon: '📲', title: 'تنبيهات واتساب', desc: 'استقبل إشعارات فورية على واتساب لما يوصل أي صنف للحد الأدنى' },
  { icon: '👥', title: 'إدارة الموظفين', desc: 'أضف موظفين بصلاحيات صرف فقط عبر رمز PIN بدون كلمة مرور' },
  { icon: '📊', title: 'تقارير متقدمة', desc: 'تقارير الصرف والمشتريات مع تصدير CSV وإحصائيات تفصيلية' },
  { icon: '🏪', title: 'متعدد الفروع', desc: 'أدر فروع متعددة من لوحة تحكم واحدة — كل فرع بمخزونه المستقل' },
  { icon: '💾', title: 'نسخ احتياطي تلقائي', desc: 'نسخ احتياطية أسبوعية تلقائية مع إمكانية التحميل في أي وقت' },
  { icon: '📷', title: 'مسح الباركود', desc: 'أضف وابحث عن المنتجات بمسح الباركود مباشرة عبر الكاميرا' },
]

const PLANS = [
  { name: 'الأساسية', price: '99', period: 'شهر', branches: 'فرع واحد', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', features: ['تتبع المخزون', 'تنبيهات واتساب', 'إدارة الموظفين', 'التقارير', 'نسخ احتياطي'] },
  { name: 'المتوسطة', price: '199', period: 'شهر', branches: '2-3 فروع', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', popular: true, features: ['كل مميزات الأساسية', 'حتى 3 فروع', 'مقارنة الفروع', 'تقارير موسعة'] },
  { name: 'المتقدمة', price: '349', period: 'شهر', branches: '4+ فروع', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', features: ['كل مميزات المتوسطة', 'فروع غير محدودة', 'دعم أولوي', 'تخصيص متقدم'] },
]

const BUSINESSES = ['🍔 مطعم', '☕ كوفي', '🥖 مخبز', '🛒 بقالة', '💊 صيدلية', '🏭 مستودع', '🛍️ متجر إلكتروني']

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [activeBiz, setActiveBiz] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setActiveBiz(b => (b + 1) % BUSINESSES.length), 2000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',background:'#0a1f13',minHeight:'100vh',color:'white'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes pulse{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.7;transform:scale(1.05)}}
        @keyframes biz{0%,100%{opacity:0;transform:translateY(8px)}20%,80%{opacity:1;transform:none}}
        .fade-up{animation:fadeUp .6s ease both}
        .float{animation:float 4s ease-in-out infinite}
        .feat-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px;transition:all .2s;cursor:default}
        .feat-card:hover{background:rgba(255,255,255,.08);transform:translateY(-4px);border-color:rgba(22,163,74,.4)}
        .plan-card{border-radius:20px;padding:28px;transition:all .2s}
        .plan-card:hover{transform:translateY(-4px)}
        .nav-btn{padding:10px 20px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;border:none}
        .cta-btn{padding:16px 36px;border-radius:14px;font-size:17px;font-weight:800;cursor:pointer;font-family:inherit;transition:all .2s;border:none}
        .cta-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(22,163,74,.4)}
        @media(max-width:768px){
          .hero-title{font-size:36px!important}
          .feat-grid{grid-template-columns:1fr 1fr!important}
          .plan-grid{grid-template-columns:1fr!important}
          .nav-links{display:none!important}
        }
        @media(max-width:480px){.feat-grid{grid-template-columns:1fr!important}}
      `}</style>

      {/* Background blobs */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:0}}>
        <div style={{position:'absolute',top:'-20%',right:'-10%',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(22,163,74,.12) 0%,transparent 70%)',animation:'pulse 8s ease-in-out infinite'}}/>
        <div style={{position:'absolute',bottom:'-10%',left:'-10%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(37,99,235,.08) 0%,transparent 70%)',animation:'pulse 10s ease-in-out infinite 3s'}}/>
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.03}} xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>
      </div>

      {/* Navbar */}
      <nav style={{position:'fixed',top:0,right:0,left:0,zIndex:100,padding:'16px 40px',display:'flex',alignItems:'center',justifyContent:'space-between',background:scrolled?'rgba(10,31,19,.95)':'transparent',backdropFilter:scrolled?'blur(12px)':'none',borderBottom:scrolled?'1px solid rgba(255,255,255,.06)':'none',transition:'all .3s'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <img src="/storely-logo.png" alt="Storely" style={{width:36,height:36,borderRadius:10,objectFit:'cover'}}/>
          <span style={{fontSize:20,fontWeight:900,color:'white'}}>Storely</span>
        </div>
        <div className="nav-links" style={{display:'flex',gap:32,alignItems:'center'}}>
          {[['الميزات','#features'],['الأسعار','#pricing'],['تواصل معنا','#contact']].map(([l,h])=>(
            <a key={h} href={h} style={{color:'rgba(255,255,255,.7)',textDecoration:'none',fontSize:14,fontWeight:600,transition:'color .2s'}}
              onMouseEnter={e=>(e.currentTarget.style.color='white')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,.7)')}>{l}</a>
          ))}
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className="nav-btn" onClick={()=>router.push('/login')} style={{background:'rgba(255,255,255,.1)',color:'white'}}>دخول</button>
          <button className="nav-btn" onClick={()=>router.push('/login')} style={{background:'#16a34a',color:'white',boxShadow:'0 4px 14px rgba(22,163,74,.3)'}}>ابدأ مجاناً</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'120px 20px 80px',position:'relative',zIndex:1}}>
        <div className="fade-up" style={{background:'rgba(22,163,74,.15)',border:'1px solid rgba(22,163,74,.3)',borderRadius:20,padding:'8px 20px',fontSize:13,fontWeight:700,color:'#4ade80',marginBottom:24,display:'inline-block'}}>
          🚀 نظام إدارة مخزون للمنشآت السعودية
        </div>
        <h1 className="hero-title fade-up" style={{fontSize:56,fontWeight:900,lineHeight:1.15,marginBottom:20,letterSpacing:'-1px',animationDelay:'.1s'}}>
          أدر مخزونك بـ
          <span style={{background:'linear-gradient(135deg,#4ade80,#16a34a)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}> ذكاء وسهولة</span>
        </h1>
        <p className="fade-up" style={{fontSize:19,color:'rgba(255,255,255,.6)',maxWidth:580,lineHeight:1.8,marginBottom:16,animationDelay:'.2s'}}>
          منصة عربية متكاملة لإدارة المخزون والمشتريات — مناسبة لـ
        </p>
        <div className="fade-up" style={{fontSize:22,fontWeight:800,color:'#4ade80',marginBottom:40,height:36,animationDelay:'.25s'}}>
          {BUSINESSES[activeBiz]}
        </div>
        <div className="fade-up" style={{display:'flex',gap:14,flexWrap:'wrap',justifyContent:'center',animationDelay:'.3s'}}>
          <button className="cta-btn" onClick={()=>router.push('/login')} style={{background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',boxShadow:'0 6px 24px rgba(22,163,74,.35)'}}>
            ابدأ تجربتك المجانية ←
          </button>
          <button className="cta-btn" onClick={()=>document.getElementById('features')?.scrollIntoView({behavior:'smooth'})} style={{background:'rgba(255,255,255,.08)',color:'white',border:'1px solid rgba(255,255,255,.15)'}}>
            اكتشف الميزات
          </button>
        </div>
        <div className="fade-up" style={{marginTop:60,display:'flex',gap:40,justifyContent:'center',flexWrap:'wrap',animationDelay:'.4s'}}>
          {[['100+','عميل نشط'],['7','لغات مدعومة'],['99.9%','وقت التشغيل']].map(([n,l])=>(
            <div key={l} style={{textAlign:'center'}}>
              <div style={{fontSize:32,fontWeight:900,color:'#4ade80'}}>{n}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,.5)',marginTop:4}}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{padding:'80px 40px',position:'relative',zIndex:1,maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:56}}>
          <div style={{fontSize:13,fontWeight:700,color:'#4ade80',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:12}}>الميزات</div>
          <h2 style={{fontSize:36,fontWeight:900,color:'white',marginBottom:12}}>كل شي تحتاجه في مكان واحد</h2>
          <p style={{fontSize:16,color:'rgba(255,255,255,.5)',maxWidth:500,margin:'0 auto'}}>أدوات احترافية مصممة خصيصاً لاحتياجات المنشآت السعودية</p>
        </div>
        <div className="feat-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
          {FEATURES.map((f,i)=>(
            <div key={i} className="feat-card">
              <div style={{fontSize:32,marginBottom:14}}>{f.icon}</div>
              <div style={{fontSize:16,fontWeight:800,color:'white',marginBottom:8}}>{f.title}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,.5)',lineHeight:1.7}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{padding:'80px 40px',position:'relative',zIndex:1,maxWidth:1000,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:56}}>
          <div style={{fontSize:13,fontWeight:700,color:'#4ade80',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:12}}>الأسعار</div>
          <h2 style={{fontSize:36,fontWeight:900,color:'white',marginBottom:12}}>باقات مناسبة لكل منشأة</h2>
          <p style={{fontSize:16,color:'rgba(255,255,255,.5)'}}>جميع الباقات تشمل كامل المميزات — الفرق في عدد الفروع</p>
        </div>
        <div className="plan-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
          {PLANS.map((p,i)=>(
            <div key={i} className="plan-card" style={{background:p.popular?`linear-gradient(135deg,${p.color}22,${p.color}11)`:'rgba(255,255,255,.05)',border:`1.5px solid ${p.popular?p.color:'rgba(255,255,255,.1)'}`,position:'relative'}}>
              {p.popular&&<div style={{position:'absolute',top:-14,right:'50%',transform:'translateX(50%)',background:p.color,color:'white',padding:'4px 16px',borderRadius:20,fontSize:12,fontWeight:700}}>الأكثر طلباً</div>}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,.6)',marginBottom:8}}>{p.name}</div>
                <div style={{display:'flex',alignItems:'flex-end',gap:4,marginBottom:6}}>
                  <span style={{fontSize:42,fontWeight:900,color:'white'}}>{p.price}</span>
                  <span style={{fontSize:14,color:'rgba(255,255,255,.5)',marginBottom:8}}>ر.س / {p.period}</span>
                </div>
                <div style={{fontSize:13,color:p.color,fontWeight:700,background:`${p.color}22`,padding:'4px 12px',borderRadius:20,display:'inline-block'}}>{p.branches}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
                {p.features.map((f,j)=>(
                  <div key={j} style={{display:'flex',alignItems:'center',gap:8,fontSize:14,color:'rgba(255,255,255,.8)'}}>
                    <svg width={16} height={16} fill="none" stroke={p.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                    {f}
                  </div>
                ))}
              </div>
              <button onClick={()=>router.push('/login')} style={{width:'100%',padding:'13px',background:p.popular?p.color:'rgba(255,255,255,.1)',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .2s'}}>
                ابدأ الآن
              </button>
            </div>
          ))}
        </div>
        <p style={{textAlign:'center',color:'rgba(255,255,255,.4)',fontSize:13,marginTop:24}}>💳 الدفع عبر تحويل بنكي — التفعيل خلال 24 ساعة</p>
      </section>

      {/* CTA */}
      <section id="contact" style={{padding:'80px 40px',position:'relative',zIndex:1,textAlign:'center'}}>
        <div style={{maxWidth:600,margin:'0 auto',background:'rgba(22,163,74,.1)',border:'1px solid rgba(22,163,74,.2)',borderRadius:24,padding:'48px 40px'}}>
          <div style={{fontSize:40,marginBottom:16}}>🚀</div>
          <h2 style={{fontSize:32,fontWeight:900,color:'white',marginBottom:12}}>جاهز تبدأ؟</h2>
          <p style={{fontSize:16,color:'rgba(255,255,255,.6)',lineHeight:1.8,marginBottom:32}}>سجّل الآن وابدأ بتجربة مجانية — فريقنا جاهز لمساعدتك في الإعداد</p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button className="cta-btn" onClick={()=>router.push('/login')} style={{background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',boxShadow:'0 6px 24px rgba(22,163,74,.35)'}}>
              سجّل مجاناً ←
            </button>
            <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer"
              style={{display:'flex',alignItems:'center',gap:8,padding:'16px 36px',borderRadius:14,fontSize:17,fontWeight:800,cursor:'pointer',fontFamily:'inherit',background:'#25d366',color:'white',textDecoration:'none',boxShadow:'0 6px 24px rgba(37,211,102,.3)'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              تواصل معنا
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{padding:'32px 40px',borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16,position:'relative',zIndex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <img src="/storely-logo.png" alt="Storely" style={{width:28,height:28,borderRadius:8,objectFit:'cover'}}/>
          <span style={{fontSize:16,fontWeight:800,color:'white'}}>Storely</span>
        </div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.3)'}}>© {new Date().getFullYear()} Storely — نظام إدارة المخزون</div>
        <div style={{display:'flex',gap:20}}>
          {[['دخول','/login'],['التسجيل','/login']].map(([l,h])=>(
            <a key={h} href={h} style={{color:'rgba(255,255,255,.4)',textDecoration:'none',fontSize:13,transition:'color .2s'}}
              onMouseEnter={e=>(e.currentTarget.style.color='white')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,.4)')}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}
