'use client'
// صفحة البداية داخل تطبيق الجوال (بديل صفحة الهبوط): توجّه الموظف لصفحته، والمالك للوحة التحكم، وغيرهم للدخول
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AppEntry() {
  useEffect(() => {
    if (localStorage.getItem('staff_session') && localStorage.getItem('staff_token')) {
      window.location.replace('/staff/choose/')
      return
    }
    createClient().auth.getSession().then(({ data }) => {
      window.location.replace(data.session ? '/dashboard/' : '/login/')
    })
  }, [])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d2818' }}>
      <img src="/storely-logo.png" alt="Storely" style={{ width: 72, height: 72, objectFit: 'contain' }} />
    </div>
  )
}
