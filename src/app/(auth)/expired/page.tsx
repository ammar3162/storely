'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMe } from '@/lib/session'
import { Clock } from 'lucide-react'
import RenewSubscription from '@/components/RenewSubscription'

export default function ExpiredPage() {
  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [isManager, setIsManager] = useState(false)
  const sb = createClient()

  useEffect(() => {
    getMe().then(me => {
      if (!me) return
      setName(me.full_name || '')
      setOrgName(me.org?.name || '')
      setIsManager(me.role === 'manager')
    })
  }, [])

  async function logout() {
    await sb.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--storely-background)',fontFamily:'inherit',direction:'rtl',padding:20}}>
      <div style={{width:'100%',maxWidth:460,background:'var(--storely-surface)',border:'1px solid var(--storely-border)',borderRadius:'var(--radius)',padding:'32px 24px',boxShadow:'var(--storely-shadow)',textAlign:'center'}}>
        <div style={{width:56,height:56,borderRadius:12,background:'var(--storely-background)',color:'var(--storely-muted)',display:'grid',placeItems:'center',margin:'0 auto 16px'}}><Clock size={28} /></div>
        <h1 style={{fontSize:24,fontWeight:600,color:'var(--storely-navy)',marginBottom:8}}>
          انتهت فترة الاشتراك
        </h1>
        {orgName && <p style={{fontSize:14,color:'var(--storely-navy)',fontWeight:700,marginBottom:4}}>{orgName}</p>}
        {name && <p style={{fontSize:13,color:'#6b7280',marginBottom:24}}>مرحباً {name}</p>}
        {isManager ? (
          <p style={{fontSize:14,color:'var(--storely-text)',lineHeight:1.8,marginBottom:32}}>
            انتهى اشتراك المنشأة في ستورلي.<br/>
            تواصل مع مالك المنشأة لتجديد الاشتراك، ويمكنك الدخول مباشرة بعد التجديد.
          </p>
        ) : (
          <p style={{fontSize:14,color:'var(--storely-text)',lineHeight:1.8,marginBottom:32}}>
            انتهت صلاحية اشتراكك في Storely.<br/>
            <span className="hide-in-app">جدّد اشتراكك الآن ليعمل حسابك فوراً، وسيتواصل معك فريقنا لإتمام الدفع.</span>
          </p>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {!isManager && <div className="hide-in-app"><RenewSubscription/></div>}
          {!isManager && <a className="hide-in-app" href="https://wa.me/966594351667?text=أريد الاستفسار عن تجديد اشتراك Storely" target="_blank" rel="noopener noreferrer"
            style={{fontSize:13.5,color:'var(--storely-muted)',textDecoration:'underline',textUnderlineOffset:3}}>لديك سؤال؟ تواصل معنا عبر واتساب</a>}

          <button onClick={logout}
            style={{minHeight:40,padding:'8px 16px',background:'var(--storely-surface)',border:'1px solid var(--storely-border)',borderRadius:'var(--radius-sm)',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:'var(--storely-muted)'}}>
            تسجيل الخروج
          </button>
        </div>

        <p style={{fontSize:13,color:'var(--storely-subtle)',marginTop:24}}>
          Storely · storely.dev
        </p>
      </div>
    </div>
  )
}
