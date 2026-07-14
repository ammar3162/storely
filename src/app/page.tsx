'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import StoreMascot from '@/components/StoreMascot'

const PLANS = [
  { name: 'الأساسية', price: '149', popular: false, limits: { branches: 'فرع واحد', employees: '2 موظفين', suppliers: '3 موردين' }, features: ['تتبع المخزون لحظة بلحظة', 'تنبيهات واتساب عند النقص', 'إدارة موظفين بصلاحيات', 'تقارير أساسية مع تصدير CSV', 'إضافة موردين'] },
  { name: 'المتوسطة', price: '249', popular: true, limits: { branches: '3 فروع', employees: '10 موظفين', suppliers: '10 موردين' }, features: ['كل مميزات الأساسية', 'إقفال الكاشير اليومي 💰', 'تقارير متقدمة', 'تقرير الربحية الشهري 📈', 'اقتراح الشراء الذكي 🤖', 'توقع نفاد المخزون 🔮', 'تحليل الموسمية', 'تحسين نقطة إعادة الطلب 🎯', 'دعم ذو أولوية'] },
  { name: 'المتقدمة', price: '399', popular: false, limits: { branches: 'غير محدود', employees: 'غير محدود', suppliers: 'غير محدود' }, features: ['كل مميزات المتوسطة', 'مقارنة أداء الفروع 🤖', 'المخزون الراكد 🐌', 'كشف الهدر الحقيقي 🗑️', 'دعم 24/7'] },
]

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(entry.target) } }, { threshold })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, isVisible }
}

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useInView()
  return (
    <div ref={ref} className={className} style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(30px)', transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s` }}>
      {children}
    </div>
  )
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div style={{ fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif", direction: 'rtl', background: '#ffffff', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        /* Buttons */
        .btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 28px; background: #16a34a; color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; text-decoration: none; font-family: inherit; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 4px 14px rgba(22,163,74,.3); position: relative; overflow: hidden; }
        .btn-primary::after { content: ''; position: absolute; inset: 0; background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%); transform: translateX(-100%); transition: transform 0.6s; }
        .btn-primary:hover::after { transform: translateX(100%); }
        .btn-primary:hover { background: #15803d; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(22,163,74,.4); }
        
        .btn-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 28px; background: white; color: #0d2818; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; text-decoration: none; font-family: inherit; transition: all 0.3s; }
        .btn-secondary:hover { border-color: #16a34a; color: #16a34a; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.05); }
        
        /* Cards */
        .glass-card { background: white; border-radius: 20px; padding: 32px; border: 1px solid #f1f5f9; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden; }
        .glass-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: #16a34a; transform: scaleX(0); transition: transform 0.4s; transform-origin: right; }
        .glass-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,.08); border-color: transparent; }
        .glass-card:hover::before { transform: scaleX(1); }
        
        .price-card { background: white; border-radius: 24px; padding: 36px; border: 2px solid #f1f5f9; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .price-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,.06); }
        .price-card.popular { border-color: #16a34a; box-shadow: 0 8px 30px rgba(22,163,74,.12); }
        .price-card.popular:hover { box-shadow: 0 20px 50px rgba(22,163,74,.2); }

        /* Dashboard Mockup */
        .mockup-container { perspective: 1000px; }
        .mockup-inner { transform: rotateX(5deg); transition: transform 0.5s; }
        .mockup-inner:hover { transform: rotateX(0deg) scale(1.02); }
        
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        .float-anim { animation: float 6s ease-in-out infinite; }

        @media(max-width:768px){
          .hero-title { font-size: 36px !important; }
          .hero-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .nav-links { display: none !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .mockup-inner { transform: rotateX(0) scale(0.95); }
          .mockup-inner:hover { transform: rotateX(0) scale(0.98); }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: scrollY > 50 ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.95)', backdropFilter: 'blur(16px)', borderBottom: scrollY > 50 ? '1px solid #f1f5f9' : '1px solid transparent', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/storely-logo.png" alt="Storely" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
          <span style={{ fontSize: 20, fontWeight: 900, color: '#0d2818' }}>Storely</span>
        </div>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {[['المميزات', '#features'], ['كيف يعمل', '#how'], ['الأسعار', '#pricing']].map(([l, h]) => (
            <a key={h} href={h} style={{ fontSize: 14, fontWeight: 600, color: '#475569', textDecoration: 'none', transition: 'color 0.2s' }}>{l}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/login" className="btn-secondary" style={{ padding: '9px 18px', fontSize: 13 }}>دخول</Link>
          <Link href="/login?mode=register" className="btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>ابدأ مجاناً</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(160deg,#0d2818 0%,#1a4731 50%,#0d2818 100%)', padding: '100px 24px 120px', overflow: 'hidden', position: 'relative' }}>
        {/* Parallax Background Elements */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '10%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,163,74,.2) 0%, transparent 70%)', transform: `translate(${scrollY * 0.05}px, ${scrollY * 0.02}px)` }} />
          <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,190,122,.15) 0%, transparent 70%)', transform: `translate(${-scrollY * 0.03}px, ${-scrollY * 0.01}px)` }} />
        </div>
        
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 40, alignItems: 'center' }} className="hero-grid">
          {/* Text Content */}
          <div>
            <FadeIn>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(22,163,74,.15)', border: '1px solid rgba(22,163,74,.3)', borderRadius: 20, padding: '6px 16px', marginBottom: 24 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4abe7a', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#4abe7a' }}>نظام إدارة مخزون سعودي احترافي</span>
              </div>
            </FadeIn>
            
            <FadeIn delay={0.1}>
              <h1 className="hero-title" style={{ fontSize: 52, fontWeight: 900, color: 'white', lineHeight: 1.15, marginBottom: 20 }}>
                أدِر مخزونك<br />
                <span style={{ color: '#4abe7a' }}>بذكاء وسهولة</span>
              </h1>
            </FadeIn>
            
            <FadeIn delay={0.2}>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,.65)', lineHeight: 1.8, marginBottom: 32 }}>
                تتبع مخزونك لحظة بلحظة، واستقبل تنبيهات واتساب عند نقص الأصناف، وأدِر موظفيك وفروعك من مكان واحد
              </p>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/login?mode=register" className="btn-primary" style={{ fontSize: 16, padding: '16px 32px' }}>
                  ابدأ تجربتك المجانية ←
                </Link>
                <a href="#features" className="btn-secondary" style={{ fontSize: 16, padding: '16px 32px', background: 'rgba(255,255,255,.1)', color: 'white', border: '1px solid rgba(255,255,255,.2)' }}>
                  اكتشف المميزات
                </a>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 16 }}>14 يوم مجاناً · بدون بطاقة ائتمان</p>
            </FadeIn>
          </div>

          {/* Dashboard + Mascot */}
          <FadeIn delay={0.4}>
            <div className="mockup-container float-anim" style={{ position: 'relative' }}>
              {/* Mascot sitting on the dashboard */}
              <div style={{ position: 'absolute', top: -60, right: 20, zIndex: 10 }}>
                <StoreMascot focused={null} />
              </div>
              
              <div className="mockup-inner" style={{ background: 'rgba(255,255,255,.05)', borderRadius: 20, padding: 3, border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 30px 60px rgba(0,0,0,.3)' }}>
                <div style={{ background: '#1e293b', borderRadius: 18, padding: '16px 20px 0', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                    <div style={{ flex: 1, background: 'rgba(255,255,255,.1)', height: 6, borderRadius: 99, margin: '0 12px', marginTop: 2 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                    {[{ l: 'الأصناف', v: '247', c: '#16a34a' }, { l: 'صرف اليوم', v: '18', c: '#3b82f6' }, { l: 'مشتريات', v: '12', c: '#8b5cf6' }, { l: 'تنبيهات', v: '3', c: '#ef4444' }].map((s) => (
                      <div key={s.l} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>{s.l}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: 14, marginBottom: 0 }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', marginBottom: 10 }}>أحدث الحركات</div>
                    {[{ n: 'دجاج مشوي', q: '-5 كيلو', c: '#ef4444' }, { n: 'بهارات', q: '+20 كيس', c: '#16a34a' }, { n: 'زيت زيتون', q: '-2 لتر', c: '#ef4444' }].map((p, i) => (
                      <div key={p.n} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{p.n}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: p.c }}>{p.q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Types Bar */}
      <section style={{ padding: '32px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, marginBottom: 20 }}>مناسب لجميع أنواع المنشآت</p>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['🍔 مطاعم', '☕ كوفي', '🥖 مخابز', '🛒 بقاليات', '💊 صيدليات', '🏭 مستودعات', '🛍️ متاجر', '🏢 شركات'].map((t) => (
              <span key={t} style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '100px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <h2 style={{ fontSize: 40, fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>كل ما تحتاجه في مكان واحد</h2>
              <p style={{ fontSize: 16, color: '#64748b', maxWidth: 500, margin: '0 auto' }}>أدوات احترافية تساعدك على إدارة مخزونك بكفاءة عالية</p>
            </div>
          </FadeIn>
          
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {[
              { icon: '📦', title: 'تتبع المخزون لحظة بلحظة', desc: 'شوف كميات جميع منتجاتك في الوقت الفعلي مع تنبيهات فورية عند الوصول للحد الأدنى' },
              { icon: '📲', title: 'تنبيهات واتساب تلقائية', desc: 'استقبل إشعارات واتساب فوراً عند نقص أي صنف مع إمكانية إرسال طلب الشراء للمورد مباشرة' },
              { icon: '👥', title: 'إدارة الموظفين بصلاحيات', desc: 'أضف موظفيك وحدد صلاحياتهم بالضبط — صرف أو مخزون أو مشتريات أو تقارير' },
              { icon: '📊', title: 'تقارير وإحصائيات', desc: 'تقارير تفصيلية عن حركة المخزون والمشتريات والصرف لاتخاذ قرارات أذكى' },
              { icon: '🏪', title: 'إدارة الفروع', desc: 'تحكم في جميع فروعك من لوحة تحكم واحدة مع إمكانية تخصيص كل فرع' },
              { icon: '🤝', title: 'موردون معتمدون', desc: 'وصول حصري لشبكة موردين معتمدين مع عروض وخصومات خاصة لعملاء Storely' },
            ].map((f, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="glass-card">
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20 }}>{f.icon}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.8 }}>{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ padding: '100px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <h2 style={{ fontSize: 40, fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>ابدأ في 3 خطوات بسيطة</h2>
              <p style={{ fontSize: 16, color: '#64748b' }}>لا تحتاج خبرة تقنية — النظام بسيط وسهل الاستخدام</p>
            </div>
          </FadeIn>
          
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 40 }}>
            {[
              { n: '1', icon: '📝', title: 'سجّل حسابك', desc: 'أنشئ حسابك مجاناً في دقيقة واحدة بدون بطاقة ائتمان' },
              { n: '2', icon: '📦', title: 'أضف منتجاتك', desc: 'أضف منتجاتك وحدد الكميات وحد إعادة الطلب لكل صنف' },
              { n: '3', icon: '📲', title: 'تحكم واستلم التنبيهات', desc: 'راقب مخزونك واستقبل تنبيهات واتساب تلقائياً عند النقص' },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 0.15}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#0d2818,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 30, boxShadow: '0 10px 30px rgba(22,163,74,.3)' }}>
                    {s.icon}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>الخطوة {s.n}</div>
                  <h3 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.8 }}>{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '100px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <h2 style={{ fontSize: 40, fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>أسعار شفافة بدون مفاجآت</h2>
              <p style={{ fontSize: 16, color: '#64748b' }}>ابدأ مجاناً 14 يوم · بدون بطاقة ائتمان</p>
            </div>
          </FadeIn>

          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, maxWidth: 960, margin: '0 auto' }}>
            {PLANS.map((p, i) => (
              <FadeIn key={i} delay={i * 0.15}>
                <div className={`price-card${p.popular ? ' popular' : ''}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  {p.popular && (
                    <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: 'white', fontSize: 12, fontWeight: 700, padding: '6px 20px', borderRadius: 20, boxShadow: '0 4px 12px rgba(22,163,74,.3)' }}>
                      الأكثر شيوعاً
                    </div>
                  )}
                  
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 44, fontWeight: 900, color: '#0f172a' }}>{p.price}</span>
                      <span style={{ fontSize: 15, color: '#94a3b8' }}>ر.س/شهر</span>
                    </div>
                  </div>

                  {/* Limits Section */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24, padding: '16px', background: '#f8fafc', borderRadius: 12 }}>
                    {Object.values(p.limits).map((l) => (
                      <div key={l} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 4px' }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ height: 1, background: '#f1f5f9', marginBottom: 20 }} />

                  {/* Features List */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                    {p.features.map((f) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#374151' }}>
                        <span style={{ color: '#16a34a', fontWeight: 800, flexShrink: 0 }}>✓</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  <a href={`https://wa.me/966594351667?text=أريد الاشتراك في باقة ${p.name}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', width: '100%', padding: '14px', background: p.popular ? '#16a34a' : 'white', color: p.popular ? 'white' : '#16a34a', border: '2px solid #16a34a', borderRadius: 14, fontSize: 15, fontWeight: 800, textDecoration: 'none', textAlign: 'center', transition: 'all 0.3s', boxShadow: p.popular ? '0 4px 15px rgba(22,163,74,.3)' : 'none' }}>
                    ابدأ الآن
                  </a>
                </div>
              </FadeIn>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#94a3b8', marginTop: 32 }}>جميع الباقات تشمل تجربة مجانية 14 يوم</p>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 24px', background: 'linear-gradient(135deg,#0d2818,#1a4731)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50%', right: '-20%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(22,163,74,.1)' }} />
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
          <FadeIn>
            <h2 style={{ fontSize: 40, fontWeight: 900, color: 'white', marginBottom: 16 }}>ابدأ إدارة مخزونك اليوم</h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,.7)', marginBottom: 36, lineHeight: 1.8 }}>انضم لمئات المنشآت التي تستخدم Storely لإدارة مخزونها باحترافية</p>
            <Link href="/login?mode=register" className="btn-primary" style={{ fontSize: 17, padding: '18px 40px' }}>
              ابدأ تجربتك المجانية ←
            </Link>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 20 }}>14 يوم مجاناً · بدون بطاقة ائتمان · إلغاء في أي وقت</p>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0d2818', padding: '40px 24px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/storely-logo.png" alt="Storely" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
            <span style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>Storely</span>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {['تسجيل الدخول:/login', 'إنشاء حساب:/login?mode=register', 'انضم كمورد:/suppliers-join', 'الشروط والأحكام:/terms'].map((t) => {
              const [text, href] = t.split(':')
              return <a key={href} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', textDecoration: 'none' }}>{text}</a>
            })}
            <a href="https://wa.me/966594351667" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', textDecoration: 'none' }}>تواصل معنا</a>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>© {new Date().getFullYear()} Storely. جميع الحقوق محفوظة</p>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer"
        style={{ position: 'fixed', bottom: 28, left: 28, zIndex: 999, width: 56, height: 56, borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(37,211,102,.4)', textDecoration: 'none', transition: 'all 0.3s', border: '4px solid white' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(37,211,102,.5)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,211,102,.4)' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
      </a>
    </div>
  )
}
