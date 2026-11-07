'use client'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { useState } from 'react'

const BUSINESS_TYPES = [
  {v:'مطاعم',icon:'🍔'},{v:'كوفي',icon:'☕'},{v:'مخابز',icon:'🥖'},
  {v:'بقالة',icon:'🛒'},{v:'صيدليات',icon:'💊'},{v:'مستودعات',icon:'🏭'},
  {v:'متاجر إلكترونية',icon:'🛍️'},{v:'فنادق',icon:'🏨'},
  {v:'عيادات',icon:'🏥'},{v:'مدارس',icon:'🏫'},
]

export default function SuppliersJoinPage() {
  const [form, setForm] = useState({
    company_name:'', contact_name:'', phone:'', email:'',
    business_type:[] as string[], description:'', website:'', offer:'',
    marketplace_consent:false
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function toggleType(v: string) {
    setForm(f=>({...f, business_type: f.business_type.includes(v) ? f.business_type.filter(x=>x!==v) : [...f.business_type, v]}))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if(!form.company_name||!form.contact_name||!form.phone){setError('يرجى ملء الحقول المطلوبة');return}
    if(form.business_type.length===0){setError('اختر مجال واحد على الأقل');return}
    if(!form.marketplace_consent){setError('يجب الموافقة على عرض بياناتك بمنصة السوق العامة');return}
    setLoading(true); setError('')
    const res = await fetch('/api/supplier-apply', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form)
    })
    if(res.ok){ setDone(true) }
    else { setError('حدث خطأ، حاول مرة أخرى') }
    setLoading(false)
  }

  if(done) return (
    <div style={{minHeight:'100vh',background:'var(--storely-background)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',padding:20}}>
      <div style={{background:"var(--storely-surface)",borderRadius:'var(--radius)',padding:'32px 24px',maxWidth:460,width:'100%',textAlign:'center',boxShadow:'var(--storely-shadow)'}}>
        <div style={{fontSize:64,marginBottom:16}}><FeatureIcon name="🎉" size={26} /></div>
        <h2 style={{fontSize:22,fontWeight:800,color:"var(--storely-text)",marginBottom:8}}>تم استلام طلبك!</h2>
        <p style={{fontSize:14,color:"var(--storely-muted)",lineHeight:1.8,marginBottom:24}}>شكراً لاهتمامك بالشراكة مع Storely. سيتواصل معك فريقنا خلال 24-48 ساعة.</p>
        <a href="https://wa.me/966594351667" target="_blank" rel="noopener noreferrer"
          style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 24px',background:'var(--storely-navy)',color:'white',borderRadius:12,fontSize:14,fontWeight:700,textDecoration:'none'}}>
          📲 تواصل معنا مباشرة
        </a>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'var(--storely-background)',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',padding:20}}>


      <div style={{maxWidth:600,margin:'0 auto',paddingTop:40}}>
        {/* Header */}
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.1)',borderRadius:'var(--radius)',padding:'6px 16px',marginBottom:16}}>
            <span style={{fontSize:12,fontWeight:700,color:'var(--storely-muted)'}}><FeatureIcon name="🤝" /> برنامج شركاء Storely</span>
          </div>
          <h1 style={{fontSize:28,fontWeight:700,color:"var(--storely-text)",marginBottom:8}}>انضم كمورد معتمد</h1>
          <p style={{fontSize:14,color:'var(--storely-muted)',lineHeight:1.8}}>وصول لآلاف المنشآت السعودية التي تستخدم Storely لإدارة مخزونها</p>
        </div>

        {/* Benefits */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,140px),1fr))',gap:12,marginBottom:32}}>
          {[{icon:'🎯',l:'وصول مباشر للعملاء'},{icon:'📦',l:'طلبات منتظمة'},{icon:'🤝',l:'شراكة طويلة الأمد'}].map((s,i)=>(
            <div key={i} style={{background:"var(--storely-surface)",borderRadius:14,padding:'16px 12px',textAlign:'center',border:'1px solid var(--storely-border)'}}>
              <div style={{fontSize:24,marginBottom:6}}><FeatureIcon name={s.icon} /></div>
              <div style={{fontSize:13,color:'var(--storely-muted)',fontWeight:600}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{background:"var(--storely-surface)",borderRadius:'var(--radius)',padding:'24px',boxShadow:'var(--storely-shadow)'}}>
          <h2 style={{fontSize:18,fontWeight:800,color:"var(--storely-text)",marginBottom:24}}>بيانات التسجيل</h2>

          {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'12px 16px',color:'#dc2626',fontSize:13,fontWeight:600,marginBottom:16}}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:12,marginBottom:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"var(--storely-text)",display:'block',marginBottom:6}}>اسم الشركة / المنشأة *</label>
                <input className="storely-input" value={form.company_name} onChange={e=>setForm(f=>({...f,company_name:e.target.value}))} placeholder="مثال: شركة الغذاء الذهبي"/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"var(--storely-text)",display:'block',marginBottom:6}}>اسم المسؤول *</label>
                <input className="storely-input" value={form.contact_name} onChange={e=>setForm(f=>({...f,contact_name:e.target.value}))} placeholder="الاسم الكامل"/>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:12,marginBottom:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"var(--storely-text)",display:'block',marginBottom:6}}>رقم الجوال (واتساب) *</label>
                <input className="storely-input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="05xxxxxxxx" dir="ltr"/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"var(--storely-text)",display:'block',marginBottom:6}}>البريد الإلكتروني</label>
                <input className="storely-input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="example@email.com" dir="ltr"/>
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:"var(--storely-text)",display:'block',marginBottom:8}}>المجالات التي تخدمها * (اختر واحداً أو أكثر)</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,90px),1fr))',gap:6}}>
                {BUSINESS_TYPES.map(b=>(
                  <button key={b.v} type="button" onClick={()=>toggleType(b.v)}
                    style={{padding:'8px 4px',borderRadius:10,border:`1.5px solid ${form.business_type.includes(b.v)?'var(--storely-navy)':'#e5e7eb'}`,background:form.business_type.includes(b.v)?'var(--storely-background)':'white',cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:3,transition:'all .15s'}}>
                    <span style={{fontSize:18}}><FeatureIcon name={b.icon} /></span>
                    <span style={{fontSize:13,fontWeight:600,color:form.business_type.includes(b.v)?'var(--storely-navy)':'#374151'}}>{b.v}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:700,color:"var(--storely-text)",display:'block',marginBottom:6}}>وصف المنتجات / الخدمات</label>
              <textarea className="storely-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                placeholder="اذكر المنتجات أو الخدمات التي تقدمها..."
                style={{minHeight:80,resize:'vertical',width:'100%',padding:'12px 16px',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:14,outline:'none',fontFamily:'inherit'}}/>
            </div>

            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,fontWeight:700,color:"var(--storely-text)",display:'block',marginBottom:6}}>الموقع الإلكتروني (اختياري)</label>
              <input className="storely-input" value={form.website} onChange={e=>setForm(f=>({...f,website:e.target.value}))} placeholder="https://yourwebsite.com" dir="ltr"/>
            </div>

            <label style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:20,cursor:'pointer',padding:'12px 14px',background:'#f9fafb',borderRadius:10,border:'1px solid #e5e7eb'}}>
              <input type="checkbox" checked={form.marketplace_consent} onChange={e=>setForm(f=>({...f,marketplace_consent:e.target.checked}))}
                style={{marginTop:2,accentColor:'var(--storely-navy)',width:16,height:16,flexShrink:0}}/>
              <span style={{fontSize:12,color:'#4b5563',lineHeight:1.7}}>
                أوافق على عرض اسم شركتي ورقم التواصل بمنصة "السوق" العامة داخل Storely في حال قبول طلبي — بحسب <a href="/privacy" target="_blank" style={{color:"var(--storely-text)",textDecoration:'underline'}}>سياسة الخصوصية</a>
              </span>
            </label>

            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'14px',background:loading?'#9ca3af':'var(--storely-navy)',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:'none'}}>
              {loading?'⏳ جاري التسجيل...':'🤝 تقديم طلب الشراكة'}
            </button>
          </form>
        </div>

        <div style={{textAlign:'center',marginTop:20,fontSize:12,color:'var(--storely-muted)'}}>
          Storely — نظام إدارة المخزون الاحترافي
        </div>
      </div>
    </div>
  )
}
