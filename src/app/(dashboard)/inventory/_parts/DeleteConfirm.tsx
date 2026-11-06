'use client'
import { C } from './constants'
import type { InventoryState } from './useInventory'

export default function DeleteConfirm({ m }: { m: InventoryState }) {
  const { confirm, setConfirm, doDelete } = m
  return (
    <>
      {/* Delete confirm */}
      {confirm&&(
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:300,fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',animation:'slideUp .2s ease'}}>
            <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:6,textAlign:'center'}}>حذف "{confirm.name}"؟</div>
            <div style={{fontSize:11,color:C.text3,textAlign:'center',marginBottom:16}}>لا يمكن التراجع عن هذا الإجراء</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setConfirm(null)} style={{flex:1,padding:'10px',background:C.bg,color:C.text2,border:`1px solid ${C.border2}`,borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
              <button onClick={doDelete} style={{flex:1,padding:'10px',background:C.danger,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>حذف</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
