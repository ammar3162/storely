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
    <div style={{ background:'#ffffff', position:'sticky', top:0, zIndex:100, borderBottom:'1px solid #E6E8EC', boxShadow:'0 1px 2px rgba(16,24,40,.04)', direction: rtl ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth:560, margin:'0 auto', padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => router.push(backTo)} aria-label={back}
          style={{ ...staffHeaderBtn, padding:'0 12px 0 10px', gap:4, fontSize:13 }}>
          <ChevronRight size={18} strokeWidth={2.25} style={{ transform: rtl ? 'none' : 'scaleX(-1)' }}/>
          {back}
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:800, color:'#101828', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</div>
          {subtitle && <div style={{ fontSize:12, color:'#475569', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{subtitle}</div>}
        </div>
        {end}
      </div>
    </div>
  )
}

// زر فاتح بنفس شكل زر الرجوع — للاستخدام داخل `end`
export const staffHeaderBtn: React.CSSProperties = {
  height:38, padding:'0 11px', flexShrink:0, background:'#F6F7F9', border:'1px solid #E6E8EC',
  borderRadius:12, color:'#101828', display:'flex', alignItems:'center', justifyContent:'center', gap:6, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:700,
}
