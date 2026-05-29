'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

const links = [
  { href: '/dashboard',                  label: 'الرئيسية',          icon: '📊' },
  { href: '/dashboard/inventory',        label: 'المخزون',           icon: '📦' },
  { href: '/dashboard/purchases',        label: 'تسجيل مشتريات',    icon: '🛒' },
  { href: '/dashboard/dispenses',        label: 'تسجيل صرف',        icon: '📤' },
  { href: '/dashboard/reports',          label: 'تقرير المشتريات',   icon: '📈' },
  { href: '/dashboard/dispense-reports', label: 'تقرير الصرف',       icon: '📉' },
]

  return (
    <div style={{display:'flex',minHeight:'100vh',fontFamily:'system-ui',direction:'rtl'}}>

      {/* Sidebar */}
      <div style={{width:240,background:'#0f172a',color:'white',display:'flex',flexDirection:'column',position:'fixed',height:'100vh',right:0,zIndex:50}}>

        {/* Logo */}
        <div style={{padding:'24px 20px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
              🏪
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:'white'}}>Storely</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:1}}>نظام المخزون</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:'12px 10px',overflowY:'auto'}}>
          <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',padding:'8px 10px',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:4}}>
            القائمة الرئيسية
          </div>
          {links.map(link => {
            const isActive = pathname === link.href
            return (
              <Link key={link.href} href={link.href} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'11px 12px', borderRadius:10, marginBottom:2,
                color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                background: isActive ? 'rgba(99,102,241,0.25)' : 'transparent',
                textDecoration:'none', fontWeight: isActive ? 700 : 500,
                fontSize:14, transition:'all 0.15s',
                borderRight: isActive ? '3px solid #818cf8' : '3px solid transparent'
              }}>
                <span style={{fontSize:17}}>{link.icon}</span>
                {link.label}
                {isActive && <span style={{marginRight:'auto',width:6,height:6,borderRadius:'50%',background:'#818cf8'}} />}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div style={{padding:'12px 10px',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
          <button onClick={handleLogout} style={{
            width:'100%', padding:'11px 14px', borderRadius:10,
            background:'rgba(239,68,68,0.12)', color:'#f87171',
            border:'1px solid rgba(239,68,68,0.2)', cursor:'pointer',
            fontSize:13, fontWeight:700, fontFamily:'system-ui',
            display:'flex', alignItems:'center', gap:8, justifyContent:'center',
            transition:'all 0.2s'
          }}>
            🚪 تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{flex:1,marginRight:240,background:'#f8fafc',minHeight:'100vh'}}>

        {/* Top Bar */}
        <div style={{
          background:'white', padding:'14px 28px',
          borderBottom:'1px solid #e2e8f0',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          position:'sticky', top:0, zIndex:40,
          boxShadow:'0 1px 4px rgba(0,0,0,0.04)'
        }}>
          <div style={{fontSize:13,color:'#64748b',fontWeight:600}}>
            {new Date().toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{
              width:8,height:8,borderRadius:'50%',background:'#10b981',
              boxShadow:'0 0 0 3px rgba(16,185,129,0.2)',
              animation:'pulse 2s ease-in-out infinite'
            }} />
            <span style={{fontSize:12,color:'#64748b',fontWeight:600}}>متصل</span>
          </div>
        </div>

        {/* Page */}
        <div style={{padding:'28px'}}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.5; transform:scale(0.8); }
        }
      `}</style>
    </div>
  )
}