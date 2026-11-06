'use client'
import { colors, radius, shadow, font, btnPrimary, btnSecondary, inp } from '@/lib/ds'
import { Check } from 'lucide-react'
import type { StaffPage } from './useStaffManagement'

export default function EditNameModal({ m }: { m: StaffPage }) {
  const { editingNameId, setEditingNameId, editNameValue, setEditNameValue, savingName, saveName } = m
  return (
    <>
      {editingNameId && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:colors.surface,borderRadius:radius.xl,padding:24,width:'100%',maxWidth:360,boxShadow:shadow.lg}}>
            <div style={{fontSize:font.md,fontWeight:800,color:colors.text,marginBottom:16}}>تعديل اسم الموظف</div>
            <div style={{marginBottom:18}}>
              <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5}}>الاسم</label>
              <input value={editNameValue} onChange={e=>setEditNameValue(e.target.value)} style={inp()} placeholder="اسم الموظف"
                onKeyDown={e=>{if(e.key==='Enter')saveName()}}/>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setEditingNameId(null)} style={{...btnSecondary,flex:1,padding:'12px'}}>إلغاء</button>
              <button onClick={saveName} disabled={savingName||!editNameValue.trim()} style={{...btnPrimary,flex:2,padding:'12px',opacity:savingName?.7:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>{savingName?'جاري الحفظ...':(<><Check size={15} strokeWidth={2.5}/> حفظ</>)}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
