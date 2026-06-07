'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PendingPage() {
  const [email, setEmail] = useState('')
  const sb = createClient()

  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#0d2818,#1a4731)',fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl',padding:20}}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* خلفية زخرفية */}
      <div style={{position:'fixed',inset:0,overflow:'hidden',pointerEvents:'none'}}>
        <div style={{position:'absolute',top:-100,right:-100,width:400,height:400,background:'rgba(74,190,122,0.05)',borderRadius:'50%'}}/>
        <div style={{position:'absolute',bottom:-150,left:-100,width:500,height:500,background:'rgba(45,122,79,0.08)',borderRadius:'50%'}}/>
      </div>

      <div style={{animation:'fadeIn 0.6s ease',width:'100%',maxWidth:460,position:'relative'}}>
        {/* البطاقة الرئيسية */}
        <div style={{background:'white',borderRadius:24,padding:'48px 40px',boxShadow:'0 32px 80px rgba(0,0,0,0.3)',textAlign:'center'}}>
          
          {/* الأيقونة */}
          <div style={{marginBottom:28}}>
            <div style={{width:88,height:88,background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',borderRadius:24,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 0',border:'2px solid #86efac',animation:'float 3s ease-in-out infinite'}}>
              <svg width="44" height="44" fill="none" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4" stroke="#1a4731" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="#1a4731" strokeWidth="2" fill="none"/>
                <circle cx="12" cy="12" r="3" fill="#4abe7a" opacity="0.3"/>
              </svg>
            </div>
          </div>

          {/* Storely badge */}
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#f0fdf4',border:'1px solid #86efac',borderRadius:20,padding:'4px 14px',marginBottom:20}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#4abe7a',animation:'pulse 2s infinite'}}/>
            <span style={{fontSize:12,fontWeight:600,color:'#166534'}}>Storely</span>
          </div>

          {/* العنوان */}
          <h1 style={{fontSize:24,fontWeight:800,color:'#0f172a',marginBottom:10,lineHeight:1.3}}>
            تم إنشاء حسابك! 🎉
          </h1>
          <p style={{fontSize:15,color:'#475569',lineHeight:1.8,marginBottom:28}}>
            حسابك بانتظار التفعيل من الإدارة.<br/>
            سنتواصل معك قريباً.
          </p>

          {/* بيانات الحساب */}
          {email && (
            <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 18px',marginBottom:24,display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:36,height:36,background:'#e2e8f0',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="18" height="18" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/><path d="m22 6-10 7L2 6"/></svg>
              </div>
              <div style={{textAlign:'right',flex:1,minWidth:0}}>
                <div style={{fontSize:11,color:'#94a3b8',marginBottom:2}}>البريد الإلكتروني</div>
                <div style={{fontSize:13,fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{email}</div>
              </div>
            </div>
          )}

          {/* خطوات */}
          <div style={{background:'#f8fafc',borderRadius:14,padding:'18px',marginBottom:28,textAlign:'right'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#64748b',marginBottom:12,textTransform:'uppercase',letterSpacing:'0.05em'}}>ماذا يحدث الآن؟</div>
            {[
              { step:'1', text:'تلقّينا طلب تسجيلك', done:true },
              { step:'2', text:'الإدارة ستراجع حسابك', done:false },
              { step:'3', text:'ستصلك رسالة تفعيل', done:false },
            ].map((s,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:i<2?10:0}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:s.done?'#1a4731':'#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {s.done ? (
                    <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <span style={{fontSize:10,fontWeight:700,color:'#94a3b8'}}>{s.step}</span>
                  )}
                </div>
                <span style={{fontSize:13,color:s.done?'#0f172a':'#64748b',fontWeight:s.done?600:400}}>{s.text}</span>
              </div>
            ))}
          </div>

          {/* زر العودة */}
          <a href="/login" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'13px',background:'#1a4731',color:'white',borderRadius:12,fontSize:14,fontWeight:700,textDecoration:'none'}}>
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            العودة لتسجيل الدخول
          </a>
        </div>

        {/* footer -->*/}
        <div style={{textAlign:'center',marginTop:20,fontSize:12,color:'rgba(255,255,255,0.5)'}}>
          Storely — نظام إدارة المخزون الاحترافي
        </div>
      </div>
    </div>
  )
}
