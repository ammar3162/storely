'use client'
import { Wrench } from 'lucide-react'
import { C } from './nav'
import type { DashboardShell } from './useDashboardShell'

export default function MaintenanceScreen({ m }: { m: DashboardShell }) {
  const { maintenanceMsg } = m
  return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:'32px 28px',maxWidth:420,width:'100%',textAlign:'center'}}>
        <div style={{width:48,height:48,borderRadius:12,background:C.primaryL,color:C.primary,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><Wrench size={22}/></div>
        <div style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:8}}>النظام تحت صيانة مؤقتة</div>
        <div style={{fontSize:14,color:C.text3,lineHeight:1.8}}>{maintenanceMsg}</div>
      </div>
    </div>
  )
}
