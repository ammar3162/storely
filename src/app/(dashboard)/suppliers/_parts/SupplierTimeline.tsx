'use client'
import { Send, CircleCheck, AlertTriangle, Receipt, XCircle, X } from 'lucide-react'
import { ListSkeleton } from '@/components/PageSkeleton'
import type { SupplierCardState } from './useSupplierCard'

export default function SupplierTimeline({ m }: { m: SupplierCardState }) {
  const { s, showTimeline, setShowTimeline, timelineEvents, timelineLoading } = m
  return (
    <>
      {showTimeline && (
        <div style={{position:'fixed',inset:0,zIndex:3500,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={()=>setShowTimeline(false)}>
          <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:480,maxHeight:'75vh',overflowY:'auto' as const,padding:20}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:800,color:'#203640'}}>سجل التواصل — {s.name}</div>
              <button onClick={()=>setShowTimeline(false)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#687985'}}><X size={18}/></button>
            </div>
            {timelineLoading ? (
              <ListSkeleton/>
            ) : timelineEvents.length === 0 ? (
              <div style={{textAlign:'center' as const,padding:40,color:'#687985',fontSize:12}}>لا يوجد سجل تواصل بعد مع هذا المورد</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
                {timelineEvents.map((e:any,i:number)=>{
                  const icons: Record<string,React.ReactNode> = { order_sent:<Send size={15}/>, order_confirmed:<CircleCheck size={15}/>, order_escalated:<AlertTriangle size={15}/>, purchase:<Receipt size={15}/>, order_failed:<XCircle size={15}/> }
                  const colors: Record<string,string> = { order_sent:'#203640', order_confirmed:'#203640', order_escalated:'#d97706', purchase:'#2563eb', order_failed:'#dc2626' }
                  return (
                    <div key={i} style={{display:'flex',gap:10,paddingBottom:10,borderBottom:i<timelineEvents.length-1?'1px solid #F3F5F6':'none'}}>
                      <div style={{flexShrink:0,color:colors[e.type]||'#66737C',marginTop:2}}>{icons[e.type]||'•'}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:colors[e.type]||'#203640'}}>{e.title}</div>
                        {e.detail && <div style={{fontSize:11,color:'#66737C',marginTop:2}}>{e.detail}</div>}
                        <div style={{fontSize:10,color:'#687985',marginTop:3}}>{new Date(e.at).toLocaleDateString('ar-SA', {numberingSystem:'latn',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
