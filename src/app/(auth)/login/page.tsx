'use client'
import { useState, useEffect, Suspense } from 'react'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { useLogin } from './_parts/useLogin'
import AccountBlocked from './_parts/AccountBlocked'
import LoginForm from './_parts/LoginForm'
import RegisterStep1 from './_parts/RegisterStep1'
import RegisterStep2 from './_parts/RegisterStep2'
import ForgotForm from './_parts/ForgotForm'
import SentNotices from './_parts/SentNotices'

function LoginPage() {
  const m = useLogin()

  return (
    <div style={{minHeight:'100vh',fontFamily:'var(--storely-font)',direction:'rtl',background:'var(--storely-background)',display:'flex',flexDirection:'column'}}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .inp{width:100%;min-width:0;min-height:44px;padding:11px 14px;border:1px solid var(--storely-control-border);border-radius:12px;font-size:17px;outline:none;background:white;color:var(--storely-text);font-family:inherit;transition:border-color .2s}
        .inp:focus{border-color:#203640;box-shadow:0 0 0 3px rgba(32,54,64,.15)}
        .inp::placeholder{color:var(--storely-subtle)}
        .btn-main{width:100%;min-height:50px;padding:13px;background:#203640;color:white;border:none;border-radius:999px;font-size:17px;font-weight:500;cursor:pointer;font-family:inherit;transition:background-color .2s}
        .btn-main:hover{background:#16262D}
        .btn-main:disabled{opacity:.6;cursor:not-allowed}
        .tab{flex:1;padding:9px 12px;border:none;border-radius:999px;font-size:15px;cursor:pointer;font-family:inherit;font-weight:500;transition:background-color .2s,color .2s}
        .biz{padding:12px 8px;border-radius:16px;border:1.5px solid var(--storely-control-border);background:white;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:4px;transition:all .15s;font-size:13px;font-weight:600;color:var(--storely-text)}
        .biz:hover{border-color:#203640}
        .biz.on{border-color:#203640;background:var(--storely-background);color:#203640}
        .auth-card{background:white;border:none;border-radius:22px;padding:32px 28px;box-shadow:0 12px 40px rgba(0,0,0,.06)}
        @media(max-width:480px){.auth-card{padding:24px 18px;border-radius:22px}}
      `}</style>


      <div style={{flex:1,display:'flex'}}>
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px'}}>
          <div style={{width:'100%',maxWidth:420,minWidth:0,animation:'fadeUp .4s ease'}}>
            {/* الشعار والجملة فوق البطاقة */}
            <a href="/" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,marginBottom:22,textDecoration:'none'}}>
              <img src="/storely-logo.png" alt="Storely" style={{width:52,height:52,objectFit:'contain'}}/>
              <span style={{fontSize:15,fontWeight:500,color:'var(--storely-muted)'}}>نظام واحد يربط كل أعمال منشأتك</span>
            </a>
            <div className="auth-card">

            <AccountBlocked m={m}/>

            <LoginForm m={m}/>

            <RegisterStep1 m={m}/>

            <RegisterStep2 m={m}/>

            <ForgotForm m={m}/>

            <SentNotices m={m}/>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  // الوضع (دخول/تسجيل) يُقرأ من الرابط بالمتصفح فقط — بدون هذا يطلع نموذج الدخول لحظة قبل التسجيل
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return <LanguageProvider><Suspense fallback={null}><LoginPage /></Suspense></LanguageProvider>
}
