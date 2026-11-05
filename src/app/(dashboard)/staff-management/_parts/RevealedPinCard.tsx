'use client'
import { colors, radius, font, card, btnSecondary } from '@/lib/ds'
import { toast } from '@/components/toast'
import { Copy, CheckCircle2 } from 'lucide-react'
import type { StaffPage } from './useStaffManagement'

export default function RevealedPinCard({ m }: { m: StaffPage }) {
  const { revealedPin, setRevealedPin } = m
  return (
    <>
      {/* Revealed PIN card */}
      {revealedPin && (
        <div className="su" style={{...card,padding:20,marginBottom:18,background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`,animationDelay:'.08s'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
            <div style={{width:40,height:40,borderRadius:12,background:colors.primary,display:'flex',alignItems:'center',justifyContent:'center'}}><CheckCircle2 size={19} color="white" strokeWidth={2}/></div>
            <div>
              <div style={{fontSize:font.base,fontWeight:800,color:colors.text}}>تم إضافة {revealedPin.name}</div>
              <div style={{fontSize:font.xs,color:colors.text3}}>شارك هذي البيانات مع الموظف</div>
            </div>
          </div>
          <div style={{background:'white',borderRadius:radius.md,padding:'14px 16px',marginBottom:14,border:`1px solid ${colors.primaryBorder}`}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:12}}>
              <div>
                <div style={{fontSize:font.xs,color:colors.text4,fontWeight:700,marginBottom:4}}>رقم الجوال</div>
                <div style={{fontSize:font.lg,fontWeight:800,color:colors.text,direction:'ltr',textAlign:'right' as const}}>{revealedPin.phone}</div>
              </div>
              <div>
                <div style={{fontSize:font.xs,color:colors.text4,fontWeight:700,marginBottom:4}}>رمز PIN</div>
                <div style={{fontSize:32,fontWeight:900,color:colors.primary,letterSpacing:8}}>{revealedPin.pin}</div>
              </div>
            </div>
            <div>
              <div style={{fontSize:font.xs,color:colors.text4,fontWeight:700,marginBottom:6}}>رابط الدخول</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{fontSize:font.xs,color:colors.text,background:colors.bg,padding:'8px 12px',borderRadius:8,border:`1px solid ${colors.border}`,flex:1,direction:'ltr',textAlign:'left' as const,overflowX:'auto',whiteSpace:'nowrap' as const}}>https://storely.dev/staff</div>
                <button onClick={()=>{navigator.clipboard.writeText('https://storely.dev/staff');toast('تم نسخ الرابط ✓')}} style={{background:colors.primary,color:'white',border:'none',borderRadius:8,padding:'8px 14px',fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family,whiteSpace:'nowrap' as const,display:'flex',alignItems:'center',gap:5}}>
                  <Copy size={13} strokeWidth={2.25}/> نسخ الكل
                </button>
              </div>
            </div>
          </div>
          <button onClick={()=>setRevealedPin(null)} style={{...btnSecondary,padding:'8px 16px',fontSize:font.xs}}>إخفاء ✓</button>
        </div>
      )}
    </>
  )
}
