'use client'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

// الشريط العلوي الموحّد لصفحات الموظف — زر رجوع للرئيسية دايماً بنفس المكان
export default function StaffHeader({ title, subtitle, end, rtl = true, backTo = '/staff/choose' }: {
  title: string
  subtitle?: string
  end?: ReactNode   // أزرار إضافية بالطرف الثاني (لغة، خروج...)
  rtl?: boolean
  backTo?: string
}) {
  const router = useRouter()
  return (
    <div style={{ background:'linear-gradient(160deg,#0b3b3a 0%,#0f766e 100%)', position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 12px rgba(15,23,42,.12)', direction: rtl ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth:560, margin:'0 auto', padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => router.push(backTo)} aria-label={rtl ? 'رجوع' : 'Back'}
          style={{ height:38, padding:'0 12px 0 10px', flexShrink:0, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.18)', borderRadius:12, color:'white', display:'flex', alignItems:'center', gap:4, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700 }}>
          <ChevronRight size={18} strokeWidth={2.25} style={{ transform: rtl ? 'none' : 'scaleX(-1)' }}/>
          {rtl ? 'رجوع' : 'Back'}
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'white', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</div>
          {subtitle && <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{subtitle}</div>}
        </div>
        {end}
      </div>
    </div>
  )
}

// زر أبيض شفاف بنفس شكل زر الرجوع — للاستخدام داخل `end`
export const staffHeaderBtn: React.CSSProperties = {
  height:38, padding:'0 11px', flexShrink:0, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.18)',
  borderRadius:12, color:'white', display:'flex', alignItems:'center', justifyContent:'center', gap:6, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:700,
}
