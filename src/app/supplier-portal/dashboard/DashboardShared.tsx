'use client'
import { ClipboardList, Eye, EyeOff } from 'lucide-react'
import { TAB_PATHS } from './_parts/tabs'
import { SD_CSS } from './_parts/styles'
import { useSupplierDashboard } from './_parts/useSupplierDashboard'
import { deriveView } from './_parts/deriveView'
import Sidebar from './_parts/Sidebar'
import ProductsTab from './_parts/ProductsTab'
import OrdersTab from './_parts/OrdersTab'
import ChatsTab from './_parts/ChatsTab'
import RepsTab from './_parts/RepsTab'
import ReportsTab from './_parts/ReportsTab'
import ActivityTab from './_parts/ActivityTab'
import AccountTab from './_parts/AccountTab'

export default function SupplierDashboardShared() {
  const m = useSupplierDashboard()
  const { loading, router, activeTab, toggleVisibility } = m

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f4f7f7'}}>
      <div style={{width:34,height:34,border:'3px solid #ccebe7',borderTopColor:'#203640',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const v = deriveView(m)
  const { pendingOrdersCount, acceptedCount, PAGE_HINT, activeNav, visible } = v

  return (
    <div className="sd" dir="rtl">
      <style>{SD_CSS}</style>
      <Sidebar m={m} v={v}/>

      <main className="sd-main">
        <header className="sd-top">
          <div><h1>{activeNav.label}</h1><p>{PAGE_HINT[activeTab]}</p></div>
          <button onClick={toggleVisibility} className={'sd-vis '+(visible?'on':'off')} title="هل يظهر حسابك للعملاء في قائمة الموردين؟">
            {visible?<Eye size={16}/>:<EyeOff size={16}/>}{visible?'حسابك ظاهر للعملاء':'حسابك مخفي عن العملاء'}
          </button>
        </header>

        {(pendingOrdersCount>0 || acceptedCount>0) && activeTab!=='orders' && (
          <button className="sd-todo" onClick={()=>router.push(TAB_PATHS.orders)}>
            <ClipboardList size={18}/>
            <span>{pendingOrdersCount>0 && `${pendingOrdersCount} طلب ينتظر سعرك`}{pendingOrdersCount>0 && acceptedCount>0 && '، '}{acceptedCount>0 && `${acceptedCount} طلب وافق عليه العميل وينتظر تأكيد التوريد`}</span>
            <b>افتح الطلبات</b>
          </button>
        )}

        <ProductsTab m={m} v={v}/>

        <OrdersTab m={m} v={v}/>

        <ChatsTab m={m}/>

        <RepsTab m={m}/>

        <ReportsTab m={m} v={v}/>

        <ActivityTab m={m} v={v}/>

        <AccountTab m={m}/>
      </main>
    </div>
  )
}
