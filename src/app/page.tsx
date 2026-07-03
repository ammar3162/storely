import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',background:'#ffffff',minHeight:'100vh'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:#16a34a;color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;font-family:inherit;transition:all .2s;box-shadow:0 4px 14px rgba(22,163,74,.3)}
        .btn-primary:hover{background:#15803d;transform:translateY(-1px);box-shadow:0 8px 24px rgba(22,163,74,.4)}
        .btn-secondary{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:white;color:#0d2818;border:2px solid #e2e8f0;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;font-family:inherit;transition:all .2s}
        .btn-secondary:hover{border-color:#16a34a;color:#16a34a}
        .feature-card{background:white;border-radius:16px;padding:28px;border:1px solid #f1f5f9;transition:all .2s;cursor:default}
        .feature-card:hover{box-shadow:0 8px 30px rgba(0,0,0,.08);transform:translateY(-2px)}
        .price-card{background:white;border-radius:20px;padding:32px;border:2px solid #e2e8f0;transition:all .2s;position:relative}
        .price-card.popular{border-color:#16a34a;box-shadow:0 8px 30px rgba(22,163,74,.15)}
        @media(max-width:768px){
          .hero-title{font-size:32px!important}
          .hero-grid{grid-template-columns:1fr!important}
          .features-grid{grid-template-columns:1fr!important}
          .pricing-grid{grid-template-columns:1fr!important}
          .nav-links{display:none!important}
          .steps-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* Navbar */}
      <nav style={{position:'sticky',top:0,zIndex:100,background:'rgba(255,255,255,.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid #f1f5f9',padding:'0 24px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#0d2818,#16a34a)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontSize:18}}>📦</span>
          </div>
          <span style={{fontSize:20,fontWeight:900,color:'#0d2818'}}>Storely</span>
        </div>
        <div className="nav-links" style={{display:'flex',alignItems:'center',gap:32}}>
          <a href="#features" style={{fontSize:14,fontWeight:600,color:'#475569',textDecoration:'none'}}>المميزات</a>
          <a href="#how" style={{fontSize:14,fontWeight:600,color:'#475569',textDecoration:'none'}}>كيف يعمل</a>
          <a href="#pricing" style={{fontSize:14,fontWeight:600,color:'#475569',textDecoration:'none'}}>الأسعار</a>
          <a href="/suppliers-join" style={{fontSize:14,fontWeight:600,color:'#475569',textDecoration:'none'}}>انضم كمورد</a>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <Link href="/login" className="btn-secondary" style={{padding:'9px 18px',fontSize:13}}>تسجيل الدخول</Link>
          <Link href="/login?mode=register" className="btn-primary" style={{padding:'9px 18px',fontSize:13}}>ابدأ مجاناً</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{background:'linear-gradient(160deg,#0d2818 0%,#1a4731 50%,#0d2818 100%)',padding:'80px 24px 100px',overflow:'hidden',position:'relative'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 20% 50%, rgba(22,163,74,.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(74,190,122,.1) 0%, transparent 40%)'}}/>
        <div style={{maxWidth:1100,margin:'0 auto',position:'relative'}}>
          <div style={{textAlign:'center',marginBottom:60}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(22,163,74,.15)',border:'1px solid rgba(22,163,74,.3)',borderRadius:20,padding:'6px 16px',marginBottom:24}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#4abe7a',display:'inline-block',animation:'pulse 2s infinite'}}/>
              <span style={{fontSize:13,fontWeight:600,color:'#4abe7a'}}>نظام إدارة مخزون سعودي احترافي</span>
            </div>
            <h1 className="hero-title" style={{fontSize:52,fontWeight:900,color:'white',lineHeight:1.2,marginBottom:20}}>
              أدِر مخزونك<br/>
              <span style={{color:'#4abe7a'}}>بذكاء وسهولة</span>
            </h1>
            <p style={{fontSize:18,color:'rgba(255,255,255,.7)',lineHeight:1.8,maxWidth:600,margin:'0 auto 36px'}}>
              تتبع مخزونك لحظة بلحظة، واستقبل تنبيهات واتساب عند نقص الأصناف، وأدِر موظفيك وفروعك من مكان واحد
            </p>
            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
              <Link href="/login?mode=register" className="btn-primary" style={{fontSize:16,padding:'16px 32px'}}>
                ابدأ تجربتك المجانية ←
              </Link>
              <a href="#features" className="btn-secondary" style={{fontSize:16,padding:'16px 32px',background:'rgba(255,255,255,.1)',color:'white',border:'1px solid rgba(255,255,255,.2)'}}>
                اكتشف المميزات
              </a>
            </div>
            <p style={{fontSize:13,color:'rgba(255,255,255,.4)',marginTop:16}}>14 يوم مجاناً · بدون بطاقة ائتمان</p>
          </div>

          {/* Dashboard Preview */}
          <div style={{background:'rgba(255,255,255,.05)',borderRadius:20,padding:3,border:'1px solid rgba(255,255,255,.1)',maxWidth:800,margin:'0 auto'}}>
            <div style={{background:'#1e293b',borderRadius:18,padding:'12px 16px 0',overflow:'hidden'}}>
              <div style={{display:'flex',gap:6,marginBottom:12}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#ef4444'}}/>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#f59e0b'}}/>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#22c55e'}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
                {[{l:'الأصناف',v:'247',c:'#16a34a'},{l:'صرف اليوم',v:'18',c:'#2563eb'},{l:'مشتريات',v:'12',c:'#7c3aed'},{l:'تنبيهات',v:'3',c:'#ef4444'}].map((s,i)=>(
                  <div key={i} style={{background:'rgba(255,255,255,.05)',borderRadius:10,padding:'10px 12px'}}>
                    <div style={{fontSize:9,color:'rgba(255,255,255,.4)',marginBottom:4}}>{s.l}</div>
                    <div style={{fontSize:20,fontWeight:900,color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'rgba(255,255,255,.03)',borderRadius:10,padding:12,marginBottom:0}}>
                <div style={{fontSize:9,color:'rgba(255,255,255,.3)',marginBottom:8}}>أحدث الحركات</div>
                {[{n:'دجاج مشوي',q:'-5 كيلو',c:'#ef4444'},{n:'بهارات',q:'+20 كيس',c:'#16a34a'},{n:'زيت زيتون',q:'-2 لتر',c:'#ef4444'}].map((p,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:i<2?'1px solid rgba(255,255,255,.04)':'none'}}>
                    <span style={{fontSize:11,color:'rgba(255,255,255,.6)'}}>{p.n}</span>
                    <span style={{fontSize:11,fontWeight:700,color:p.c}}>{p.q}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos/Types */}
      <section style={{padding:'32px 24px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
        <div style={{maxWidth:1100,margin:'0 auto',textAlign:'center'}}>
          <p style={{fontSize:13,color:'#94a3b8',fontWeight:600,marginBottom:20}}>مناسب لجميع أنواع المنشآت</p>
          <div style={{display:'flex',gap:32,justifyContent:'center',flexWrap:'wrap'}}>
            {['🍔 مطاعم','☕ كوفي','🥖 مخابز','🛒 بقاليات','💊 صيدليات','🏭 مستودعات','🛍️ متاجر','🏢 شركات'].map((t,i)=>(
              <span key={i} style={{fontSize:14,fontWeight:600,color:'#64748b'}}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{padding:'80px 24px',background:'white'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:56}}>
            <h2 style={{fontSize:36,fontWeight:900,color:'#0f172a',marginBottom:12}}>كل ما تحتاجه في مكان واحد</h2>
            <p style={{fontSize:16,color:'#64748b',maxWidth:500,margin:'0 auto'}}>أدوات احترافية تساعدك على إدارة مخزونك بكفاءة عالية</p>
          </div>
          <div className="features-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {[
              {icon:'📦',title:'تتبع المخزون لحظة بلحظة',desc:'شوف كميات جميع منتجاتك في الوقت الفعلي مع تنبيهات فورية عند الوصول للحد الأدنى'},
              {icon:'📲',title:'تنبيهات واتساب تلقائية',desc:'استقبل إشعارات واتساب فوراً عند نقص أي صنف مع إمكانية إرسال طلب الشراء للمورد مباشرة'},
              {icon:'👥',title:'إدارة الموظفين بصلاحيات',desc:'أضف موظفيك وحدد صلاحياتهم بالضبط — صرف أو مخزون أو مشتريات أو تقارير'},
              {icon:'📊',title:'تقارير وإحصائيات',desc:'تقارير تفصيلية عن حركة المخزون والمشتريات والصرف لاتخاذ قرارات أذكى'},
              {icon:'🏪',title:'إدارة الفروع',desc:'تحكم في جميع فروعك من لوحة تحكم واحدة مع إمكانية تخصيص كل فرع'},
              {icon:'🤝',title:'موردون معتمدون',desc:'وصول حصري لشبكة موردين معتمدين مع عروض وخصومات خاصة لعملاء Storely'},
            ].map((f,i)=>(
              <div key={i} className="feature-card">
                <div style={{width:48,height:48,borderRadius:12,background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,marginBottom:16}}>{f.icon}</div>
                <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:8}}>{f.title}</h3>
                <p style={{fontSize:13,color:'#64748b',lineHeight:1.7}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{padding:'80px 24px',background:'#f8fafc'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:56}}>
            <h2 style={{fontSize:36,fontWeight:900,color:'#0f172a',marginBottom:12}}>ابدأ في 3 خطوات بسيطة</h2>
            <p style={{fontSize:16,color:'#64748b'}}>لا تحتاج خبرة تقنية — النظام بسيط وسهل الاستخدام</p>
          </div>
          <div className="steps-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:32}}>
            {[
              {n:'1',icon:'📝',title:'سجّل حسابك',desc:'أنشئ حسابك مجاناً في دقيقة واحدة بدون بطاقة ائتمان'},
              {n:'2',icon:'📦',title:'أضف منتجاتك',desc:'أضف منتجاتك وحدد الكميات وحد إعادة الطلب لكل صنف'},
              {n:'3',icon:'📲',title:'تحكم واستلم التنبيهات',desc:'راقب مخزونك واستقبل تنبيهات واتساب تلقائياً عند النقص'},
            ].map((s,i)=>(
              <div key={i} style={{textAlign:'center'}}>
                <div style={{width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,#0d2818,#16a34a)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:28}}>
                  {s.icon}
                </div>
                <div style={{fontSize:12,fontWeight:700,color:'#16a34a',marginBottom:6}}>الخطوة {s.n}</div>
                <h3 style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:8}}>{s.title}</h3>
                <p style={{fontSize:14,color:'#64748b',lineHeight:1.7}}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{padding:'80px 24px',background:'white'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:56}}>
            <h2 style={{fontSize:36,fontWeight:900,color:'#0f172a',marginBottom:12}}>أسعار شفافة بدون مفاجآت</h2>
            <p style={{fontSize:16,color:'#64748b'}}>ابدأ مجاناً 14 يوم · بدون بطاقة ائتمان</p>
          </div>
          <div className="pricing-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,maxWidth:900,margin:'0 auto'}}>
            {[
              {name:'الأساسية',price:'149',period:'شهر',color:'#16a34a',features:['فرع واحد','2 موظفين','3 موردين','تنبيهات واتساب','تقارير أساسية'],popular:false},
              {name:'المتوسطة',price:'249',period:'شهر',color:'#2563eb',features:['3 فروع','10 موظفين','10 موردين','تنبيهات واتساب','تقارير متقدمة','موردون معتمدون'],popular:true},
              {name:'المتقدمة',price:'399',period:'شهر',color:'#7c3aed',features:['فروع غير محدودة','موظفون غير محدودين','موردون غير محدودين','تنبيهات واتساب','تقارير كاملة','دعم أولوية'],popular:false},
            ].map((p,i)=>(
              <div key={i} className={`price-card${p.popular?' popular':''}`} style={{position:'relative'}}>
                {p.popular && (
                  <div style={{position:'absolute',top:-12,right:'50%',transform:'translateX(50%)',background:'#16a34a',color:'white',fontSize:11,fontWeight:700,padding:'4px 14px',borderRadius:20}}>
                    الأكثر شيوعاً
                  </div>
                )}
                <div style={{fontSize:14,fontWeight:700,color:'#64748b',marginBottom:8}}>{p.name}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:20}}>
                  <span style={{fontSize:40,fontWeight:900,color:'#0f172a'}}>{p.price}</span>
                  <span style={{fontSize:14,color:'#64748b'}}>ر.س/{p.period}</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
                  {p.features.map((f,j)=>(
                    <div key={j} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#374151'}}>
                      <span style={{color:'#16a34a',fontWeight:700,flexShrink:0}}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                <a href={`https://wa.me/966594351667?text=أريد الاشتراك في باقة ${p.name}`} target="_blank"
                  style={{display:'block',width:'100%',padding:'12px',background:p.popular?'#16a34a':'white',color:p.popular?'white':'#16a34a',border:`2px solid #16a34a`,borderRadius:10,fontSize:14,fontWeight:700,textDecoration:'none',textAlign:'center'}}>
                  ابدأ الآن
                </a>
              </div>
            ))}
          </div>
          <p style={{textAlign:'center',fontSize:13,color:'#94a3b8',marginTop:24}}>جميع الباقات تشمل تجربة مجانية 14 يوم</p>
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:'80px 24px',background:'linear-gradient(135deg,#0d2818,#1a4731)',textAlign:'center'}}>
        <div style={{maxWidth:600,margin:'0 auto'}}>
          <h2 style={{fontSize:36,fontWeight:900,color:'white',marginBottom:16}}>ابدأ إدارة مخزونك اليوم</h2>
          <p style={{fontSize:16,color:'rgba(255,255,255,.7)',marginBottom:32,lineHeight:1.8}}>انضم لمئات المنشآت التي تستخدم Storely لإدارة مخزونها باحترافية</p>
          <Link href="/login?mode=register" className="btn-primary" style={{fontSize:16,padding:'16px 36px'}}>
            ابدأ تجربتك المجانية ← 
          </Link>
          <p style={{fontSize:13,color:'rgba(255,255,255,.4)',marginTop:16}}>14 يوم مجاناً · بدون بطاقة ائتمان · إلغاء في أي وقت</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{background:'#0d2818',padding:'40px 24px',borderTop:'1px solid rgba(255,255,255,.06)'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:16}}>📦</span>
            </div>
            <span style={{fontSize:16,fontWeight:900,color:'white'}}>Storely</span>
          </div>
          <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
            <a href="/login" style={{fontSize:13,color:'rgba(255,255,255,.5)',textDecoration:'none'}}>تسجيل الدخول</a>
            <a href="/login?mode=register" style={{fontSize:13,color:'rgba(255,255,255,.5)',textDecoration:'none'}}>إنشاء حساب</a>
            <a href="/suppliers-join" style={{fontSize:13,color:'rgba(255,255,255,.5)',textDecoration:'none'}}>انضم كمورد</a>
            <a href="/terms" style={{fontSize:13,color:'rgba(255,255,255,.5)',textDecoration:'none'}}>الشروط والأحكام</a>
            <a href={`https://wa.me/966594351667`} target="_blank" style={{fontSize:13,color:'rgba(255,255,255,.5)',textDecoration:'none'}}>تواصل معنا</a>
          </div>
          <p style={{fontSize:12,color:'rgba(255,255,255,.3)'}}>© 2025 Storely. جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  )
}
