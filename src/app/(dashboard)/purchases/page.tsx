'use client'
export const dynamic = 'force-dynamic'
import PageIcon from '@/components/PageIcon'
import InvoiceAgentPanel from '@/components/InvoiceAgentPanel'
import { Suspense, lazy } from 'react'
import EditHistoryDialog from '@/components/EditHistoryDialog'
import { cache } from '@/lib/cache'
import { C } from './_parts/constants'
import { usePurchases } from './_parts/usePurchases'
import SupplierThanksModal from './_parts/SupplierThanksModal'
import PurchaseStats from './_parts/PurchaseStats'
import ManualPurchaseForm from './_parts/ManualPurchaseForm'
import PayablesPanel from './_parts/PayablesPanel'
import PurchaseHistory from './_parts/PurchaseHistory'

const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))

export default function PurchasesPage() {
  const m = usePurchases()
  const { editLog, setEditLog, payables, products, orgId, curr, showManual, setShowManual, showScan, setShowScan, setForm, loadProducts, loadHistory } = m

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
      <SupplierThanksModal m={m}/>
      <style>{`
        @keyframes up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .u{animation:up .3s ease both}
        input:focus,select:focus,textarea:focus{border-color:${C.primary}!important;outline:none!important;box-shadow:0 0 0 3px ${C.primaryL}!important}
        .rh:hover{background:#f9f9f8}
        .tap{transition:all .12s;cursor:pointer}
        .tap:active{transform:scale(.97)}
        @media(max-width:768px){.pgrid{grid-template-columns:1fr!important}}
      `}</style>

      {showScan&&<Suspense fallback={null}><BarcodeScanner onScan={(code:string)=>{setShowScan(false);setForm(f=>({...f,sku:code}))}} onClose={()=>setShowScan(false)}/></Suspense>}

      {/* Header */}
      <div className="u" style={{marginBottom:16}}>
        <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:0,letterSpacing:'-0.3px',display:'flex',alignItems:'center',gap:12}}><PageIcon/>المشتريات</h1>
        <p style={{fontSize:11,color:C.text4,margin:'3px 0 0'}}>فئة <b style={{color:C.primary}}>مخزون</b> تُضيف المنتج للمخزون تلقائياً</p>
      </div>

      {/* الوكيل الذكي: يقرأ الفاتورة ويطابقها مع المخزون ويسأل عن اللي مو واضح */}
      {orgId && <InvoiceAgentPanel manualOpen={showManual} onManual={()=>{ setShowManual(true); setTimeout(()=>document.querySelector('form')?.scrollIntoView({behavior:'smooth',block:'start'}),50) }} orgId={orgId} branchId={typeof window!=='undefined'?sessionStorage.getItem('s_branch_id'):null} products={products} curr={curr}
        onSaved={()=>{ cache.invalidate('purchases:'); cache.invalidate('inventory:'); cache.invalidate('dashboard:'); cache.invalidate('products:'); loadHistory(orgId); loadProducts(orgId) }}/>}

      <PurchaseStats m={m}/>

      {/* Main grid */}
      <div className="pgrid" style={{display:'grid',gridTemplateColumns:(showManual||payables.length>0)?'1fr 1.1fr':'1fr',gap:14,alignItems:'start'}}>

        <ManualPurchaseForm m={m}/>

        <PayablesPanel m={m}/>

        <PurchaseHistory m={m}/>
      </div>
      {editLog && <EditHistoryDialog orgId={sessionStorage.getItem('s_org_id')||''} kind="purchase" id={editLog.id}
        title={`${editLog.supplier||'—'} · ${editLog.name}`} onClose={()=>setEditLog(null)} onReverted={()=>{ setEditLog(null); loadHistory(sessionStorage.getItem('s_org_id')||'') }}/>}
    </div>
  )
}
