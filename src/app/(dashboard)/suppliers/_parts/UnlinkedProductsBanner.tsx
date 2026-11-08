'use client'
import { AlertTriangle } from 'lucide-react'

export default function UnlinkedProductsBanner({ unlinkedProducts }: { unlinkedProducts: any[] }) {
  return (
    <>
      {/* بنر المنتجات غير المرتبطة */}
      {unlinkedProducts.length>0 && (
        <div style={{background:'#fffbeb',border:'1.5px solid #fcd34d',borderRadius:12,padding:'14px 18px',marginBottom:16,display:'flex',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
          <AlertTriangle size={20} color="#B45309" style={{flexShrink:0,marginTop:2}}/>
          <div style={{flex:'1 1 220px',minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:'#92400e'}}>{unlinkedProducts.length} منتج بدون مورد مرتبط</div>
            <div style={{fontSize:11,color:'#b45309',marginTop:2}}>اربط هذه المنتجات بموردين لتفعيل الطلبات التلقائية</div>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4,flex:'1 1 100%',paddingInlineStart:32}}>
            {unlinkedProducts.slice(0,3).map((p:any)=>(
              <span key={p.id} style={{fontSize:10,background:'#fef3c7',color:'#92400e',padding:'2px 6px',borderRadius:4,border:'1px solid #fcd34d'}}>{p.name}</span>
            ))}
            {unlinkedProducts.length>3 && <span style={{fontSize:10,color:'#92400e'}}>+{unlinkedProducts.length-3} أخرى</span>}
          </div>
        </div>
      )}
    </>
  )
}
