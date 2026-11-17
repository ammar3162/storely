'use client'
import { Suspense } from 'react'
import { PackageMinus, Boxes, ShoppingCart, Lock, BarChart3 } from 'lucide-react'
import { T } from './_parts/strings'
import { useStaffDispense, type PageVals } from './_parts/useStaffDispense'
import AccountGate from './_parts/AccountGate'
import DispenseHeader from './_parts/DispenseHeader'
import TabsBar from './_parts/TabsBar'
import DispenseTab from './_parts/DispenseTab'
import InventoryTab from './_parts/InventoryTab'
import DispenseModal from './_parts/DispenseModal'
import EditQtyModal from './_parts/EditQtyModal'
import AddProductModal from './_parts/AddProductModal'

function StaffPageInner() {
  const m = useStaffDispense()
  const { lang, session, tab, translating, toast, router } = m

  if(!session) return null

  const hasAnyPermission = !!(session.permissions?.dispense || session.permissions?.inventory || session.permissions?.purchases || session.permissions?.reports)
  if (!hasAnyPermission) {
    return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',background:'var(--storely-fill)',fontFamily:'var(--storely-font)',direction:'rtl',padding:20,textAlign:'center' as const}}>
        <div style={{display:'flex',justifyContent:'center',marginBottom:16,color:'#1f2937'}}><Lock size={44} strokeWidth={1.5}/></div>
        <div style={{fontSize:17,fontWeight:600,color:'var(--storely-text)',marginBottom:8}}>{T('noPerm',lang)}</div>
        <div style={{fontSize:15,color:'#1f2937',marginBottom:20}}>{T('noPermSub',lang)}</div>
        <button onClick={()=>{localStorage.removeItem('staff_session');localStorage.removeItem('staff_token');router.push('/staff')}}
          style={{padding:'10px 24px',borderRadius:999,border:'1px solid #e5e5e3',background:'white',fontSize:15,fontWeight:600,cursor:'pointer',color:'#1f2937'}}>
          خروج
        </button>
      </div>
    )
  }

  const isRTL = lang==='ar'||lang==='ur'
  const tabs = [
    {key:'dispense',label:T('tabDispense',lang),icon:<PackageMinus size={16} strokeWidth={1.75}/>,show:session.permissions?.dispense},
    {key:'inventory',label:T('tabInventory',lang),icon:<Boxes size={16} strokeWidth={1.75}/>,show:session.permissions?.inventory},
    {key:'purchases',label:T('tabPurchases',lang),icon:<ShoppingCart size={16} strokeWidth={1.75}/>,show:session.permissions?.purchases},
  ].filter(t=>t.show)
  const v: PageVals = { session, isRTL, tabs }

  return (
    <div style={{minHeight:'100vh',background:'var(--storely-fill)',fontFamily:'var(--storely-font)',direction:isRTL?'rtl':'ltr'}}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .card{background:white;border-radius:20px;border:1px solid var(--storely-border)}
        .tab-btn{border:none;font-size:17px;font-weight:500;cursor:pointer;font-family:inherit;white-space:nowrap;transition:background-color .15s,color .15s}
        .lang-btn{padding:6px 12px;border-radius:12px;border:none;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0}
        .list-row{background:white;border:none;width:100%;min-height:60px;padding:10px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;font-family:inherit;text-align:start;transition:background-color .15s}
        .list-row+.list-row{border-top:1px solid var(--storely-border)}
        .list-row:active{background:var(--storely-fill)}
        input:focus,select:focus{border-color:#203640!important;outline:none!important;box-shadow:0 0 0 3px rgba(15,118,110,.12)!important}
        .chip{height:32px;padding:0 12px;border-radius:12px;border:1px solid var(--storely-border);background:white;font-size:15px;color:var(--storely-muted);display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0}
        .chip.on{background:var(--storely-text);color:white;border-color:var(--storely-text)}
      `}</style>

      <AccountGate m={m} v={v}/>

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:toast.type==='success'?'var(--storely-text)':'#dc2626',color:'white',padding:'12px 20px',borderRadius:12,fontSize:17,fontWeight:500,boxShadow:'0 8px 24px rgba(0,0,0,.12)',animation:'slideUp .3s ease',whiteSpace:'nowrap'}}>
          {toast.msg}
        </div>
      )}

      <DispenseHeader m={m} v={v}/>

      <TabsBar m={m} v={v}/>

      {/* Translating banner */}
      {translating && (
        <div style={{background:'var(--storely-fill)',color:'var(--storely-muted)',padding:'10px 20px',fontSize:15,textAlign:'center'}}>
          {T('translating',lang)}
        </div>
      )}

      <DispenseTab m={m} v={v}/>

      <InventoryTab m={m}/>

      {/* ═══ PURCHASES TAB ═══ */}
      {tab==='purchases' && (
        <div style={{padding:'60px 20px',textAlign:'center',animation:'fadeIn .3s'}}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:16,color:'var(--storely-muted)'}}><ShoppingCart size={44} strokeWidth={1.5}/></div>
          <div style={{fontSize:20,fontWeight:600,color:'var(--storely-text)',marginBottom:8}}>{T('purchasesTitle',lang)}</div>
          <div style={{fontSize:17,color:'var(--storely-muted)',marginBottom:28,maxWidth:300,margin:'0 auto 28px'}}>{T('purchasesSub',lang)}</div>
          <button onClick={()=>router.push('/staff/purchases')}
            style={{height:48,padding:'0 32px',background:'#203640',color:'white',border:'none',borderRadius:999,fontSize:17,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:8}}>
            {T('newPurchase',lang)}
          </button>
        </div>
      )}

      {/* ═══ REPORTS TAB ═══ */}
      {tab==='reports' && (
        <div style={{padding:'60px 20px',textAlign:'center',animation:'fadeIn .3s'}}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:16,color:'var(--storely-muted)'}}><BarChart3 size={44} strokeWidth={1.5}/></div>
          <div style={{fontSize:20,fontWeight:600,color:'var(--storely-text)',marginBottom:8}}>{T('reports',lang)}</div>
          <div style={{fontSize:17,color:'var(--storely-muted)'}}>{T('soon',lang)}</div>
        </div>
      )}

      {/* ═══ MODALS ═══ */}

      <DispenseModal m={m}/>
      <EditQtyModal m={m}/>
      <AddProductModal m={m}/>
    </div>
  )
}

export default function StaffPage() {
  return <Suspense fallback={null}><StaffPageInner/></Suspense>
}
