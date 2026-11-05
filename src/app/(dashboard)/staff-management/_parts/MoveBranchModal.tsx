'use client'
import { colors, radius, shadow, font, btnPrimary, btnSecondary, inp } from '@/lib/ds'
import type { StaffPage } from './useStaffManagement'

export default function MoveBranchModal({ m }: { m: StaffPage }) {
  const { branches, moveFor, setMoveFor, moveTo, setMoveTo, moving, confirmMove } = m
  return (
    <>
      {moveFor && (
        <div onClick={()=>setMoveFor(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:colors.surface,borderRadius:radius.xl,padding:24,width:'100%',maxWidth:400,boxShadow:shadow.lg}}>
            <div style={{fontSize:font.md,fontWeight:800,color:colors.text}}>نقل {moveFor.name} لفرع ثاني</div>
            <div style={{fontSize:12,color:colors.text3,marginTop:4,marginBottom:14}}>حالياً بفرع «{moveFor.branches?.name || '—'}»</div>
            <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:6}}>الفرع الجديد</label>
            <select value={moveTo} onChange={e=>setMoveTo(e.target.value)} style={inp()}>
              <option value="">اختر الفرع</option>
              {branches.filter((b:any)=>b.id!==moveFor.branch_id).map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <div style={{fontSize:11.5,color:colors.text3,background:colors.bg,borderRadius:10,padding:'10px 12px',marginTop:12,lineHeight:1.8}}>
              • يحضّر وينصرف من موقع الفرع الجديد<br/>
              • لو شفته خاص بالفرع القديم ينفك — حدد له شفت بالفرع الجديد<br/>
              • المنتجات المخصصة له تنمسح (كانت من الفرع القديم)<br/>
              • سجلاته القديمة (الحضور والخصومات والرواتب) تبقى زي ما هي<br/>
              • يطلب منه النظام رمزه مرة وحدة عشان يدخل على فرعه الجديد
            </div>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={()=>setMoveFor(null)} style={{...btnSecondary,flex:1,padding:'12px'}}>إلغاء</button>
              <button onClick={confirmMove} disabled={!moveTo||moving} style={{...btnPrimary,flex:2,padding:'12px',opacity:!moveTo||moving?.6:1}}>{moving?'جاري النقل...':'نقل'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
