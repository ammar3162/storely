'use client'
import { colors, radius, font, btnPrimary, btnSecondary, inp } from '@/lib/ds'
import { User, Save, Search } from 'lucide-react'
import type { StaffPage } from './useStaffManagement'

export default function AssignProductsModal({ m }: { m: StaffPage }) {
  const { staff, products, assigningId, setAssigningId, selectedProds, setSelectedProds, assignSearch, setAssignSearch, sharedProducts, saveAssigned } = m
  return (
    <>
      {/* Assign Products Modal */}
      {assigningId && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:colors.surface,borderRadius:radius.xl,padding:26,width:'100%',maxWidth:480,maxHeight:'80vh',display:'flex',flexDirection:'column' as const,boxShadow:'0 32px 80px rgba(0,0,0,.3)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <div style={{fontSize:font.md,fontWeight:800,color:colors.text}}>تخصيص المنتجات</div>
                <div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>اختر المنتجات التي يطّلع عليها هذا الموظف — يمكن أن يُسند المنتج لأكثر من موظف. وإذا لم تختر شيئاً فسيطّلع على جميع منتجات الفرع</div>
              </div>
              <button onClick={()=>setAssigningId(null)} style={{width:32,height:32,borderRadius:radius.sm,border:`1.5px solid ${colors.border2}`,background:colors.bg,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:colors.text3}}>×</button>
            </div>
            
            {/* اختيار الكل */}
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <button onClick={()=>setSelectedProds(products.map((p:any)=>p.id))}
                style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${colors.border2}`,background:colors.bg,color:colors.text2,fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                اختيار الكل
              </button>
              <button onClick={()=>setSelectedProds([])}
                style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${colors.border2}`,background:colors.bg,color:colors.text2,fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                إلغاء الكل
              </button>
              <span style={{fontSize:font.xs,color:colors.text4,alignSelf:'center',marginRight:'auto'}}>
                {selectedProds.length===0?'كل المنتجات':`${selectedProds.length} منتج مختار`}
              </span>
            </div>

            {/* بحث */}
            <div style={{position:'relative',marginBottom:12}}>
              <Search size={15} strokeWidth={2} color={colors.text4} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}/>
              <input value={assignSearch} onChange={e=>setAssignSearch(e.target.value)} placeholder="ابحث عن منتج..."
                style={{...inp(),paddingRight:36}}/>
            </div>

            {/* قائمة المنتجات */}
            <div style={{overflowY:'auto',flex:1,display:'flex',flexDirection:'column' as const,gap:6,marginBottom:16}}>
              {products.filter((p:any)=>!assignSearch.trim()||p.name.includes(assignSearch.trim())).length===0 ? (
                <div style={{padding:'20px',textAlign:'center' as const,fontSize:12,color:colors.text4}}>لا توجد منتجات مطابقة</div>
              ) : products.filter((p:any)=>!assignSearch.trim()||p.name.includes(assignSearch.trim())).map((p:any)=>{
                const selected = selectedProds.includes(p.id)
                return (
                  <div key={p.id} onClick={()=>setSelectedProds(prev=>selected?prev.filter(id=>id!==p.id):[...prev,p.id])}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1.5px solid ${selected?colors.primary:colors.border}`,background:selected?colors.primaryLight:colors.bg,cursor:'pointer',transition:'all .15s'}}>
                    <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${selected?colors.primary:colors.border2}`,background:selected?colors.primary:'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}}>
                      {selected&&<span style={{color:'white',fontSize:12,fontWeight:900}}>✓</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>{p.name}</div>
                      <div style={{fontSize:10,color:colors.text4}}>{p.category||'—'} · {p.unit}</div>
                      {(()=>{
                        // مين عنده هالمنتج: الموظفين الثانيين + هالموظف لو اخترته
                        const me = staff.find((x:any)=>x.id===assigningId)?.name
                        const holders = [...(selected && me ? [me] : []), ...(sharedProducts[p.id]||[])]
                        if(!holders.length) return null
                        return (
                          <div style={{display:'flex',flexWrap:'wrap' as const,gap:4,marginTop:5}}>
                            {holders.map((n:string,i:number)=>(
                              <span key={n+i} style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,
                                background:i===0&&selected?colors.primary:colors.surface,color:i===0&&selected?'white':colors.text2,border:`1px solid ${i===0&&selected?colors.primary:colors.border2}`}}>
                                <User size={10} strokeWidth={2.5}/>{n}
                              </span>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setAssigningId(null)} style={{...btnSecondary,flex:1,padding:'12px',fontSize:font.sm}}>إلغاء</button>
              <button onClick={saveAssigned} style={{...btnPrimary,flex:2,padding:'12px',fontSize:font.sm,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Save size={15} strokeWidth={2.25}/> حفظ التخصيص</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
