'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) { router.push('/dashboard'); return }
      setChecking(false)
    }
    check()
  }, [])

  if (checking) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0f172a'}}>
      <div style={{textAlign:'center',color:'white'}}>
        <div style={{width:48,height:48,border:'4px solid rgba(255,255,255,0.2)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 16px'}} />
        <div style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,0.7)'}}>جاري التحقق...</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0f172a',fontFamily:'system-ui',direction:'rtl'}}>

      {/* Top Bar */}
      <div style={{
        background:'rgba(255,255,255,0.05)',
        borderBottom:'1px solid rgba(255,255,255,0.1)',
        padding:'14px 28px',
        display:'flex',alignItems:'center',justifyContent:'space-between'
      }}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{
            width:36,height:36,
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18
          }}>👑</div>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:'white'}}>Storely Admin</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>لوحة تحكم المدير</div>
          </div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <a href="/dashboard" style={{
            padding:'8px 16px',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.7)',
            border:'1px solid rgba(255,255,255,0.15)',borderRadius:10,fontSize:13,fontWeight:600,
            textDecoration:'none',cursor:'pointer'
          }}>← العودة للداشبورد</a>
          <button onClick={async () => {
            await createClient().auth.signOut()
            window.location.href = '/login'
          }} style={{
            padding:'8px 16px',background:'rgba(239,68,68,0.15)',color:'#f87171',
            border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,fontSize:13,fontWeight:600,
            cursor:'pointer',fontFamily:'system-ui'
          }}>🚪 خروج</button>
        </div>
      </div>

      {/* Content */}
      <div style={{padding:'28px'}}>
        {children}
      </div>
    </div>
  )
}