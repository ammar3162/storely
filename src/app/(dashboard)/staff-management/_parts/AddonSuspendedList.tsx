'use client'
import { colors, card } from '@/lib/ds'
import type { StaffPage } from './useStaffManagement'

export default function AddonSuspendedList({ m }: { m: StaffPage }) {
  const { staff, deleteStaff } = m
  return (
    <>
      {/* Staff list */}
      {/* موقوفين بسبب انتهاء إضافة «موظف إضافي» — كانوا مخفيين تماماً، فنعرضهم عشان المالك يقدر يحذفهم ويتحرر رقمهم */}
      {staff.some((x:any)=>x.hidden_from_list) && (
        <div style={{...card,padding:'14px 16px',marginBottom:14,border:`1px solid ${colors.border2}`,background:colors.bg}}>
          <div style={{fontSize:13.5,fontWeight:800,color:colors.text}}>موقوفين بسبب انتهاء إضافة «موظف إضافي» ({staff.filter((x:any)=>x.hidden_from_list).length})</div>
          <div style={{fontSize:12,color:colors.text3,marginTop:3,marginBottom:10,lineHeight:1.6}}>ما يقدرون يدخلون ولا ينحسبون بالرواتب، وأرقام جوالاتهم محجوزة. جدّد الإضافة من «الإضافات» عشان ترجّعهم، أو احذفهم لو ما تحتاجهم.</div>
          <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
            {staff.filter((x:any)=>x.hidden_from_list).map((o:any)=>(
              <div key={o.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap' as const,background:'white',border:`1px solid ${colors.border}`,borderRadius:10,padding:'10px 12px'}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13.5,fontWeight:700,color:colors.text}}>{o.name}</div>
                  <div style={{fontSize:11.5,color:colors.text3,marginTop:2}} dir="auto">{o.phone}</div>
                </div>
                <button onClick={()=>deleteStaff(o.id)} style={{padding:'7px 14px',fontSize:12,fontWeight:700,borderRadius:8,border:`1px solid ${colors.dangerBorder}`,background:colors.dangerLight,color:colors.danger,cursor:'pointer',fontFamily:'inherit'}}>حذف</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
