'use client'
import { colors, card } from '@/lib/ds'
import type { SuppliersPageState } from './useSuppliersPage'

export default function SupplierStats({ m, unlinkedProducts }: { m: SuppliersPageState; unlinkedProducts: any[] }) {
  const { suppliers, failedRecentMap } = m
  return (
    <>
      {/* شريط إحصائية سريعة */}
      <div style={{display:'grid',gridTemplateColumns:`repeat(${Object.keys(failedRecentMap).length>0?3:2},1fr)`,gap:8,marginBottom:18}}>
        <div style={{...card,padding:'12px 14px',textAlign:'center' as const}}>
          <div style={{fontSize:20,fontWeight:900,color:colors.text}}>{suppliers.length}</div>
          <div style={{fontSize:10,color:colors.text4,fontWeight:600,marginTop:2}}>إجمالي الموردين</div>
        </div>
        <div style={{...card,padding:'12px 14px',textAlign:'center' as const,background:unlinkedProducts.length>0?'#fffbeb':undefined,border:unlinkedProducts.length>0?'1px solid #fde68a':undefined}}>
          <div style={{fontSize:20,fontWeight:900,color:unlinkedProducts.length>0?'#92400e':colors.text}}>{unlinkedProducts.length}</div>
          <div style={{fontSize:10,color:unlinkedProducts.length>0?'#92400e':colors.text4,fontWeight:600,marginTop:2}}>منتجات بدون مورد</div>
        </div>
        {Object.keys(failedRecentMap).length>0 && (
          <div style={{...card,padding:'12px 14px',textAlign:'center' as const,background:'#fef2f2',border:'1px solid #fecaca'}}>
            <div style={{fontSize:20,fontWeight:900,color:'#dc2626'}}>{Object.values(failedRecentMap).reduce((a,b)=>a+b,0)}</div>
            <div style={{fontSize:10,color:'#dc2626',fontWeight:600,marginTop:2}}>رسائل فشل إرسالها (٢٤ ساعة)</div>
          </div>
        )}
      </div>
    </>
  )
}
