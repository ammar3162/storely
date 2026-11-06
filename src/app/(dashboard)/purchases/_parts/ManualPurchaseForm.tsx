'use client'
import { C } from './constants'
import type { PurchasesState } from './usePurchases'
import PurchaseItemFields from './PurchaseItemFields'
import PurchaseInvoiceFields from './PurchaseInvoiceFields'

export default function ManualPurchaseForm({ m }: { m: PurchasesState }) {
  const { loading, uploading, showManual, setShowManual, form, handleSubmit } = m
  return (
    <>
        {/* Form */}
        {showManual && (
        <div className="u" style={{background:'white',borderRadius:12,padding:18,border:`1px solid ${C.border}`,animationDelay:'.06s'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>تسجيل يدوي</div>
            <button type="button" onClick={()=>setShowManual(false)} style={{border:'none',background:'none',color:C.text3,fontSize:12,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}>إخفاء</button>
          </div>
          <form onSubmit={handleSubmit} noValidate>

            <PurchaseItemFields m={m}/>

            <PurchaseInvoiceFields m={m}/>

            <button type="submit" disabled={loading||uploading} style={{
              width:'100%',padding:'12px',background:loading||uploading?C.text4:C.primary,
              color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:700,
              cursor:loading||uploading?'not-allowed':'pointer',fontFamily:'inherit',
              opacity:loading||uploading?.7:1,transition:'all .15s',
            }}>
              {loading?'جاري الحفظ...':'تسجيل الشراء'}
            </button>
          </form>
        </div>
        )}
    </>
  )
}
