'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function run() {
      let { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        await new Promise(r => setTimeout(r, 900))
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).maybeSingle()
      if (profile?.org_id) {
        const { data: org } = await (supabase.from('organizations') as any).select('onboarding_done').eq('id', profile.org_id).single()
        if (org && !org.onboarding_done) { router.replace('/onboarding'); return }
        router.replace('/dashboard')
      } else {
        router.replace('/login?mode=register&oauth=1')
      }
    }
    run()
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:36,height:36,border:'3px solid #e5e7eb',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 16px'}}/>
        <div style={{fontSize:14,color:'#6b7280'}}>جاري تسجيل الدخول...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
