'use client'
import { Suspense } from 'react'
import { Send, Boxes, ShoppingCart, Lock, BarChart3 } from 'lucide-react'
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
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',background:'#f5f5f4',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',padding:20,textAlign:'center' as const}}>
        <div style={{display:'flex',justifyContent:'center',marginBottom:16,color:'#5f5e5a'}}><Lock size={44} strokeWidth={1.5}/></div>
        <div style={{fontSize:16,fontWeight:800,color:'#1c1c1a',marginBottom:8}}>{T('noPerm',lang)}</div>
        <div style={{fontSize:13,color:'#5f5e5a',marginBottom:20}}>{T('noPermSub',lang)}</div>
        <button onClick={()=>{localStorage.removeItem('staff_session');localStorage.removeItem('staff_token');router.push('/staff')}}
          style={{padding:'10px 24px',borderRadius:10,border:'1px solid #e5e5e3',background:'white',fontSize:13,fontWeight:700,cursor:'pointer',color:'#5f5e5a'}}>
          خروج
        </button>
      </div>
    )
  }

  const isRTL = lang==='ar'||lang==='ur'
  const tabs = [
    {key:'dispense',label:T('tabDispense',lang),icon:<Send size={15} strokeWidth={2.25}/>,show:session.permissions?.dispense},
    {key:'inventory',label:T('tabInventory',lang),icon:<Boxes size={15} strokeWidth={2.25}/>,show:session.permissions?.inventory},
    {key:'purchases',label:T('tabPurchases',lang),icon:<ShoppingCart size={15} strokeWidth={2.25}/>,show:session.permissions?.purchases},
  ].filter(t=>t.show)
  const v: PageVals = { session, isRTL, tabs }

  return (
    <div style={{minHeight:'100vh',background:'#f4f6f8',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:isRTL?'rtl':'ltr'}}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .card{background:white;border-radius:16px;border:1px solid #e8ecf1;box-shadow:0 1px 2px rgba(16,24,40,.04);transition:transform .15s,box-shadow .15s}
        .card:active{transform:scale(.98)}
        .tab-btn{padding:10px 18px;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;transition:all .2s}
        .lang-btn{padding:6px 12px;border-radius:20px;border:none;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;transition:all .2s}
        .prod-btn{background:white;border:1px solid #e8ecf1;border-radius:14px;padding:15px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-family:inherit;text-align:start;width:100%;box-shadow:0 1px 2px rgba(16,24,40,.04);transition:all .15s}
        .prod-btn:active{transform:scale(.97);box-shadow:0 1px 4px rgba(0,0,0,.1)}
        input:focus,select:focus{border-color:#0f766e!important;outline:none!important;box-shadow:0 0 0 3px rgba(15,118,110,.12)!important}
        @keyframes fadeUpStagger{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .cat-card{animation:fadeUpStagger .4s cubic-bezier(0.34,1.56,0.64,1) both;transition:transform .15s,box-shadow .15s}
        .cat-card:active{transform:scale(.94)}
        @media(hover:hover){.cat-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(15,23,42,.08)}}
        .mu-btn{animation:fadeUpStagger .35s ease both;transition:transform .15s}
        .mu-btn:active{transform:scale(.95)}
      `}</style>

      <AccountGate m={m} v={v}/>

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:toast.type==='success'?'#029FA2':'#ef4444',color:'white',padding:'12px 24px',borderRadius:40,fontSize:14,fontWeight:700,boxShadow:'0 8px 24px rgba(0,0,0,.2)',animation:'slideUp .3s ease',whiteSpace:'nowrap'}}>
          {toast.msg}
        </div>
      )}

      <DispenseHeader m={m} v={v}/>

      <TabsBar m={m} v={v}/>

      {/* Translating banner */}
      {translating && (
        <div style={{background:'#eff6ff',color:'#2563eb',padding:'10px 20px',fontSize:13,fontWeight:700,textAlign:'center'}}>
          {T('translating',lang)}
        </div>
      )}

      <DispenseTab m={m} v={v}/>

      <InventoryTab m={m}/>

      {/* ═══ PURCHASES TAB ═══ */}
      {tab==='purchases' && (
        <div style={{padding:'60px 20px',textAlign:'center',animation:'fadeIn .3s'}}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:16,color:'#029FA2'}}><ShoppingCart size={60} strokeWidth={1.5}/></div>
          <div style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:8}}>{T('purchasesTitle',lang)}</div>
          <div style={{fontSize:14,color:'#64748b',marginBottom:28,maxWidth:300,margin:'0 auto 28px'}}>{T('purchasesSub',lang)}</div>
          <button onClick={()=>router.push('/staff/purchases')}
            style={{padding:'16px 36px',background:'linear-gradient(135deg,#029FA2,#0f766e)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 8px 24px rgba(22,163,74,.35)',display:'inline-flex',alignItems:'center',gap:8}}>
            {T('newPurchase',lang)}
          </button>
        </div>
      )}

      {/* ═══ REPORTS TAB ═══ */}
      {tab==='reports' && (
        <div style={{padding:'60px 20px',textAlign:'center',animation:'fadeIn .3s'}}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:16,color:'#029FA2'}}><BarChart3 size={60} strokeWidth={1.5}/></div>
          <div style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:8}}>{T('reports',lang)}</div>
          <div style={{fontSize:14,color:'#64748b'}}>{T('soon',lang)}</div>
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
