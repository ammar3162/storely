'use client'
import { colors, radius, shadow, font, btnPrimary, btnSecondary, inp } from '@/lib/ds'
import { Check } from 'lucide-react'
import type { StaffPage } from './useStaffManagement'

export default function DayStartModal({ m }: { m: StaffPage }) {
  const { dayStartHour, setDayStartHour, dayStartLoaded, showHoursModal, setShowHoursModal, savingHours, saveShopHours } = m
  return (
    <>
      {showHoursModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:colors.surface,borderRadius:radius.xl,padding:24,width:'100%',maxWidth:380,boxShadow:shadow.lg}}>
            <div style={{fontSize:font.md,fontWeight:800,color:colors.text,marginBottom:6}}>بداية يوم العمل</div>
            <div style={{fontSize:11,color:colors.text4,marginBottom:14,lineHeight:1.6}}>أي إقفال كاشير قبل هالساعة ينحسب على اليوم اللي قبل. الكاشير يشوف التاريخ قبل ما يحفظ، والتاريخ ما يتعدّل بعد الحفظ.</div>
            <div style={{marginBottom:18}}>
                    <select value={dayStartHour} onChange={e=>setDayStartHour(Number(e.target.value))} style={inp()}>
                      {Array.from({length:11},(_,h)=>(
                        <option key={h} value={h}>{h===0 ? '12:00 منتصف الليل (بدون ترحيل)' : `${h}:00 ${h<6?'الفجر':'الصبح'}`}</option>
                      ))}
                    </select>
                    <div style={{fontSize:10.5,color:colors.text3,marginTop:8,lineHeight:1.6,background:'white',borderRadius:8,padding:'8px 10px',border:`1px solid ${colors.border}`}}>
                      {dayStartHour===0 ? 'كل تقفيل يتسجّل بتاريخ يومه بالضبط.' : <>مثال: لو الكاشير قفّل الأحد الساعة {dayStartHour===1?'12':dayStartHour-1}:30 {dayStartHour<=6?'الفجر':'الصبح'}، يتسجّل الإقفال على <b>السبت</b>.</>}
                    </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowHoursModal(false);setDayStartHour(dayStartLoaded)}} style={{...btnSecondary,flex:1,padding:'12px'}}>إلغاء</button>
              <button onClick={saveShopHours} disabled={savingHours} style={{...btnPrimary,flex:2,padding:'12px',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>{savingHours?'جاري الحفظ...':(<><Check size={15} strokeWidth={2.5}/> حفظ</>)}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
