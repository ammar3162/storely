'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'

const C = {
  primary:'#16a34a', primaryD:'#15803d', primaryL:'#f0fdf4', primaryB:'#bbf7d0',
  danger:'#ef4444', dangerL:'#fef2f2', dangerB:'#fecaca',
  warning:'#f59e0b', warningL:'#fffbeb', warningB:'#fde68a',
  info:'#3b82f6', infoL:'#eff6ff', infoB:'#bfdbfe',
  text:'#111827', text2:'#374151', text3:'#6b7280', text4:'#9ca3af',
  bg:'#f9fafb', surface:'#ffffff', border:'#f3f4f6', border2:'#e5e7eb',
}

export default function PurchaseSuggestionPage() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [visible, setVisible] = useState(false)

  const plan = typeof window!=='undefined' ? (sessionStorage.getItem('s_plan')||'basic') : 'basic'
  const allowed = plan==='pro' || plan==='advanced'

  useEffect(()=>{ if(allowed) load() },[])

  async function load() {
    setLoading(true)
    const org_id = sessionStorage.getItem('s_org_id')
    if (!org_id) return
    const res = await fetch('/api/purchase-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id, send_to_suppliers: false })
    })
    const d = await res.json()
    setData(d)
    setLoading(false)
    setTimeout(()=>setVisible(true), 50)
  }

  async function sendToSuppliers() {
    setSending(true)
    const org_id = sessionStorage.getItem('s_org_id')
    const res = await fetch('/api/purchase-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id, send_to_suppliers: true })
    })
    const d = await res.json()
    setData(d)
    setSending(false)
    setSent(true)
  }

  if (!allowed) return (
    <div style={{fontFamily:'inherit',direction:'rtl',maxWidth:600,margin:'60px auto',textAlign:'center' as const,padding:20}}>
      <div style={{fontSize:48,marginBottom:16}}>🔒</div>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:8}}>هذه الميزة تتطلب باقة أعلى</div>
      <div style={{fontSize:14,color:C.text3,marginBottom:24,lineHeight:1.6}}>اقتراح الشراء الذكي متاح من الباقة المتوسطة فأعلى. ترقّى الآن للاستفادة من حساب الكمية المثلى وإرسالها للمورد تلقائياً.</div>
      <a href="/settings" style={{display:'inline-block',padding:'12px 28px',background:C.primary,color:'white',borderRadius:10,fontSize:14,fontWeight:700,textDecoration:'none'}}>ترقية الباقة</a>
    </div>
  )

  if (loading) return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',maxWidth:900,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.4s ease infinite}`}</style>
      <div className="sk" style={{height:28,width:200,background:C.border2,borderRadius:8,marginBottom:20}}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
        {[1,2,3].map(i=><div key={i} className="sk" style={{height:80,borderRadius:14,background:C.border}}/>)}
      </div>
      {[1,2,3,4].map(i=><div key={i} className="sk" style={{height:70,borderRadius:12,background:C.border,marginBottom:8}}/>)}
    </div>
  )

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',maxWidth:900,margin:'0 auto',opacity:visible?1:0,transition:'opacity .3s ease'}}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.fu{animation:fadeUp .35s ease both}`}</style>

      {/* Header */}
      <div className="fu" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>اقتراح الشراء الذكي</h1>
          <p style={{fontSize:11,color:C.text3,marginTop:3}}>بناءً على معدل الصرف الفعلي خلال 90 يوم</p>
        </div>
        <button onClick={load} style={{padding:'8px 14px',background:'white',border:`1.5px solid ${C.border2}`,borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:C.text2}}>
          ↺ تحديث
        </button>
      </div>

      {/* Stats */}
      {data && (
        <div className="fu" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16,animationDelay:'.06s'}}>
          {[
            {label:'أصناف تحتاج شراء', value:data.summary?.totalItems||0, color:C.danger, bg:C.dangerL},
            {label:'موردون للإخطار',    value:data.summary?.suppliersToNotify||0, color:C.info, bg:C.infoL},
            {label:'أصناف بلا مورد',   value:data.unassigned?.length||0, color:C.warning, bg:C.warningL},
          ].map((s,i)=>(
            <div key={i} style={{background:s.bg,borderRadius:14,padding:'14px 16px',border:`1px solid ${s.color}20`}}>
              <div style={{fontSize:28,fontWeight:900,color:s.color,letterSpacing:'-0.5px'}}>{s.value}</div>
              <div style={{fontSize:11,color:C.text2,fontWeight:600,marginTop:4}}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* No suggestions */}
      {data?.message && (
        <div className="fu" style={{background:C.primaryL,border:`1px solid ${C.primaryB}`,borderRadius:14,padding:'24px',textAlign:'center',animationDelay:'.08s'}}>
          <div style={{fontSize:36,marginBottom:10}}>✅</div>
          <div style={{fontSize:15,fontWeight:700,color:C.primary}}>{data.message}</div>
        </div>
      )}

      {/* Supplier Groups */}
      {data?.supplierGroups?.map((g:any, gi:number)=>(
        <div key={gi} className="fu" style={{background:'white',borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden',marginBottom:12,animationDelay:`${.1+gi*.05}s`}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,background:C.bg,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:C.primaryL,border:`1px solid ${C.primaryB}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏭</div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{g.supplier}</div>
                {g.phone&&<div style={{fontSize:11,color:C.text3}}>{g.phone}</div>}
              </div>
            </div>
            <span style={{background:C.primaryL,color:C.primary,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:99,border:`1px solid ${C.primaryB}`}}>{g.items.length} صنف</span>
          </div>
          <div>
            {g.items.map((item:any, ii:number)=>(
              <div key={ii} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:ii<g.items.length-1?`1px solid ${C.border}`:'none'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{item.name}</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:2}}>متوفر: {item.qty} {item.unit} | صرف شهري: {item.monthly} {item.unit}</div>
                </div>
                <div style={{textAlign:'left',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:900,color:C.primary}}>+{item.suggested}</div>
                  <div style={{fontSize:10,color:C.text4}}>{item.unit}</div>
                </div>
                <div style={{width:8,height:8,borderRadius:'50%',background:item.qty===0?C.danger:item.qty<=item.reorder_point?C.warning:C.primary,flexShrink:0}}/>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Unassigned */}
      {data?.unassigned?.length>0&&(
        <div className="fu" style={{background:'white',borderRadius:14,border:`1.5px solid ${C.warningB}`,overflow:'hidden',marginBottom:16}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,background:C.warningL,display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontSize:16}}>⚠️</span>
            <span style={{fontSize:13,fontWeight:700,color:'#92400e'}}>أصناف بلا مورد محدد ({data.unassigned.length})</span>
          </div>
          {data.unassigned.map((item:any,i:number)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 16px',borderBottom:i<data.unassigned.length-1?`1px solid ${C.border}`:'none'}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.text}}>{item.name}</div>
                <div style={{fontSize:11,color:C.text3}}>متوفر: {item.qty} {item.unit}</div>
              </div>
              <div style={{fontSize:14,fontWeight:800,color:C.warning}}>+{item.suggested} {item.unit}</div>
            </div>
          ))}
        </div>
      )}

      {/* Send button */}
      {data?.supplierGroups?.length>0&&(
        <div className="fu" style={{marginBottom:24}}>
          {sent ? (
            <div style={{background:C.primaryL,border:`1px solid ${C.primaryB}`,borderRadius:14,padding:'16px',textAlign:'center'}}>
              <div style={{fontSize:24,marginBottom:6}}>✅</div>
              <div style={{fontSize:14,fontWeight:700,color:C.primary}}>تم إرسال طلبات الشراء للموردين على واتساب</div>
              {data.results?.map((r:any,i:number)=>(
                <div key={i} style={{fontSize:12,color:C.text3,marginTop:4}}>{r.supplier}: {r.sent?'✓ تم الإرسال':'✗ فشل'}</div>
              ))}
            </div>
          ) : (
            <button onClick={sendToSuppliers} disabled={sending}
              style={{width:'100%',padding:'16px',background:sending?C.text4:`linear-gradient(135deg,${C.primary},${C.primaryD})`,color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:sending?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:sending?'none':`0 6px 20px ${C.primary}30`,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
              {sending?'جاري الإرسال...':'إرسال طلبات الشراء للموردين عبر واتساب'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
