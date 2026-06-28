'use client'
import { useState, useRef, useEffect } from 'react'

const C = {
  primary:'#16a34a', primaryD:'#15803d', primaryL:'#f0fdf4', primaryB:'#bbf7d0',
  text:'#111827', text3:'#6b7280', text4:'#9ca3af',
  bg:'#f9fafb', border:'#f3f4f6', border2:'#e5e7eb',
}

const QUICK = [
  'ما الأصناف الناقصة؟',
  'ما أكثر صنف يُصرف؟',
  'هل مخزوني بحالة جيدة؟',
  'ما توصياتك لهذا الأسبوع؟',
]

interface Msg { role:'user'|'ai'; text:string }

export default function AIAssistant() {
  const [open, setOpen]       = useState(false)
  const [msgs, setMsgs]       = useState<Msg[]>([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    if(open && msgs.length===0) {
      setMsgs([{role:'ai', text:'مرحباً! 👋 أنا مساعدك الذكي في Storely. يمكنني مساعدتك في تحليل مخزونك وإعطائك توصيات. كيف يمكنني مساعدتك؟'}])
    }
  },[open])

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:'smooth'})
  },[msgs])

  async function send(text?:string) {
    const msg = text || input.trim()
    if(!msg || loading) return
    setInput('')
    setMsgs(m=>[...m,{role:'user',text:msg}])
    setLoading(true)

    const org_id = sessionStorage.getItem('s_org_id')
    const branch_id = sessionStorage.getItem('s_branch_id')

    try {
      const res = await fetch('/api/ai-assistant', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({message:msg, org_id, branch_id})
      })
      const data = await res.json()
      setMsgs(m=>[...m,{role:'ai',text:data.reply||'عذراً، حدث خطأ'}])
    } catch {
      setMsgs(m=>[...m,{role:'ai',text:'عذراً، حدث خطأ في الاتصال'}])
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ai-btn{animation:pulse 3s ease-in-out infinite}
        .ai-win{animation:fadeUp .3s ease}
        .msg-bubble{max-width:85%;padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.6;word-break:break-word}
      `}</style>

      {/* Floating Button */}
      {!open && (
        <button className="ai-btn" onClick={()=>setOpen(true)}
          style={{position:'fixed',bottom:90,left:16,zIndex:999,width:52,height:52,borderRadius:'50%',background:`linear-gradient(135deg,${C.primary},${C.primaryD})`,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 20px ${C.primary}50`,fontFamily:'inherit'}}>
          <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="ai-win" style={{position:'fixed',bottom:90,left:12,right:12,zIndex:999,maxWidth:400,margin:'0 auto',background:'white',borderRadius:20,boxShadow:'0 20px 60px rgba(0,0,0,.15)',border:`1px solid ${C.border2}`,display:'flex',flexDirection:'column',maxHeight:'70vh',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>

          {/* Header */}
          <div style={{padding:'14px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10,background:`linear-gradient(135deg,${C.primary},${C.primaryD})`,borderRadius:'20px 20px 0 0',flexShrink:0}}>
            <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:'white'}}>مساعد Storely الذكي</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,.7)'}}>يعرف مخزونك ويحلله</div>
            </div>
            <button onClick={()=>setOpen(false)} style={{background:'rgba(255,255,255,.2)',border:'none',borderRadius:8,width:28,height:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:14}}>✕</button>
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:'auto',padding:'14px 12px',display:'flex',flexDirection:'column',gap:10}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-start':'flex-end'}}>
                {m.role==='ai'&&(
                  <div style={{width:28,height:28,borderRadius:8,background:C.primaryL,border:`1px solid ${C.primaryB}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginLeft:6,alignSelf:'flex-end'}}>
                    <svg width="13" height="13" fill="none" stroke={C.primary} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
                  </div>
                )}
                <div className="msg-bubble" style={{
                  background: m.role==='user' ? C.bg : C.primaryL,
                  color: m.role==='user' ? C.text : C.text,
                  border: `1px solid ${m.role==='user'?C.border2:C.primaryB}`,
                  borderRadius: m.role==='user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{display:'flex',justifyContent:'flex-end',gap:6,alignItems:'center'}}>
                <div style={{width:28,height:28,borderRadius:8,background:C.primaryL,border:`1px solid ${C.primaryB}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <div style={{width:12,height:12,border:`2px solid ${C.primaryB}`,borderTopColor:C.primary,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
                </div>
                <div className="msg-bubble" style={{background:C.primaryL,border:`1px solid ${C.primaryB}`,borderRadius:'4px 16px 16px 16px'}}>
                  <span style={{display:'inline-flex',gap:4}}>
                    {[0,.2,.4].map(d=><span key={d} style={{width:6,height:6,borderRadius:'50%',background:C.primary,display:'inline-block',animation:`pulse 1.2s ease ${d}s infinite`}}/>)}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Quick questions */}
          {msgs.length<=1 && (
            <div style={{padding:'0 12px 8px',display:'flex',gap:6,flexWrap:'wrap'}}>
              {QUICK.map(q=>(
                <button key={q} onClick={()=>send(q)}
                  style={{padding:'5px 10px',background:C.bg,border:`1px solid ${C.border2}`,borderRadius:99,fontSize:11,fontWeight:600,color:C.text3,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{padding:'10px 12px',borderTop:`1px solid ${C.border}`,display:'flex',gap:8,flexShrink:0}}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
              placeholder="اسألني عن مخزونك..."
              style={{flex:1,padding:'10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:12,fontSize:13,outline:'none',fontFamily:'inherit',color:C.text,background:C.bg,transition:'border .15s'}}
              onFocus={e=>e.currentTarget.style.borderColor=C.primary}
              onBlur={e=>e.currentTarget.style.borderColor=C.border2}/>
            <button onClick={()=>send()} disabled={!input.trim()||loading}
              style={{width:40,height:40,borderRadius:12,background:input.trim()&&!loading?C.primary:'#e5e7eb',border:'none',cursor:input.trim()&&!loading?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background .15s'}}>
              <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
