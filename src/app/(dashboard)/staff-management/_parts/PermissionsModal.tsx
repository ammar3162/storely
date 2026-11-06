'use client'
import { Package, BarChart3, ShieldCheck, Wallet, Send, ShoppingCart, Save } from 'lucide-react'
import type { StaffPage } from './useStaffManagement'

export default function PermissionsModal({ m }: { m: StaffPage }) {
  const { staff, editingPerms, setEditingPerms, editingRole, editPerms, setEditPerms, hasCashier, savePermissions } = m
  return (
    <>
      {editingPerms && (
        <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setEditingPerms(null)}>
          <div style={{background:'white',borderRadius:20,padding:28,width:'100%',maxWidth:400,fontFamily:'inherit'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:'#1c1c1a',marginBottom:4,display:'flex',alignItems:'center',gap:6}}><ShieldCheck size={17} strokeWidth={2.25}/> صلاحيات الموظف</div>
            <div style={{fontSize:12,color:'#888780',marginBottom:20}}>{staff.find(s=>s.id===editingPerms)?.name}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
              {[
                {key:'dispense',   label:'الصرف',      Icon:Send, locked:false},
                {key:'inventory',  label:'المخزون',    Icon:Package, locked:false},
                {key:'purchases',  label:'المشتريات',  Icon:ShoppingCart, locked:false},
                {key:'reports',    label:'التقارير',   Icon:BarChart3, locked:false},
                {key:'cashier',    label:'إقفال الكاشير', Icon:Wallet, locked:!hasCashier||editingRole==='cashier'},
              ].map(p=>(
                <label key={p.key} style={{display:'flex',alignItems:'center',gap:8,padding:'12px',background:(editPerms as any)[p.key]?'#f0fdfa':'#f9fafb',borderRadius:10,border:`1.5px solid ${(editPerms as any)[p.key]?'#029FA2':'#e5e7eb'}`,cursor:p.locked?'not-allowed':'pointer',transition:'all .15s'}}>
                  <input type="checkbox" checked={(editPerms as any)[p.key]} disabled={p.locked}
                    onChange={e=>!p.locked&&setEditPerms(prev=>({...prev,[p.key]:e.target.checked}))}
                    style={{accentColor:'#029FA2',width:16,height:16}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:(editPerms as any)[p.key]?'#029FA2':'#374151',display:'flex',alignItems:'center',gap:5}}><p.Icon size={14} strokeWidth={2.25}/> {p.label}</div>
                    {p.locked&&<div style={{fontSize:10,color:'#9ca3af'}}>{p.key==='cashier'?(!hasCashier?'يحتاج الشاملة أو إضافة الكاشير':'دوره كاشير'):'افتراضي'}</div>}
                  </div>
                </label>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>savePermissions(editingPerms)} style={{flex:2,padding:'12px',background:'#029FA2',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Save size={15} strokeWidth={2.25}/> حفظ الصلاحيات</button>
              <button onClick={()=>setEditingPerms(null)} style={{flex:1,padding:'12px',background:'#f3f4f6',color:'#374151',border:'none',borderRadius:10,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
