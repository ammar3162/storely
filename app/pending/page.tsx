'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PendingPage() {
  const supabase = createClient()
  const router   = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{
      minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
      background:'linear-gradient(135deg,#667eea,#764ba2)',
      fontFamily:'system-ui',direction:'rtl',padding:20
    }}>
      <div style={{
        background:'white',borderRadius:24,padding:'48px 40px',
        maxWidth:440,width:'100%',textAlign:'center',
        boxShadow:'0 25px 60px rgba(0,0,0,0.2)'
      }}>
        <div style={{fontSize:56,marginBottom:16}}>⏳</div>
        <h1 style={{fontSize:22,fontWeight:900,color:'#0f172a',marginBottom:8}}>
          بانتظار الموافقة
        </h1>
        <p style={{fontSize:14,color:'#64748b',lineHeight:1.7,marginBottom:24}}>
          شكراً لتسجيلك في Storely!<br />
          حسابك قيد المراجعة وسيتم تفعيله قريباً من قِبل الإدارة.
        </p>
        <div style={{background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:14,padding:'14px 18px',marginBottom:24}}>
          <div style={{fontSize:13,color:'#16a34a',fontWeight:600}}>
            📱 سنتواصل معك عبر واتساب عند التفعيل
          </div>
        </div>
        <a href="https://wa.me/966561161448" style={{
          display:'block',padding:'13px',borderRadius:12,
          background:'#25d366',color:'white',
          fontSize:14,fontWeight:700,textDecoration:'none',marginBottom:10
        }}>
          💬 تواصل مع الدعم
        </a>
        <button onClick={handleLogout} style={{
          width:'100%',padding:'13px',borderRadius:12,
          background:'#f1f5f9',color:'#64748b',
          border:'none',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'system-ui'
        }}>
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}