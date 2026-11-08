'use client'
import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']

export const NOTIFY_OPTS = [
  { id:'instant', icon:'', label:'فوري',    desc:'عند كل صرف مباشرة' },
  { id:'daily',   icon:'', label:'يومي',    desc:'مرة يومياً' },
  { id:'weekly',  icon:'', label:'أسبوعي',  desc:'مرة أسبوعياً' },
]

export function UpgradeBlock() {
  const router = useRouter()
  return (
    <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{textAlign:'center',maxWidth:400}}>
        <div style={{display:'flex',justifyContent:'center',marginBottom:16,color:'var(--storely-muted)'}}><Lock size={44} strokeWidth={1.5}/></div>
        <h2 style={{fontSize:22,fontWeight:900,color:'var(--storely-text)',marginBottom:8}}>هذه الميزة غير متاحة في باقتك</h2>
        <p style={{fontSize:14,color:'var(--storely-muted)',lineHeight:1.8,marginBottom:24}}>
          إدارة الموردين متاحة في الباقة الشاملة وما فوق.
        </p>
        <button className="hide-in-app" onClick={()=>router.push('/settings')}
          style={{padding:'14px 32px',background:'#203640',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
          ترقية الباقة ←
        </button>
      </div>
    </div>
  )
}

export function NotifyBadge({ mode, time, day }: { mode:string; time:string; day:number }) {
  const opt = NOTIFY_OPTS.find(o=>o.id===mode)
  if (mode==='instant') return <span style={{fontSize:11,background:'#fef3c7',color:'#92400e',border:'1px solid #fcd34d',borderRadius:20,padding:'2px 8px',fontWeight:700}}>فوري</span>
  if (mode==='daily') return <span style={{fontSize:11,background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',borderRadius:20,padding:'2px 8px',fontWeight:700}}>يومي {time}</span>
  return <span style={{fontSize:11,background:'#f5f3ff',color:'#6d28d9',border:'1px solid #ddd6fe',borderRadius:20,padding:'2px 8px',fontWeight:700}}>{DAYS[day]} {time}</span>
}
