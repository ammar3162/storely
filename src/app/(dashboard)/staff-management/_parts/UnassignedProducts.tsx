'use client'
import { colors, radius, font } from '@/lib/ds'
import { Package, ChevronDown } from 'lucide-react'
import type { StaffPage } from './useStaffManagement'

export default function UnassignedProducts({ m }: { m: StaffPage }) {
  const { showUnassigned, setShowUnassigned, pickerFor, setPickerFor, assigning, staff, products, quickAssignProduct } = m
  return (
    <>
      {(() => {
        const assignedIds = new Set<string>()
        staff.forEach((s:any) => (s.assigned_products||[]).forEach((pid:string) => assignedIds.add(pid)))
        const unassignedProducts = products.filter((p:any) => !assignedIds.has(p.id))
        if (unassignedProducts.length === 0) return null
        return (
          <div className="su" style={{background:colors.infoLight,border:`1.5px solid ${colors.infoBorder}`,borderRadius:radius.md,padding:'12px 16px',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setShowUnassigned(v=>!v)}>
              <Package size={18} strokeWidth={2} color={colors.info} style={{flexShrink:0}}/>
              <div style={{flex:1}}>
                <b style={{fontSize:font.sm,color:colors.info}}>{unassignedProducts.length} منتج غير مخصص لأي موظف</b>
                <div style={{fontSize:font.xs,color:colors.text3,marginTop:2}}>هذي المنتجات يقدر يشوفها جميع الموظفين بدون تخصيص</div>
              </div>
              <ChevronDown size={16} color={colors.info} strokeWidth={2.25} style={{transform:showUnassigned?'rotate(180deg)':'none',transition:'transform .2s',flexShrink:0}}/>
            </div>
            {showUnassigned && (
              <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${colors.infoBorder}`,display:'flex',flexDirection:'column' as const,gap:6}} onClick={e=>e.stopPropagation()}>
                {unassignedProducts.map((p:any)=>(
                  <div key={p.id} style={{background:colors.surface,border:`1px solid ${colors.border2}`,borderRadius:radius.sm,overflow:'hidden'}}>
                    <button onClick={()=>setPickerFor(prev=>prev===p.id?null:p.id)}
                      style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                      <span style={{fontSize:font.xs,fontWeight:600,color:colors.text2}}>{p.name}</span>
                      <span style={{fontSize:11,color:colors.primary,fontWeight:700}}>{pickerFor===p.id?'إغلاق ×':'+ تخصيص لموظف'}</span>
                    </button>
                    {pickerFor===p.id && (
                      <div style={{display:'flex',flexWrap:'wrap' as const,gap:6,padding:'0 12px 10px'}}>
                        {staff.length===0 ? (
                          <span style={{fontSize:11,color:colors.text4}}>لا يوجد موظفون بعد</span>
                        ) : staff.map((s:any)=>(
                          <button key={s.id} disabled={assigning} onClick={()=>quickAssignProduct(p.id,s.id)}
                            style={{fontSize:11,fontWeight:600,padding:'5px 10px',borderRadius:99,border:`1px solid ${colors.primaryBorder}`,background:colors.primaryLight,color:colors.primary,cursor:assigning?'not-allowed':'pointer',fontFamily:'inherit',opacity:assigning?.6:1}}>
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}
    </>
  )
}
