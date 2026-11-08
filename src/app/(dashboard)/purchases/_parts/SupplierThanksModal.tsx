'use client'
import { C } from './constants'
import type { PurchasesState } from './usePurchases'

export default function SupplierThanksModal({ m }: { m: PurchasesState }) {
  const { pendingThanks, setPendingThanks, confirmSupplierThanks } = m
  return (
    <>
      {pendingThanks && (
        <div style={{position:'fixed',inset:0,zIndex:4000,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:380,padding:24,textAlign:'center' as const}}>
            <div style={{fontSize:32,marginBottom:10}}>🚚</div>
            <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:6}}>تأكيد استلام الطلبية</div>
            <div style={{fontSize:12,color:C.text3,marginBottom:20,lineHeight:1.6}}>
              هل المورد <b>{pendingThanks.supplierName}</b> هو فعلاً من ورّد "{pendingThanks.productName}"؟<br/>
              عند التأكيد، سنرسل له رسالة شكر تلقائية عبر واتساب.
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setPendingThanks(null)} style={{flex:1,padding:11,background:C.bg,border:`1px solid ${C.border2}`,borderRadius:10,fontSize:12,fontWeight:600,color:C.text2,cursor:'pointer',fontFamily:'inherit'}}>
                لا، تجاهل
              </button>
              <button onClick={confirmSupplierThanks} style={{flex:1,padding:11,background:C.primary,border:'none',borderRadius:10,fontSize:12,fontWeight:700,color:'white',cursor:'pointer',fontFamily:'inherit'}}>
                ✅ نعم، أرسل شكر
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
