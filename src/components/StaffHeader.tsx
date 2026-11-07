'use client'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useStaffLang, type Dict } from '@/lib/staffLang'

const BACK: Dict = { b: { ar: 'رجوع', en: 'Back', ur: 'واپس', hi: 'वापस', tl: 'Bumalik', bn: 'ফিরে যান', fr: 'Retour' } }

// الشريط العلوي الموحّد لصفحات الموظف — زر رجوع للرئيسية دايماً بنفس المكان
export default function StaffHeader({ title, subtitle, end, rtl = true, backTo = '/staff/choose', backLabel }: {
  title: string
  subtitle?: string
  end?: ReactNode   // أزرار إضافية بالطرف الثاني (لغة، خروج...)
  rtl?: boolean
  backTo?: string
  backLabel?: string  // للغات غير العربي/الإنجليزي
}) {
  const router = useRouter()
  const { t } = useStaffLang(BACK)
  const back = backLabel || t('b')
  return (
    // فاتح مثل لوحة المالك: أبيض بخط سفلي، والنص أسود واضح
    <div style={{ background:'#ffffff', position:'sticky', top:0, zIndex:100, borderBottom:'1px solid #e5e7eb', direction: rtl ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth:560, margin:'0 auto', padding:'12px 16px', display:'flex', alignItems:'center', gap:8 }}>
        <button onClick={() => router.push(backTo)} aria-label={back}
          style={{ ...staffHeaderBtn, background:'transparent', padding:'0 4px', minWidth:36 }}>
          <ChevronRight size={20} strokeWidth={1.75} style={{ transform: rtl ? 'none' : 'scaleX(-1)' }}/>
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:17, fontWeight:600, lineHeight:'24px', color:'#111827', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</div>
          {subtitle && <div style={{ fontSize:13, lineHeight:'20px', color:'#4b5565', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{subtitle}</div>}
        </div>
        {end}
      </div>
    </div>
  )
}

// زر فاتح بنفس شكل زر الرجوع — للاستخدام داخل `end`
export const staffHeaderBtn: React.CSSProperties = {
  height:36, minWidth:36, padding:'0 10px', flexShrink:0, background:'#eceef1', border:'none',
  borderRadius:10, color:'#111827', display:'flex', alignItems:'center', justifyContent:'center', gap:4, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:500,
}
