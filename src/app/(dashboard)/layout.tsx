'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

const NAV = [
  { href:'/inventory', label:'المخزون',  icon:'📦' },
  { href:'/dispense',  label:'صرف',      icon:'📤' },
  { href:'/reports',   label:'التقارير', icon:'📊' },
  { href:'/settings',  label:'الإعدادات',icon:'⚙️' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [orgName, setOrgName] = useState('')
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('org_id, organizations(name)')
        .eq('id', user.id).single()
      if (profile?.organizations) {
        setOrgName((profile.organizations as any).name)
      }
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div style={{minHeight:'100vh',background:'#f1f5f9',fontFamily:'system-ui',direction:'rtl'}}>
      {/* Header */}
      <header style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'0 24px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 8px rgba(0,0,0,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,background:'linear-gradient(135deg,#667eea,#764ba2)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏪</div>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:'#0f172a'}}>Storely</div>
            {orgName && <div style={{fontSize:11,color:'#94a3b8',fontWeight:500}}>{orgName}</div>}
          </div>
        </div>
        <button onClick={handleLogout} style={{padding:'7px 16px',background:'#fef2f2',color:'#ef4444',border:'1.5px solid #fecaca',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'}}>
          خروج
        </button>
      </header>

      {/* Nav */}
      <nav style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'0 24px',display:'flex',gap:4}}>
        {NAV.map(n => (
          <a key={n.href} href={n.href} style={{display:'flex',alignItems:'center',gap:6,padding:'14px 16px',fontSize:14,fontWeight:pathname===n.href?800:500,color:pathname===n.href?'#667eea':'#64748b',borderBottom:pathname===n.href?'2px solid #667eea':'2px solid transparent',textDecoration:'none',transition:'all 0.2s'}}>
            <span>{n.icon}</span>{n.label}
          </a>
        ))}
      </nav>

      {/* Content */}
      <main style={{maxWidth:1200,margin:'0 auto',padding:'28px 24px'}}>
        {children}
      </main>
    </div>
  )
}
