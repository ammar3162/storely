'use client'
import { font } from '@/lib/ds'
import type { SupplierCardState } from './useSupplierCard'

export default function SupplierDeleteConfirm({ m }: { m: SupplierCardState }) {
  const { s, confirmDelete, setConfirmDelete, deleteSupplier } = m
  return (
    <>
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:320,fontFamily:font.family,direction:'rtl'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#203640',marginBottom:6,textAlign:'center'}}>حذف المورد "{s.name}"؟</div>
            <div style={{fontSize:12,color:'#66737C',textAlign:'center',marginBottom:16,lineHeight:1.6}}>سيتم فك ارتباطه بكل المنتجات المرتبطة به. لا يمكن التراجع عن هذا الإجراء.</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setConfirmDelete(false)} style={{flex:1,padding:'10px',background:'#F3F5F6',color:'#203640',border:'1px solid #E2E7EA',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
              <button onClick={deleteSupplier} style={{flex:1,padding:'10px',background:'#ef4444',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>حذف</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
