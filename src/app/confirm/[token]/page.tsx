'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ConfirmPage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<'loading'|'confirm'|'done'|'error'>('loading')
  const [order, setOrder]   = useState<any>(null)

  useEffect(()=>{ load() },[])

  async function load() {
    const{data}=await (sb as any).from('supplier_orders').select('*').eq('token',params.token).single()
    if(!data){ setStatus('error'); return }
    if(data.status==='confirmed'){ setStatus('done'); return }
    setOrder(data); setStatus('confirm')
  }

  async function confirm() {
    setStatus('loading')
    await (sb as any).from('supplier_orders').update({status:'confirmed',confirmed_at:new Date().toISOString()}).eq('token',params.token)
    // إشعار العميل
    await fetch('/api/supplier-confirmed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:params.token})})
    setStatus('done')
  }

  if(status==='loading') return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f4'}}>
      <div style={{width:40,height:40,border:'3px solid #bbf7d0',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if(status==='error') return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f4'}}>
      <div style={{background:'white',borderRadius:16,padding:32,textAlign:'center',maxWidth:320,width:'100%',margin:16}}>
        <div style={{fontSize:48,marginBottom:12}}>❌</div>
        <div style={{fontSize:16,fontWeight:700,color:'#1c1c1a'}}>رابط غير صالح</div>
        <div style={{fontSize:12,color:'#888780',marginTop:6}}>هذا الرابط غير موجود أو منتهي</div>
      </div>
    </div>
  )

  if(status==='done') return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0fdf4'}}>
      <div style={{background:'white',borderRadius:16,padding:32,textAlign:'center',maxWidth:320,width:'100%',margin:16,border:'1px solid #bbf7d0'}}>
        <div style={{fontSize:48,marginBottom:12}}>✅</div>
        <div style={{fontSize:18,fontWeight:700,color:'#16a34a'}}>تم التأكيد</div>
        <div style={{fontSize:12,color:'#5f5e5a',marginTop:8,lineHeight:1.6}}>شكراً — تم إبلاغ العميل بتأكيدك</div>
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',minHeight:'100vh',background:'#f5f5f4',padding:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:400,overflow:'hidden',border:'1px solid #ebebea'}}>
        {/* Header */}
        <div style={{background:'#16a34a',padding:'20px 20px 16px',textAlign:'center'}}>
          <div style={{fontSize:14,fontWeight:700,color:'white',opacity:.8,marginBottom:4}}>🟢 Storely</div>
          <div style={{fontSize:18,fontWeight:700,color:'white'}}>طلب توريد</div>
          <div style={{fontSize:12,color:'white',opacity:.7,marginTop:4}}>{order?.supplier_name}</div>
        </div>

        {/* Order details */}
        <div style={{padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#888780',marginBottom:10,textTransform:'uppercase',letterSpacing:'.05em'}}>تفاصيل الطلب</div>
          <div style={{background:'#f9f9f8',borderRadius:10,padding:14,marginBottom:16}}>
            <div style={{fontSize:12,color:'#5f5e5a',marginBottom:8}}>من: <b style={{color:'#1c1c1a'}}>{order?.org_name||'العميل'}</b></div>
            {(order?.items||[]).map((item:any,i:number)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<order.items.length-1?'1px solid #ebebea':'none'}}>
                <span style={{fontSize:13,fontWeight:600,color:'#1c1c1a'}}>{item.name}</span>
                <span style={{fontSize:13,fontWeight:700,color:'#16a34a'}}>{item.qty} {item.unit}</span>
              </div>
            ))}
          </div>

          <button onClick={confirm}
            style={{width:'100%',padding:'14px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            ✅ تأكيد الطلب
          </button>
          <div style={{fontSize:11,color:'#888780',textAlign:'center',marginTop:10}}>بالضغط على التأكيد سيتم إبلاغ العميل فوراً</div>
        </div>
      </div>
    </div>
  )
}
