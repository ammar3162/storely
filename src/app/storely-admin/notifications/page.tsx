'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/toast'

const C = {
  primary:'#16a34a', primaryL:'#f0fdf4', primaryB:'#bbf7d0',
  danger:'#e24b4a', dangerL:'#fef2f2', dangerB:'#fecaca',
  warning:'#ba7517', warningL:'#fffbeb', warningB:'#fde68a',
  info:'#378add', infoL:'#eff6ff', infoB:'#bfdbfe',
  text:'#1c1c1a', text2:'#3d3d3a', text3:'#5f5e5a', text4:'#888780',
  bg:'#f5f5f4', border:'#ebebea', border2:'#e0e0dd',
}

export default function AdminNotificationsPage() {
  const [orgs, setOrgs]         = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [title, setTitle]       = useState('')
  const [message, setMessage]   = useState('')
  const [type, setType]         = useState<'info'|'warning'|'success'|'danger'>('info')
  const [sending, setSending]   = useState(false)
  const [sent, setSent]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'send'|'history'>('send')
  const sb = createClient()

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    const{data:orgsData}=await sb.from('organizations').select('id,name,created_at').order('name')
    setOrgs(orgsData||[])
    const{data:notifsData}=await (sb as any).from('admin_notifications').select('*').order('created_at',{ascending:false}).limit(50)
    setSent(notifsData||[])
    setLoading(false)
  }

  function toggleOrg(id:string) {
    setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])
  }

  async function sendNotification() {
    if(!title.trim()||!message.trim()){toast('أدخل العنوان والرسالة','warning');return}
    setSending(true)
    const targets = selected.length===0 ? orgs.map(o=>o.id) : selected
    const{error}=await (sb as any).from('admin_notifications').insert({
      title:title.trim(), message:message.trim(), type,
      target_orgs:selected.length===0?null:selected,
      sent_to_count:targets.length,
    })
    if(error){toast('خطأ: '+error.message,'error');setSending(false);return}
    const inserts=targets.map(org_id=>({org_id,title:title.trim(),message:message.trim(),type,read:false}))
    const{error:nErr}=await (sb as any).from('notifications').insert(inserts)
    if(nErr){toast('خطأ في الإشعارات: '+nErr.message,'error');setSending(false);return}
    toast(`تم الإرسال لـ ${targets.length} منشأة`)
    setTitle('');setMessage('');setSelected([]);setSending(false);load()
  }

  const TC = {
    info:    {label:'معلومة', color:C.info,    bg:C.infoL,    border:C.infoB},
    warning: {label:'تحذير',  color:C.warning, bg:C.warningL, border:C.warningB},
    success: {label:'نجاح',   color:C.primary, bg:C.primaryL, border:C.primaryB},
    danger:  {label:'خطر',    color:C.danger,  bg:C.dangerL,  border:C.dangerB},
  }

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',maxWidth:900,margin:'0 auto',padding:'24px 0'}}>
      <style>{`input:focus,textarea:focus{border-color:#16a34a!important;outline:none!important;box-shadow:0 0 0 3px #f0fdf4!important}.rh:hover{background:#f9f9f8}`}</style>

      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:0}}>إشعارات المنشآت</h1>
        <p style={{fontSize:11,color:C.text4,margin:'4px 0 0'}}>أرسل إشعارات تظهر في Storely مباشرة</p>
      </div>

      <div style={{display:'flex',gap:4,background:C.bg,borderRadius:9,padding:3,border:`1px solid ${C.border}`,marginBottom:20,width:'fit-content'}}>
        {[{v:'send',l:'إرسال'},{v:'history',l:'السجل'}].map(t=>(
          <button key={t.v} onClick={()=>setTab(t.v as any)}
            style={{padding:'6px 16px',borderRadius:7,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:tab===t.v?C.primary:'transparent',color:tab===t.v?'white':C.text3,transition:'all .15s'}}>
            {t.l}
          </button>
        ))}
      </div>

      {tab==='send'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,alignItems:'start'}}>
          <div style={{background:'white',borderRadius:12,padding:18,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>تفاصيل الإشعار</div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:10,fontWeight:700,color:C.text3,display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'.05em'}}>النوع</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
                {Object.entries(TC).map(([k,v])=>(
                  <button key={k} onClick={()=>setType(k as any)}
                    style={{padding:'7px 4px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',border:`1.5px solid ${type===k?v.color:C.border2}`,background:type===k?v.bg:'white',color:type===k?v.color:C.text3,fontFamily:'inherit',transition:'all .15s'}}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:10}}>
              <label style={{fontSize:10,fontWeight:700,color:C.text3,display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'.05em'}}>العنوان *</label>
              <input value={title} onChange={e=>setTitle(e.target.value)}
                style={{width:'100%',padding:'10px 12px',border:`1px solid ${C.border2}`,borderRadius:8,fontSize:13,fontFamily:'inherit',color:C.text,boxSizing:'border-box'}}
                placeholder="مثال: تحديث جديد في Storely"/>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,fontWeight:700,color:C.text3,display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'.05em'}}>الرسالة *</label>
              <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4}
                style={{width:'100%',padding:'10px 12px',border:`1px solid ${C.border2}`,borderRadius:8,fontSize:13,fontFamily:'inherit',color:C.text,resize:'vertical',boxSizing:'border-box'}}
                placeholder="اكتب تفاصيل الإشعار هنا..."/>
            </div>

            {(title||message)&&(
              <div style={{background:TC[type].bg,border:`1px solid ${TC[type].border}`,borderRadius:9,padding:'11px 14px',marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:TC[type].color,marginBottom:3}}>معاينة</div>
                <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:3}}>{title||'العنوان'}</div>
                <div style={{fontSize:11,color:C.text3}}>{message||'الرسالة...'}</div>
              </div>
            )}

            <button onClick={sendNotification} disabled={sending}
              style={{width:'100%',padding:'11px',background:sending?C.text4:C.primary,color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:sending?'not-allowed':'pointer',fontFamily:'inherit'}}>
              {sending?'جاري الإرسال...':`إرسال ${selected.length===0?`للكل (${orgs.length})`:` لـ ${selected.length} منشأة`}`}
            </button>
          </div>

          <div style={{background:'white',borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
            <div style={{padding:'11px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.text}}>المنشآت</div>
                <div style={{fontSize:10,color:C.text4,marginTop:1}}>{selected.length===0?'سيُرسل للجميع':`${selected.length} محددة`}</div>
              </div>
              <div style={{display:'flex',gap:5}}>
                <button onClick={()=>setSelected(orgs.map(o=>o.id))} style={{padding:'3px 9px',borderRadius:6,border:`1px solid ${C.border2}`,background:C.bg,fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:C.text2}}>الكل</button>
                <button onClick={()=>setSelected([])} style={{padding:'3px 9px',borderRadius:6,border:`1px solid ${C.border2}`,background:C.bg,fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:C.text2}}>إلغاء</button>
              </div>
            </div>
            <div style={{maxHeight:380,overflowY:'auto'}}>
              {loading?(
                <div style={{padding:'24px',textAlign:'center',color:C.text4,fontSize:12}}>جاري التحميل...</div>
              ):orgs.map((org,i)=>{
                const isSel=selected.includes(org.id)
                return(
                  <div key={org.id} className="rh" onClick={()=>toggleOrg(org.id)}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:i<orgs.length-1?`1px solid ${C.border}`:'none',cursor:'pointer',background:isSel?C.primaryL:'white',transition:'background .1s'}}>
                    <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${isSel?C.primary:C.border2}`,background:isSel?C.primary:'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {isSel&&<span style={{color:'white',fontSize:10,fontWeight:900}}>✓</span>}
                    </div>
                    <span style={{fontSize:12,fontWeight:600,color:C.text,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{org.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab==='history'&&(
        <div style={{background:'white',borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
          <div style={{padding:'11px 14px',borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:13,fontWeight:700,color:C.text}}>سجل الإشعارات</span>
          </div>
          {sent.length===0?(
            <div style={{padding:'48px',textAlign:'center',color:C.text4,fontSize:13}}>لا توجد إشعارات بعد</div>
          ):sent.map((n,i)=>{
            const tc=TC[n.type as keyof typeof TC]||TC.info
            return(
              <div key={n.id} style={{padding:'12px 14px',borderBottom:i<sent.length-1?`1px solid ${C.border}`:'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                      <span style={{background:tc.bg,color:tc.color,border:`1px solid ${tc.border}`,padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:600}}>{tc.label}</span>
                      <span style={{fontSize:10,color:C.text4}}>{new Date(n.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                    <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>{n.title}</div>
                    <div style={{fontSize:11,color:C.text3}}>{n.message}</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:600,color:C.primary,background:C.primaryL,padding:'3px 8px',borderRadius:99,border:`1px solid ${C.primaryB}`,flexShrink:0}}>{n.sent_to_count} منشأة</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
