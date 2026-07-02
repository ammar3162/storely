'use client'
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
    business_type:[] as string[], description:'', website:''
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
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0d2818,#1a4731)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',padding:20}}>
      <div style={{background:'white',borderRadius:24,padding:'48px 40px',maxWidth:460,width:'100%',textAlign:'center',boxShadow:'0 32px 80px rgba(0,0,0,.3)'}}>
        <div style={{fontSize:64,marginBottom:16}}>🎉</div>
        <h2 style={{fontSize:22,fontWeight:800,color:'#0f172a',marginBottom:8}}>تم استلام طلبك!</h2>
        <p style={{fontSize:14,color:'#64748b',lineHeight:1.8,marginBottom:24}}>شكراً لاهتمامك بالشراكة مع Storely. سيتواصل معك فريقنا خلال 24-48 ساعة.</p>
        <a href="https://wa.me/966594351667" target="_blank"
          style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 24px',background:'#16a34a',color:'white',borderRadius:12,fontSize:14,fontWeight:700,textDecoration:'none'}}>
          📲 تواصل معنا مباشرة
        </a>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0d2818,#1a4731)',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',padding:20}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}.inp{width:100%;padding:12px 16px;border:1.5px solid #e5e7eb;borderRadius:10px;fontSize:14px;outline:none;fontFamily:inherit;transition:border-color .2s}.inp:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.08)}`}</style>

      <div style={{maxWidth:600,margin:'0 auto',paddingTop:40}}>
        {/* Header */}
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.1)',borderRadius:20,padding:'6px 16px',marginBottom:16}}>
            <span style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.8)'}}>🤝 برنامج شركاء Storely</span>
          </div>
          <h1 style={{fontSize:28,fontWeight:900,color:'white',marginBottom:8}}>انضم كمورد معتمد</h1>
          <p style={{fontSize:14,color:'rgba(255,255,255,.7)',lineHeight:1.8}}>وصول لآلاف المنشآت السعودية التي تستخدم Storely لإدارة مخزونها</p>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:32}}>
          {[{n:'500+',l:'منشأة مسجلة'},{n:'14',l:'دولة عربية'},{n:'24/7',l:'دعم فني'}].map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,.08)',borderRadius:14,padding:'16px 12px',textAlign:'center',border:'1px solid rgba(255,255,255,.1)'}}>
              <div style={{fontSize:22,fontWeight:900,color:'#4abe7a'}}>{s.n}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.6)',marginTop:4}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{background:'white',borderRadius:24,padding:'32px',boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}>
          <h2 style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:24}}>بيانات التسجيل</h2>

          {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'12px 16px',color:'#dc2626',fontSize:13,fontWeight:600,marginBottom:16}}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>اسم الشركة / المنشأة *</label>
                <input className="inp" value={form.company_name} onChange={e=>setForm(f=>({...f,company_name:e.target.value}))} placeholder="مثال: شركة الغذاء الذهبي"/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>اسم المسؤول *</label>
                <input className="inp" value={form.contact_name} onChange={e=>setForm(f=>({...f,contact_name:e.target.value}))} placeholder="الاسم الكامل"/>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>رقم الجوال (واتساب) *</label>
                <input className="inp" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="05xxxxxxxx" dir="ltr"/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
                <input className="inp" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="example@email.com" dir="ltr"/>
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:8}}>المجالات التي تخدمها * (اختر واحداً أو أكثر)</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6}}>
                {BUSINESS_TYPES.map(b=>(
                  <button key={b.v} type="button" onClick={()=>toggleType(b.v)}
                    style={{padding:'8px 4px',borderRadius:10,border:`1.5px solid ${form.business_type.includes(b.v)?'#16a34a':'#e5e7eb'}`,background:form.business_type.includes(b.v)?'#f0fdf4':'white',cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:3,transition:'all .15s'}}>
                    <span style={{fontSize:18}}>{b.icon}</span>
                    <span style={{fontSize:9,fontWeight:600,color:form.business_type.includes(b.v)?'#16a34a':'#374151'}}>{b.v}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>وصف المنتجات / الخدمات</label>
              <textarea className="inp" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                placeholder="اذكر المنتجات أو الخدمات التي تقدمها..."
                style={{minHeight:80,resize:'none',width:'100%',padding:'12px 16px',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:14,outline:'none',fontFamily:'inherit'}}/>
            </div>

            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>الموقع الإلكتروني (اختياري)</label>
              <input className="inp" value={form.website} onChange={e=>setForm(f=>({...f,website:e.target.value}))} placeholder="https://yourwebsite.com" dir="ltr"/>
            </div>

            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'14px',background:loading?'#9ca3af':'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(22,163,74,.3)'}}>
              {loading?'⏳ جاري التسجيل...':'🤝 تقديم طلب الشراكة'}
            </button>
          </form>
        </div>

        <div style={{textAlign:'center',marginTop:20,fontSize:12,color:'rgba(255,255,255,.4)'}}>
          Storely — نظام إدارة المخزون الاحترافي
        </div>
      </div>
    </div>
  )
}
