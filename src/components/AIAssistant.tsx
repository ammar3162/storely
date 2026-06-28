'use client'
import React, { useState, useRef, useEffect } from 'react'

const C = {
  primary:'#16a34a', primaryD:'#15803d', primaryL:'#f0fdf4', primaryB:'#bbf7d0',
  text:'#111827', text2:'#374151', text3:'#6b7280', text4:'#9ca3af',
  bg:'#f9fafb', surface:'#ffffff', border:'#f3f4f6', border2:'#e5e7eb',
}

const QUICK = [
  { icon:'⏱️', text:'متى يُتوقع نفاد كل صنف ناقص؟' },
  { icon:'📊', text:'ما معدل الصرف الشهري لكل صنف؟' },
  { icon:'🛒', text:'ما الكمية التي أحتاج شراءها هذا الشهر؟' },
  { icon:'📈', text:'ما أكثر 5 أصناف صرفاً خلال 90 يوم؟' },
]

interface Msg { role:'user'|'ai'; text:string; time:string }

function renderText(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const next = lines[i+1] || ''

    // جدول
    if (line.includes('|') && next.includes('---')) {
      const tableLines: string[] = [line]
      i += 2 // skip separator
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]); i++
      }
      const cols = tableLines[0].split('|').filter((_,j,a)=>j>0&&j<a.length-1).map(c=>c.trim())
      const rows = tableLines.slice(1).map(l=>l.split('|').filter((_,j,a)=>j>0&&j<a.length-1).map(c=>c.trim()))
      elements.push(
        <div key={i} style={{overflowX:'auto',margin:'8px 0',borderRadius:10,border:'1px solid #e5e7eb',WebkitOverflowScrolling:'touch'}}>
          <table style={{borderCollapse:'collapse',fontSize:10,fontFamily:'inherit',direction:'rtl',minWidth:'100%'}}>
            <thead>
              <tr style={{background:'#f0fdf4'}}>
                {cols.map((h,j)=><th key={j} style={{padding:'6px 8px',color:'#16a34a',fontWeight:700,textAlign:'right',borderBottom:'1.5px solid #bbf7d0',whiteSpace:'nowrap',fontSize:10}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row,ri)=>(
                <tr key={ri} style={{background:ri%2===0?'white':'#f9fafb'}}>
                  {row.map((cell,ci)=>{
                    const isGood = cell.includes('آمن')
                    const isZero = cell==='0'
                    const color = isGood?'#16a34a':isZero?'#9ca3af':'#111827'
                    const cellParts = cell.replace(/\*\*(.*?)\*\*/g, '###BOLD###$1###BOLD###').split('###BOLD###')
                    return <td key={ci} style={{padding:'5px 8px',borderBottom:'1px solid #f3f4f6',textAlign:ci===0?'right':'center',color,fontWeight:ci===0?600:400,fontSize:10}}>
                      {cellParts.map((cp,cpi)=>cpi%2===0?cp:<b key={cpi} style={{color:isGood?'#16a34a':'#111827'}}>{cp}</b>)}
                    </td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // H2
    if (line.startsWith('## ')) {
      const t = line.replace(/^## /,'').replace(/\*\*(.*?)\*\*/g,'$1')
      elements.push(<div key={i} style={{fontSize:13,fontWeight:800,color:'#111827',marginTop:i>0?14:4,marginBottom:6,paddingBottom:5,borderBottom:'1.5px solid #f0fdf4'}}>{t}</div>)
      i++; continue
    }

    // HR
    if (line.trim()==='---') {
      elements.push(<div key={i} style={{height:1,background:'#f3f4f6',margin:'8px 0'}}/>)
      i++; continue
    }

    // numbered
    const num = line.match(/^(\d+)\. (.+)/)
    if (num) {
      const parts = num[2].split(/\*\*(.*?)\*\*/)
      elements.push(
        <div key={i} style={{display:'flex',gap:6,marginBottom:4}}>
          <span style={{width:18,height:18,borderRadius:'50%',background:'#f0fdf4',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#16a34a',flexShrink:0,marginTop:2}}>{num[1]}</span>
          <span style={{fontSize:12,color:'#374151',lineHeight:1.6}}>{parts.map((p,j)=>j%2===0?p:<b key={j} style={{color:'#111827'}}>{p}</b>)}</span>
        </div>
      )
      i++; continue
    }

    // bullet
    if (line.startsWith('- ')||line.startsWith('• ')) {
      const txt = line.replace(/^[-•] /,'')
      const parts = txt.split(/\*\*(.*?)\*\*/)
      elements.push(
        <div key={i} style={{display:'flex',gap:6,marginBottom:3}}>
          <span style={{color:'#16a34a',flexShrink:0,marginTop:3,fontSize:10}}>•</span>
          <span style={{fontSize:12,color:'#374151',lineHeight:1.6,flex:1}}>{parts.map((p,j)=>j%2===0?p:<b key={j} style={{color:'#111827'}}>{p}</b>)}</span>
        </div>
      )
      i++; continue
    }

    // empty
    if (line.trim()==='') { elements.push(<div key={i} style={{height:5}}/>); i++; continue }

    // normal
    const parts = line.split(/\*\*(.*?)\*\*/)
    elements.push(
      <div key={i} style={{fontSize:12,color:'#374151',lineHeight:1.7,marginBottom:2}}>
        {parts.map((p,j)=>j%2===0?p:<b key={j} style={{color:'#111827'}}>{p}</b>)}
      </div>
    )
    i++
  }

  return <>{elements}</>
}


function TypingDots() {
  return (
    <div style={{display:'flex',gap:4,alignItems:'center',padding:'4px 2px'}}>
      {[0,1,2].map(i=>(
        <div key={i} style={{width:7,height:7,borderRadius:'50%',background:C.primary,animation:`bounce 1.2s ease ${i*0.15}s infinite`}}/>
      ))}
    </div>
  )
}

function MsgBubble({ msg }: { msg:Msg }) {
  const isUser = msg.role==='user'
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:isUser?'flex-start':'flex-end',gap:4}}>
      <div style={{display:'flex',alignItems:'flex-end',gap:8,flexDirection:isUser?'row':'row-reverse'}}>
        {!isUser && (
          <div style={{width:30,height:30,borderRadius:9,background:`linear-gradient(135deg,${C.primary},${C.primaryD})`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
          </div>
        )}
        <div style={{
          maxWidth:'78%', padding:'11px 14px',
          background: isUser ? `linear-gradient(135deg,${C.primary},${C.primaryD})` : 'white',
          color: isUser ? 'white' : C.text,
          borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          fontSize:13, lineHeight:1.65, wordBreak:'break-word',
          boxShadow: isUser ? `0 4px 14px ${C.primary}30` : '0 2px 8px rgba(0,0,0,.06)',
          border: isUser ? 'none' : `1px solid ${C.border}`,
        }}>
          <>{renderText(msg.text)}</>
        </div>
      </div>
      <div style={{fontSize:9,color:C.text4,marginRight:isUser?0:38,marginLeft:isUser?0:0,paddingRight:isUser?4:0,paddingLeft:isUser?0:4}}>{msg.time}</div>
    </div>
  )
}

export default function AIAssistant() {
  const [open, setOpen]       = useState(false)
  const [msgs, setMsgs]       = useState<Msg[]>(()=>{
    if(typeof window==='undefined') return []
    try { return JSON.parse(sessionStorage.getItem('ai_msgs')||'[]') } catch { return [] }
  })
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const now = () => new Date().toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})

  useEffect(()=>{
    if(msgs.length>0) sessionStorage.setItem('ai_msgs', JSON.stringify(msgs))
  },[msgs])

  useEffect(()=>{
    if(open && msgs.length===0) {
      setMsgs([{role:'ai', text:'مرحباً! 👋 أنا مساعدك الذكي في Storely.\n\nيمكنني مساعدتك في:\n• تحليل مخزونك الحالي\n• معرفة الأصناف الناقصة\n• توصيات الشراء\n• إحصائيات الصرف\n\nكيف يمكنني مساعدتك اليوم؟', time:now()}])
    }
    if(open && !minimized) {
      setTimeout(()=>inputRef.current?.focus(), 300)
    }
  },[open, minimized])

  useEffect(()=>{
    if(!minimized) bottomRef.current?.scrollIntoView({behavior:'smooth'})
  },[msgs, minimized])

  async function send(text?:string) {
    const msg = (text || input).trim()
    if(!msg || loading) return
    setInput('')
    const userMsg:Msg = {role:'user', text:msg, time:now()}
    setMsgs(m=>[...m, userMsg])
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
      setMsgs(m=>[...m, {role:'ai', text:data.reply||'عذراً، حدث خطأ', time:now()}])
    } catch {
      setMsgs(m=>[...m, {role:'ai', text:'عذراً، حدث خطأ في الاتصال. تأكد من اتصالك بالإنترنت.', time:now()}])
    }
    setLoading(false)
    setTimeout(()=>inputRef.current?.focus(), 100)
  }

  const unreadCount = 0

  return (
    <>
      <style>{`
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{box-shadow:0 4px 20px ${C.primary}40}50%{box-shadow:0 4px 28px ${C.primary}70}}
        .ai-fab{animation:glow 3s ease-in-out infinite;transition:transform .2s}
        .ai-fab:active{transform:scale(.92)!important}
        .ai-win{animation:fadeUp .3s cubic-bezier(.34,1.56,.64,1)}
        .ai-input:focus{border-color:${C.primary}!important;box-shadow:0 0 0 3px ${C.primaryL}!important;outline:none!important}
        .quick-btn{transition:all .15s}
        .quick-btn:active{transform:scale(.95)}
        .send-btn{transition:all .2s}
        .send-btn:not(:disabled):active{transform:scale(.92)}
      `}</style>

      {/* FAB Button */}
      {!open && (
        <button className="ai-fab" onClick={()=>setOpen(true)}
          style={{position:'fixed',bottom:86,left:16,zIndex:999,width:54,height:54,borderRadius:'50%',background:`linear-gradient(135deg,${C.primary},${C.primaryD})`,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>
          </svg>
          {unreadCount>0&&<span style={{position:'absolute',top:-2,right:-2,width:16,height:16,borderRadius:'50%',background:'#ef4444',color:'white',fontSize:9,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid white'}}>{unreadCount}</span>}
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="ai-win" style={{
          position:'fixed',
          bottom: minimized ? 86 : 86,
          left: 12, right: 12,
          zIndex:999,
          maxWidth:420,
          margin:'0 auto',
          background:'white',
          borderRadius:20,
          boxShadow:'0 24px 64px rgba(0,0,0,.18)',
          border:`1px solid ${C.border}`,
          display:'flex',
          flexDirection:'column',
          height: minimized ? 'auto' : '72vh',
          maxHeight: minimized ? 'auto' : 580,
          overflow:'hidden',
          fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",
          direction:'rtl',
        }}>

          {/* Header */}
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.primaryD})`,padding:'14px 16px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            <div style={{width:38,height:38,borderRadius:11,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:'1.5px solid rgba(255,255,255,.3)'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:'white',letterSpacing:'-0.2px'}}>مساعد Storely الذكي</div>
              <div style={{display:'flex',alignItems:'center',gap:4,marginTop:1}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:'#86efac'}}/>
                <span style={{fontSize:10,color:'rgba(255,255,255,.8)'}}>متصل دائماً</span>
              </div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>setMinimized(m=>!m)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:12}}>
                {minimized?'▲':'▼'}
              </button>
              <button onClick={()=>{setOpen(false);setMinimized(false)}} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:14}}>✕</button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div style={{flex:1,overflowY:'auto',padding:'16px 14px',display:'flex',flexDirection:'column',gap:12,background:C.bg}}>
                {msgs.map((m,i)=><MsgBubble key={i} msg={m}/>)}
                {loading && (
                  <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
                    <div style={{width:30,height:30,borderRadius:9,background:`linear-gradient(135deg,${C.primary},${C.primaryD})`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <div style={{width:12,height:12,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'white',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
                    </div>
                    <div style={{background:'white',padding:'11px 14px',borderRadius:'4px 18px 18px 18px',border:`1px solid ${C.border}`,boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
                      <TypingDots/>
                    </div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              {/* Quick suggestions */}
              {msgs.length<=1 && (
                <div style={{padding:'10px 14px 0',background:'white',borderTop:`1px solid ${C.border}`,flexShrink:0}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.text4,marginBottom:8,textTransform:'uppercase',letterSpacing:'.06em'}}>اقتراحات سريعة</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10}}>
                    {QUICK.map(q=>(
                      <button key={q.text} className="quick-btn" onClick={()=>send(q.text)}
                        style={{display:'flex',alignItems:'center',gap:6,padding:'8px 10px',background:C.bg,border:`1px solid ${C.border2}`,borderRadius:10,fontSize:11,fontWeight:600,color:C.text2,cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
                        <span style={{fontSize:14}}>{q.icon}</span>
                        {q.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div style={{padding:'10px 12px',borderTop:`1px solid ${C.border}`,background:'white',display:'flex',gap:8,alignItems:'flex-end',flexShrink:0}}>
                <input ref={inputRef} className="ai-input" value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
                  placeholder="اسألني عن مخزونك..."
                  style={{flex:1,padding:'10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:12,fontSize:13,fontFamily:'inherit',color:C.text,background:C.bg,resize:'none',transition:'all .15s'}}/>
                <button className="send-btn" onClick={()=>send()} disabled={!input.trim()||loading}
                  style={{width:42,height:42,borderRadius:12,background:input.trim()&&!loading?`linear-gradient(135deg,${C.primary},${C.primaryD})`:'#e5e7eb',border:'none',cursor:input.trim()&&!loading?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:input.trim()&&!loading?`0 4px 14px ${C.primary}30`:'none'}}>
                  <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
