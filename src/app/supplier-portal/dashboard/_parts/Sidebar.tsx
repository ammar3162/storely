'use client'
import { LogOut } from 'lucide-react'
import { TAB_PATHS } from './tabs'
import type { SupplierDashboard } from './useSupplierDashboard'
import type { DashboardView } from './deriveView'

export default function Sidebar({ m, v }: { m: SupplierDashboard; v: DashboardView }) {
  const { profile, router, activeTab, logout } = m
  const { NAV_ITEMS } = v
  return (
    <>
      <aside className="sd-side">
        <div className="sd-brand">
          <img src={profile?.logo_url || '/storely-logo.png'} alt=""/>
          <div><b>{profile?.business_name}</b><span>{profile?.location || 'بوابة الموردين'}</span></div>
        </div>
        <nav className="sd-nav" aria-label="أقسام بوابة المورد">
          {NAV_ITEMS.map(({id,label,Icon,badge})=>(
            <button key={id} onClick={()=>router.push(TAB_PATHS[id])} className={activeTab===id?'on':''} aria-current={activeTab===id?'page':undefined}>
              <Icon size={18} strokeWidth={2}/><span>{label}</span>{badge && <em>{badge}</em>}
            </button>
          ))}
        </nav>
        <button className="sd-out" onClick={logout}><LogOut size={16}/> تسجيل الخروج</button>
      </aside>
    </>
  )
}
