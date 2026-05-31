'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c < 500 ? c + 7 : 500)
    }, 20)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{fontFamily:'"Cabinet Grotesk","DM Sans",system-ui,sans-serif',direction:'rtl',background:'#fafaf9',color:'#1c1917',overflowX:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap');

        *{box-sizing:border-box;margin:0;padding:0}

        @keyframes fadeUp   { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes float    { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-12px) rotate(1deg)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes shimmer  { from{background-position:200% center} to{background-position:-200% center} }
        @keyframes marquee  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes pulse    { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.05);opacity:0.8} }

        .hero-title{
          font-family:'DM Serif Display',serif;
          font-size:clamp(48px,7vw,88px);
          line-height:1.05;
          letter-spacing:-0.03em;
          color:#1c1917;
        }
        .hero-title em{
          font-style:italic;
          background:linear-gradient(135deg,#ea580c,#dc2626,#9333ea);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          background-clip:text;
        }

        .btn-primary{
          display:inline-flex;align-items:center;gap:8px;
          padding:14px 28px;border-radius:100px;
          background:#1c1917;color:white;
          font-size:15px;font-weight:600;
          text-decoration:none;border:none;cursor:pointer;
          transition:all 0.2s ease;
          box-shadow:0 1px 3px rgba(0,0,0,0.12),0 4px 20px rgba(28,25,23,0.15);
          font-family:inherit;
        }
        .btn-primary:hover{background:#292524;transform:translateY(-1px);box-shadow:0 4px 24px rgba(28,25,23,0.2)}

        .btn-secondary{
          display:inline-flex;align-items:center;gap:8px;
          padding:14px 28px;border-radius:100px;
          background:transparent;color:#1c1917;
          font-size:15px;font-weight:600;
          text-decoration:none;border:1.5px solid #e7e5e4;cursor:pointer;
          transition:all 0.2s ease;font-family:inherit;
        }
        .btn-secondary:hover{background:#f5f5f4;border-color:#d4d0cc}

        .feature-card{
          background:white;border:1px solid #e7e5e4;border-radius:20px;
          padding:28px;transition:all 0.25s ease;
          position:relative;overflow:hidden;
        }
        .feature-card:hover{transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,0.08);border-color:#d4d0cc}
        .feature-card::before{
          content:'';position:absolute;inset:0;border-radius:20px;
          background:linear-gradient(135deg,rgba(234,88,12,0.03),rgba(147,51,234,0.03));
          opacity:0;transition:opacity 0.25s;
        }
        .feature-card:hover::before{opacity:1}

        .stat-num{
          font-family:'DM Serif Display',serif;
          font-size:48px;font-weight:400;
          background:linear-gradient(135deg,#ea580c,#dc2626);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }

        .pricing-card{
          background:white;border:1.5px solid #e7e5e4;border-radius:24px;
          padding:32px;transition:all 0.25s;position:relative;
        }
        .pricing-card.featured{
          background:linear-gradient(135deg,#1c1917,#292524);
          border-color:#1c1917;color:white;
          box-shadow:0 24px 64px rgba(28,25,23,0.25);
          transform:scale(1.03);
        }
        .pricing-card:hover:not(.featured){transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,0.08)}

        .check-item{display:flex;align-items:center;gap:10px;margin-bottom:12px;font-size:14px;color:#78716c}
        .check-icon{width:18px;height:18px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0}

        .floating-badge{
          position:absolute;background:white;border:1px solid #e7e5e4;
          border-radius:12px;padding:10px 14px;
          box-shadow:0 8px 32px rgba(0,0,0,0.1);
          display:flex;align-items:center;gap:8px;
          font-size:13px;font-weight:600;color:#1c1917;
          animation:float 4s ease-in-out infinite;
        }

        .marquee-track{display:flex;gap:32px;animation:marquee 20s linear infinite;width:max-content}
        .marquee-track:hover{animation-play-state:paused}

        .nav-link{color:#78716c;text-decoration:none;font-size:14px;font-weight:500;transition:color 0.15s}
        .nav-link:hover{color:#1c1917}

        .section-tag{
          display:inline-flex;align-items:center;gap:6px;
          padding:5px 12px;background:#fff7ed;border:1px solid #fed7aa;
          border-radius:100px;font-size:12px;font-weight:600;color:#ea580c;
          margin-bottom:16px;
        }

        @media(max-width:768px){
          .hero-title{font-size:clamp(36px,10vw,56px)}
          .hero-btns{flex-direction:column;align-items:stretch}
          .features-grid{grid-template-columns:1fr !important}
          .stats-grid{grid-template-columns:1fr 1fr !important}
          .pricing-grid{grid-template-columns:1fr !important}
          .pricing-card.featured{transform:none}
          .floating-badge{display:none}
        }
      `}</style>

      {/* NAV */}
      <nav style={{
        position:'fixed',top:0,left:0,right:0,zIndex:100,
        padding:'0 24px',height:60,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        background: scrolled ? 'rgba(250,250,249,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid #e7e5e4' : '1px solid transparent',
        transition:'all 0.3s ease'
      }}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:32,height:32,background:'#1c1917',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>🏪</div>
          <span style={{fontSize:16,fontWeight:700,color:'#1c1917',letterSpacing:'-0.3px'}}>Storely</span>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:24}} className="hide-mobile">
          {['المميزات','الأسعار','من نحن'].map(item => (
            <a key={item} href={`#${item}`} className="nav-link">{item}</a>
          ))}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <Link href="/login" className="btn-secondary" style={{padding:'8px 18px',fontSize:14}}>
            دخول
          </Link>
          <Link href="/login" className="btn-primary" style={{padding:'8px 18px',fontSize:14}}>
            ابدأ مجاناً ←
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
        padding:'120px 24px 80px',position:'relative',overflow:'hidden'
      }}>
        {/* BG */}
        <div style={{position:'absolute',inset:0,zIndex:0,overflow:'hidden'}}>
          <div style={{position:'absolute',top:'15%',right:'8%',width:400,height:400,background:'radial-gradient(circle,rgba(234,88,12,0.12),transparent 70%)',borderRadius:'50%'}} />
          <div style={{position:'absolute',bottom:'10%',left:'5%',width:300,height:300,background:'radial-gradient(circle,rgba(147,51,234,0.08),transparent 70%)',borderRadius:'50%'}} />
          <div style={{position:'absolute',top:'40%',left:'20%',width:200,height:200,background:'radial-gradient(circle,rgba(220,38,38,0.06),transparent 70%)',borderRadius:'50%'}} />
          {/* Grid pattern */}
          <div style={{
            position:'absolute',inset:0,
            backgroundImage:'linear-gradient(rgba(0,0,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.03) 1px,transparent 1px)',
            backgroundSize:'60px 60px'
          }} />
        </div>

        {/* Floating badges */}
        <div className="floating-badge" style={{top:'22%',right:'6%',animationDelay:'0s'}}>
          <span style={{fontSize:18}}>📦</span>
          <div>
            <div style={{fontSize:11,color:'#78716c'}}>المخزون</div>
            <div style={{fontSize:13,fontWeight:700}}>متاح: 142</div>
          </div>
        </div>
        <div className="floating-badge" style={{top:'35%',left:'4%',animationDelay:'1.5s'}}>
          <span style={{width:8,height:8,background:'#10b981',borderRadius:'50%',display:'inline-block'}} />
          <span>تنبيه واتساب أُرسل ✓</span>
        </div>
        <div className="floating-badge" style={{bottom:'28%',right:'4%',animationDelay:'0.8s'}}>
          <span style={{fontSize:18}}>📈</span>
          <div>
            <div style={{fontSize:11,color:'#78716c'}}>المبيعات اليوم</div>
            <div style={{fontSize:13,fontWeight:700,color:'#10b981'}}>+₽ 4,832</div>
          </div>
        </div>

        <div style={{position:'relative',zIndex:1,textAlign:'center',maxWidth:800,animation:'fadeUp 0.8s ease both'}}>
          <div className="section-tag">
            <span>✦</span> مخصص للمعلات والمطاعم السعودية
          </div>

          <h1 className="hero-title" style={{marginBottom:24}}>
            تحكّم بمخزونك<br />
            <em>باحترافية حقيقية</em>
          </h1>

          <p style={{fontSize:18,color:'#78716c',lineHeight:1.7,marginBottom:36,maxWidth:560,margin:'0 auto 36px',fontWeight:400}}>
            Storely نظام إدارة مخزون ذكي مصمم خصيصاً للمعلات والمطاعم الصغيرة في السعودية — بسيط، سريع، وبدون تعقيد.
          </p>

          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}} className="hero-btns">
            <Link href="/login" className="btn-primary" style={{fontSize:16,padding:'15px 32px'}}>
              ابدأ تجربتك المجانية ← 
            </Link>
            <a href="#المميزات" className="btn-secondary" style={{fontSize:16,padding:'15px 32px'}}>
              شوف كيف يشتغل
            </a>
          </div>

          <p style={{fontSize:12,color:'#a8a29e',marginTop:16}}>
            ✓ مجاني 14 يوم &nbsp;•&nbsp; ✓ بدون بطاقة &nbsp;•&nbsp; ✓ إلغاء في أي وقت
          </p>
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{padding:'20px 0',borderTop:'1px solid #e7e5e4',borderBottom:'1px solid #e7e5e4',background:'#fafaf9',overflow:'hidden'}}>
        <div className="marquee-track">
          {['إدارة المخزون ✦','تقارير تفصيلية ✦','إشعارات واتساب ✦','متعدد المستخدمين ✦','تتبع المشتريات ✦','تسجيل الصرف ✦','إدارة المخزون ✦','تقارير تفصيلية ✦','إشعارات واتساب ✦','متعدد المستخدمين ✦','تتبع المشتريات ✦','تسجيل الصرف ✦'].map((t,i) => (
            <span key={i} style={{fontSize:14,fontWeight:500,color:'#a8a29e',whiteSpace:'nowrap'}}>{t}</span>
          ))}
        </div>
      </div>

      {/* STATS */}
      <section style={{padding:'80px 24px',background:'white'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div className="stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:40,textAlign:'center'}}>
            {[
              {num:`+${count}`, label:'مؤسسة تثق بنا', suffix:''},
              {num:'99.9', label:'وقت التشغيل', suffix:'%'},
              {num:'2', label:'دقيقة للإعداد', suffix:''},
              {num:'24', label:'دعم فني', suffix:'/7'},
            ].map((s,i) => (
              <div key={i} style={{animation:`fadeUp 0.6s ease ${i*0.1}s both`}}>
                <div className="stat-num">{s.num}<span style={{fontSize:28}}>{s.suffix}</span></div>
                <div style={{fontSize:14,color:'#78716c',marginTop:4,fontWeight:500}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="المميزات" style={{padding:'100px 24px',background:'#fafaf9'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:60}}>
            <div className="section-tag">المميزات</div>
            <h2 style={{fontFamily:'"DM Serif Display",serif',fontSize:'clamp(32px,5vw,52px)',fontWeight:400,letterSpacing:'-0.03em',marginBottom:16}}>
              كل شيء تحتاجه<br /><em style={{fontStyle:'italic',color:'#ea580c'}}>في مكان واحد</em>
            </h2>
            <p style={{fontSize:16,color:'#78716c',maxWidth:500,margin:'0 auto'}}>
              صُمّم ليكون بسيطاً للموظفين وقوياً للمدراء
            </p>
          </div>

          <div className="features-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {[
              { icon:'📦', title:'إدارة المخزون', desc:'أضف وعدّل وتتبع أصنافك بسهولة. تنبيهات تلقائية عند نقص أي صنف.', color:'#fff7ed', accent:'#ea580c' },
              { icon:'🛒', title:'تسجيل المشتريات', desc:'سجّل فواتير الشراء مع صورة الفاتورة ودعم ضريبة القيمة المضافة 15%.', color:'#f0fdf4', accent:'#16a34a' },
              { icon:'📤', title:'تسجيل الصرف', desc:'تتبع كل ما يُصرف من المخزون مع السبب والموظف المسؤول.', color:'#fef2f2', accent:'#dc2626' },
              { icon:'📈', title:'تقارير تفصيلية', desc:'تقارير المشتريات والصرف مع فلاتر متقدمة وتصدير CSV.', color:'#eff6ff', accent:'#1d4ed8' },
              { icon:'📱', title:'إشعارات واتساب', desc:'يرسل إشعار واتساب تلقائياً لما أي صنف يوصل للحد الأدنى.', color:'#f0fdf4', accent:'#16a34a' },
              { icon:'👥', title:'متعدد المستخدمين', desc:'أضف موظفين وحدد صلاحياتهم. كل مؤسسة عالمها المنفصل.', color:'#fdf4ff', accent:'#9333ea' },
            ].map((f,i) => (
              <div key={i} className="feature-card" style={{animationDelay:`${i*0.1}s`}}>
                <div style={{width:44,height:44,background:f.color,border:`1px solid ${f.accent}22`,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,marginBottom:16}}>
                  {f.icon}
                </div>
                <h3 style={{fontSize:17,fontWeight:700,marginBottom:8,color:'#1c1917'}}>{f.title}</h3>
                <p style={{fontSize:14,color:'#78716c',lineHeight:1.65}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{padding:'100px 24px',background:'white'}}>
        <div style={{maxWidth:900,margin:'0 auto',textAlign:'center'}}>
          <div className="section-tag">كيف يشتغل</div>
          <h2 style={{fontFamily:'"DM Serif Display",serif',fontSize:'clamp(32px,5vw,52px)',fontWeight:400,letterSpacing:'-0.03em',marginBottom:60}}>
            جاهز في <em style={{fontStyle:'italic',color:'#ea580c'}}>دقيقتين</em>
          </h2>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:40,position:'relative'}}>
            <div style={{position:'absolute',top:28,right:'20%',left:'20%',height:1,background:'linear-gradient(90deg,#e7e5e4,#ea580c,#e7e5e4)',zIndex:0}} className="hide-mobile" />
            {[
              { step:'01', title:'سجّل حساباً', desc:'أنشئ حسابك وسمّ مؤسستك في أقل من دقيقة.', icon:'✍️' },
              { step:'02', title:'أضف منتجاتك', desc:'أدخل أصناف مخزونك مع الكميات والحد الأدنى.', icon:'📦' },
              { step:'03', title:'ابدأ التتبع', desc:'سجّل المشتريات والصرف واستقبل التقارير.', icon:'🚀' },
            ].map((s,i) => (
              <div key={i} style={{position:'relative',zIndex:1,animation:`fadeUp 0.6s ease ${i*0.15}s both`}}>
                <div style={{width:56,height:56,background:'#1c1917',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,margin:'0 auto 16px',boxShadow:'0 4px 16px rgba(28,25,23,0.2)'}}>
                  {s.icon}
                </div>
                <div style={{fontSize:11,fontWeight:700,color:'#a8a29e',marginBottom:6,letterSpacing:'0.1em'}}>{s.step}</div>
                <h3 style={{fontSize:18,fontWeight:700,marginBottom:8}}>{s.title}</h3>
                <p style={{fontSize:14,color:'#78716c',lineHeight:1.65}}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="الأسعار" style={{padding:'100px 24px',background:'#fafaf9'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:60}}>
            <div className="section-tag">الأسعار</div>
            <h2 style={{fontFamily:'"DM Serif Display",serif',fontSize:'clamp(32px,5vw,52px)',fontWeight:400,letterSpacing:'-0.03em',marginBottom:12}}>
              سعر <em style={{fontStyle:'italic',color:'#ea580c'}}>عادل</em> للجميع
            </h2>
            <p style={{fontSize:16,color:'#78716c'}}>تجربة مجانية 14 يوم — بدون بطاقة ائتمانية</p>
          </div>

          <div className="pricing-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,alignItems:'center'}}>
            {[
              {
                name:'مجاني', price:'0', period:'للأبد',
                desc:'للمؤسسات الصغيرة جداً',
                features:['منتج واحد','تقارير أساسية','دعم بالبريد'],
                cta:'ابدأ مجاناً', featured:false, href:'/login'
              },
              {
                name:'الأساسي', price:'99', period:'شهرياً',
                desc:'الأنسب لمعظم المعلات',
                features:['منتجات غير محدودة','تقارير متقدمة','إشعارات واتساب','تصدير CSV','دعم أولوية'],
                cta:'ابدأ تجربتك ←', featured:true, href:'/login'
              },
              {
                name:'المتقدم', price:'199', period:'شهرياً',
                desc:'للمطاعم وسلاسل المعلات',
                features:['كل مميزات الأساسي','متعدد الفروع','API مخصص','مدير حساب مخصص'],
                cta:'تواصل معنا', featured:false, href:'https://wa.me/966561161448'
              },
            ].map((p,i) => (
              <div key={i} className={`pricing-card ${p.featured?'featured':''}`}>
                {p.featured && (
                  <div style={{
                    position:'absolute',top:-12,right:'50%',transform:'translateX(50%)',
                    background:'linear-gradient(135deg,#ea580c,#dc2626)',
                    color:'white',fontSize:11,fontWeight:700,
                    padding:'4px 14px',borderRadius:100,whiteSpace:'nowrap'
                  }}>⭐ الأكثر شيوعاً</div>
                )}
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:p.featured?'rgba(255,255,255,0.6)':'#78716c',marginBottom:4}}>{p.name}</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:4}}>
                    <span style={{fontFamily:'"DM Serif Display",serif',fontSize:44,fontWeight:400,color:p.featured?'white':'#1c1917'}}>{p.price}</span>
                    <span style={{fontSize:14,color:p.featured?'rgba(255,255,255,0.5)':'#78716c'}}>ريال / {p.period}</span>
                  </div>
                  <div style={{fontSize:13,color:p.featured?'rgba(255,255,255,0.5)':'#78716c'}}>{p.desc}</div>
                </div>

                <div style={{marginBottom:24}}>
                  {p.features.map((f,j) => (
                    <div key={j} className="check-item" style={{color:p.featured?'rgba(255,255,255,0.8)':'#78716c'}}>
                      <div className="check-icon" style={{background:p.featured?'rgba(255,255,255,0.1)':'#dcfce7',color:p.featured?'white':'#16a34a'}}>✓</div>
                      {f}
                    </div>
                  ))}
                </div>

                <a href={p.href} style={{
                  display:'block',textAlign:'center',padding:'13px',borderRadius:100,
                  background: p.featured ? 'white' : '#1c1917',
                  color: p.featured ? '#1c1917' : 'white',
                  fontSize:14,fontWeight:700,textDecoration:'none',
                  transition:'all 0.2s',border:'none',cursor:'pointer',fontFamily:'inherit'
                }}>{p.cta}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:'100px 24px',background:'#1c1917',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:600,height:600,background:'radial-gradient(circle,rgba(234,88,12,0.15),transparent 70%)',borderRadius:'50%',pointerEvents:'none'}} />
        <div style={{position:'relative',zIndex:1,animation:'fadeUp 0.8s ease both'}}>
          <h2 style={{fontFamily:'"DM Serif Display",serif',fontSize:'clamp(32px,6vw,64px)',fontWeight:400,color:'white',letterSpacing:'-0.03em',marginBottom:16}}>
            جاهز تبدأ؟
          </h2>
          <p style={{fontSize:18,color:'rgba(255,255,255,0.5)',marginBottom:36}}>
            انضم لأكثر من 500 مؤسسة تثق بـ Storely
          </p>
          <Link href="/login" style={{
            display:'inline-flex',alignItems:'center',gap:8,
            padding:'16px 36px',borderRadius:100,
            background:'white',color:'#1c1917',
            fontSize:16,fontWeight:700,textDecoration:'none',
            boxShadow:'0 4px 24px rgba(255,255,255,0.15)',
            transition:'all 0.2s'
          }}>
            ابدأ تجربتك المجانية ←
          </Link>
          <p style={{fontSize:12,color:'rgba(255,255,255,0.3)',marginTop:16}}>
            ✓ مجاني 14 يوم &nbsp;•&nbsp; ✓ بدون بطاقة &nbsp;•&nbsp; ✓ إلغاء في أي وقت
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{padding:'40px 24px',background:'#1c1917',borderTop:'1px solid rgba(255,255,255,0.08)',textAlign:'center'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:12}}>
          <div style={{width:24,height:24,background:'white',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🏪</div>
          <span style={{fontSize:14,fontWeight:700,color:'white'}}>Storely</span>
        </div>
        <p style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>
          © 2025 Storely — نظام إدارة المخزون للمعلات والمطاعم السعودية
        </p>
      </footer>
    </div>
  )
}