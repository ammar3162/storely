'use client'
import { FeatureIcon } from '@/components/ui/feature-icon'
import React, { useState, useRef, useEffect } from 'react'
import { getMe } from '@/lib/session'
import { storelyTokens as uiTokens } from '@/components/ui/design-tokens'

const C = {
  primary:uiTokens.color.navy, primaryD:uiTokens.color.navyHover, primaryL:uiTokens.color.background, primaryB:uiTokens.color.border,
  text:uiTokens.color.text, text2:uiTokens.color.text, text3:uiTokens.color.textMuted, text4:uiTokens.color.textMuted,
  bg:uiTokens.color.background, surface:uiTokens.color.surface, border:uiTokens.color.border, border2:uiTokens.color.border,
}

// اقتراحات سريعة — المساعد يجاوب على كل قسم مفعّل عند المنشأة (الاشتراك دايماً)
// اقتراحات سريعة — مع إضافة الذكاء: أسئلة بيانات، وبدونها: أسئلة تعليم واشتراك (المساعد يجاوب عليها مجاناً)
const QUICK_AI = [
  { text:'متى ينتهي اشتراكي؟' },
  { text:'ما الأصناف التي ستنفد هذا الأسبوع؟' },
  { text:'ما آخر فاتورة شراء؟' },
  { text:'كم ضريبتي هذا الشهر؟' },
  { text:'من أكثر موظف صرفاً هذا الشهر؟' },
  { text:'من تأخر هذا الأسبوع؟' },
]
const QUICK_BASIC = [
  { text:'كيف أضيف موظف؟' },
  { text:'كيف أسجل فاتورة شراء؟' },
  { text:'كيف أسوي جرد للمخزون؟' },
  { text:'متى ينتهي اشتراكي؟' },
  { text:'ما الفرق بين باقتي والباقات الأخرى؟' },
  { text:'ما فائدة إضافة الذكاء الاصطناعي؟' },
]
const WELCOME_AI = 'مرحباً، أنا مساعدك الذكي في Storely.\n\nيمكنني مساعدتك في:\n• المخزون وما سينفد منه\n• المشتريات والموردين وأسعارهم\n• الصرف والموظفين والحضور\n• الكاشير والضريبة\n• اشتراكك وطريقة استخدام النظام\n\nبماذا يمكنني مساعدتك؟'
const WELCOME_BASIC = 'مرحباً، أنا مساعدك في Storely.\n\nيمكنني تعليمك استخدام النظام خطوة بخطوة مع فيديوهات الشرح، والإجابة عن اشتراكك وباقتك.\n\nأما تحليل بياناتك (المخزون، والمشتريات، والموظفون…) فمتاح مع إضافة الذكاء الاصطناعي.\n\nبماذا يمكنني مساعدتك؟'

interface Msg { role:'user'|'ai'; text:string; time:string }

// الروابط بالرد تنضغط: يوتيوب يطلع زر «مشاهدة فيديو الشرح»، والباقي الرابط نفسه — تفتح بتبويب جديد
const URL_RE = /(https?:\/\/[^\s)<>»«"']+)/g
function Linkified({ text }: { text: string }) {
  const bits = text.split(URL_RE)
  return <>{bits.map((b, i) => {
    if (i % 2 === 0) return b
    const url = b.replace(/[.,،؛]+$/, '')
    const yt = /(?:youtu\.be|youtube\.com)/.test(url)
    return (
      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
        style={yt ? { display:'inline-flex', alignItems:'center', gap:6, margin:'4px 0', padding:'6px 12px', borderRadius:8, background:'#029FA2', color:'white', fontWeight:700, fontSize:12, textDecoration:'none' }
          : { color:'#029FA2', fontWeight:700, textDecoration:'underline', wordBreak:'break-all' }}>
        {yt ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>مشاهدة فيديو الشرح</> : url}
      </a>
    )
  })}</>
}

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
        <div key={i} style={{overflowX:'auto',margin:'8px 0',borderRadius:uiTokens.radius.control,border:`1px solid ${C.border2}`,WebkitOverflowScrolling:'touch'}}>
          <table style={{borderCollapse:'collapse',fontSize:uiTokens.typography.body,fontFamily:'inherit',direction:'rtl',minWidth:'100%'}}>
            <thead>
              <tr style={{background:C.primaryL}}>
                {cols.map((h,j)=><th key={j} style={{padding:'12px 16px',color:C.primary,fontWeight:700,textAlign:'right',borderBottom:`1px solid ${C.primaryB}`,whiteSpace:'nowrap',fontSize:uiTokens.typography.body}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row,ri)=>(
                <tr key={ri} style={{background:ri%2===0?'white':C.bg}}>
                  {row.map((cell,ci)=>{
                    const isGood = cell.includes('آمن')
                    const isZero = cell==='0'
                    const color = isGood?C.primary:isZero?C.text4:C.text
                    const cellParts = cell.replace(/\*\*(.*?)\*\*/g, '###BOLD###$1###BOLD###').split('###BOLD###')
                    return <td key={ci} style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,textAlign:ci===0?'right':'center',color,fontWeight:ci===0?600:400,fontSize:uiTokens.typography.body}}>
                      {cellParts.map((cp,cpi)=>cpi%2===0?cp:<b key={cpi} style={{color:isGood?C.primary:C.text}}>{cp}</b>)}
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
      elements.push(<div key={i} style={{fontSize:uiTokens.typography.body,fontWeight:800,color:C.text,marginTop:i>0?14:4,marginBottom:6,paddingBottom:5,borderBottom:`1px solid ${C.primaryL}`}}>{t}</div>)
      i++; continue
    }

    // HR
    if (line.trim()==='---') {
      elements.push(<div key={i} style={{height:1,background:C.border,margin:'8px 0'}}/>)
      i++; continue
    }

    // numbered
    const num = line.match(/^(\d+)\. (.+)/)
    if (num) {
      const parts = num[2].split(/\*\*(.*?)\*\*/)
      elements.push(
        <div key={i} style={{display:'flex',gap:6,marginBottom:4}}>
          <span style={{width:18,height:18,borderRadius:'50%',background:C.primaryL,border:`1px solid ${C.primaryB}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:uiTokens.typography.supporting,fontWeight:700,color:C.primary,flexShrink:0,marginTop:2}}>{num[1]}</span>
          <span style={{fontSize:uiTokens.typography.body,color:C.text2,lineHeight:uiTokens.typography.lineHeight}}>{parts.map((p,j)=>j%2===0?<Linkified key={j} text={p}/>:<b key={j} style={{color:C.text}}><Linkified text={p}/></b>)}</span>
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
          <span style={{color:C.primary,flexShrink:0,marginTop:3,fontSize:uiTokens.typography.supporting}}>•</span>
          <span style={{fontSize:uiTokens.typography.body,color:C.text2,lineHeight:uiTokens.typography.lineHeight,flex:1}}>{parts.map((p,j)=>j%2===0?<Linkified key={j} text={p}/>:<b key={j} style={{color:C.text}}><Linkified text={p}/></b>)}</span>
        </div>
      )
      i++; continue
    }

    // empty
    if (line.trim()==='') { elements.push(<div key={i} style={{height:5}}/>); i++; continue }

    // normal
    const parts = line.split(/\*\*(.*?)\*\*/)
    elements.push(
      <div key={i} style={{fontSize:uiTokens.typography.body,color:C.text2,lineHeight:uiTokens.typography.lineHeight,marginBottom:2}}>
        {parts.map((p,j)=>j%2===0?<Linkified key={j} text={p}/>:<b key={j} style={{color:C.text}}><Linkified text={p}/></b>)}
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
        <div key={i} style={{width:7,height:7,borderRadius:'50%',background:C.primary,animation:`aiBounce 1.2s ease ${i*0.15}s infinite`}}/>
      ))}
    </div>
  )
}

function MsgBubble({ msg }: { msg:Msg }) {
  const isUser = msg.role==='user'
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:isUser?'flex-start':'flex-end',gap:4}}>
      {/* width:100% — عشان maxWidth 78% للفقاعة ينحسب من عرض الشات (كان ينحسب من محتوى ضيق فالكلام ينكسر كلمة كلمة) */}
      <div style={{display:'flex',alignItems:'flex-end',gap:8,flexDirection:isUser?'row':'row-reverse',width:'100%'}}>
        {!isUser && (
          <div style={{width:30,height:30,borderRadius:uiTokens.radius.control,background:C.primary,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <FeatureIcon name="💬" />
          </div>
        )}
        <div style={{
          maxWidth:'78%', padding:'11px 14px',
          background: isUser ? C.primaryL : C.surface,
          color: isUser ? C.text : C.text,
          borderRadius: uiTokens.radius.card,
          fontSize:uiTokens.typography.body, lineHeight:uiTokens.typography.lineHeight, wordBreak:'break-word',
          boxShadow: uiTokens.shadow.surface,
          border: `1px solid ${C.border}`,
        }}>
          {/* رسالة العميل نص عادي أبيض (renderText يلوّن بالرمادي لردود المساعد) */}
          {isUser ? <div style={{fontSize:13.5,fontWeight:600,color:'white',whiteSpace:'pre-wrap'}}>{msg.text}</div> : <>{renderText(msg.text)}</>}
        </div>
      </div>
      <div style={{fontSize:uiTokens.typography.supporting,color:C.text4,marginRight:isUser?0:38,marginLeft:isUser?0:0,paddingRight:isUser?4:0,paddingLeft:isUser?0:4}}>{msg.time}</div>
    </div>
  )
}

export default function AIAssistant() {
  const [open, setOpen]       = useState(false)
  // عنده ميزة الذكاء (الباقة أو الإضافة أو التجربة)؟ — يحدد الترحيب والاقتراحات
  const [hasAi, setHasAi] = useState<boolean|null>(null)
  useEffect(()=>{ getMe().then(me=>setHasAi(!!me?.org?.features?.ai)).catch(()=>setHasAi(false)) },[])
  const [msgs, setMsgs]       = useState<Msg[]>(()=>{
    if(typeof window==='undefined') return []
    try { return JSON.parse(sessionStorage.getItem('ai_msgs')||'[]') } catch { return [] }
  })
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [showTimeout, setShowTimeout] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showPeriodPicker, setShowPeriodPicker] = useState(false)
  const IDLE_MS = 3 * 60 * 1000
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  const now = () => new Date().toLocaleTimeString('ar-SA-u-ca-gregory',{hour:'2-digit',minute:'2-digit'})

  function resetTimer() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShowTimeout(false)
    timeoutRef.current = setTimeout(()=>{ setShowTimeout(true) }, IDLE_MS)
  }

  function continueChat() {
    setShowTimeout(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(()=>{ setShowTimeout(true) }, 5*60*1000)
  }

  function closeChat() {
    setShowTimeout(false)
    setOpen(false)
    setMsgs([])
    sessionStorage.removeItem('ai_msgs')
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  useEffect(()=>{
    if(msgs.length>0) {
      sessionStorage.setItem('ai_msgs', JSON.stringify(msgs))
      resetTimer()
    }
  },[msgs])

  useEffect(()=>{
    if(open) resetTimer()
    else { if(timeoutRef.current) clearTimeout(timeoutRef.current); setShowTimeout(false) }
    return ()=>{ if(timeoutRef.current) clearTimeout(timeoutRef.current) }
  },[open])

  useEffect(()=>{
    if(open && msgs.length===0) {
      setMsgs([{role:'ai', text: hasAi===false ? WELCOME_BASIC : WELCOME_AI, time:now()}])
    }
    if(open && !minimized) {
      setTimeout(()=>inputRef.current?.focus(), 300)
    }
  },[open, minimized, hasAi])

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

    // كشف طلب التواصل مع الدعم
    // طلب صريح لدعم بشري بس — كلمات عامة مثل «موظف» أو «واتساب» تروح للمساعد (أسئلة عن الموظفين والتقرير)
    const supportKeywords = ['الدعم الفني','مساعدة بشرية','أكلم الدعم','اكلم الدعم','تواصل مع الدعم','شكوى','مشكلة تقنية']
    if (supportKeywords.some(k => msg.includes(k))) {
      setMsgs(m=>[...m, {role:'ai', text:'يسعدنا مساعدتك! يمكنك التواصل مع فريق دعم Storely مباشرة عبر واتساب من خلال الزر أدناه، وسيرد عليك أحد المختصين في أقرب وقت.', time:now()}])
      setLoading(false)
      return
    }

    const org_id = sessionStorage.getItem('s_org_id')
    const branch_id = sessionStorage.getItem('s_branch_id')

    try {
      const res = await fetch('/api/ai-assistant', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        // آخر رسائل المحادثة (بدون الترحيب) — عشان يفهم الردود القصيرة مثل «1» أو «وأمس؟»
        body: JSON.stringify({message:msg, org_id, branch_id, history: msgs.slice(1).slice(-6).map(m=>({role:m.role==='user'?'user':'assistant', text:m.text}))})
      })
      const data = await res.json()
      setMsgs(m=>[...m, {role:'ai', text:data.reply||data.error||'عذراً، حدث خطأ', time:now()}])
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
        @keyframes aiBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        @keyframes aiFadeUp{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ai-fab{display:flex;transition:transform .15s}
        /* على الكمبيوتر: الزر والنافذة بالزاوية السفلية (ما فيه شريط سفلي مثل الجوال) */
        @media(min-width:768px){.ai-fab{bottom:24px!important;left:24px!important;width:50px!important;height:50px!important}.ai-win{bottom:86px!important;left:24px!important;right:auto!important;width:400px;margin:0!important}}
        .ai-fab:active{transform:none}
        .ai-win button:focus-visible{outline:2px solid ${C.primary};outline-offset:2px}.ai-win{animation:aiFadeUp .2s ease}
        .ai-input:focus{border-color:${C.primary};box-shadow:${uiTokens.shadow.focus};outline:none}
        .quick-btn{transition:all .15s}
        .quick-btn:active{transform:scale(.95)}
        .send-btn{transition:all .2s}
        .send-btn:not(:disabled):active{transform:scale(.92)}
      `}</style>

      {/* FAB Button */}
      {!open && (
        <button className="ai-fab" onClick={()=>setOpen(true)}
          aria-label="المساعد" style={{position:'fixed',bottom:84,left:14,zIndex:999,width:46,height:46,borderRadius:'50%',background:C.surface,border:`1px solid ${C.border}`,boxShadow:uiTokens.shadow.surface,cursor:'pointer',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <FeatureIcon name="💬" />
          {unreadCount>0&&<span style={{position:'absolute',top:-2,right:-2,width:16,height:16,borderRadius:'50%',background:uiTokens.color.danger,color:'white',fontSize:uiTokens.typography.supporting,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid white'}}>{unreadCount}</span>}
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
          background:C.surface,
          borderRadius:uiTokens.radius.panel,
          boxShadow:uiTokens.shadow.panel,
          border:`1px solid ${C.border}`,
          display:'flex',
          flexDirection:'column',
          height: minimized ? 'auto' : 'min(72dvh, 580px)',
          maxHeight: minimized ? 'auto' : 580,
          overflow:'hidden',
          fontFamily:uiTokens.typography.family,
          direction:'rtl',
        }}>

          {/* Header */}
          <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:'14px 16px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            <div style={{width:38,height:38,borderRadius:uiTokens.radius.control,background:C.primaryL,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${C.border}`}}>
              <FeatureIcon name="💬" />
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:C.text,letterSpacing:'-0.2px'}}>مساعد Storely الذكي</div>
              <div style={{display:'flex',alignItems:'center',gap:4,marginTop:1}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:uiTokens.color.success}}/>
                <span style={{fontSize:uiTokens.typography.supporting,color:C.text3}}>متصل دائماً</span>
              </div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>setMinimized(m=>!m)} style={{width:uiTokens.control.icon,height:uiTokens.control.icon,borderRadius:uiTokens.radius.control,background:C.surface,border:`1px solid ${C.border}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.text,fontSize:uiTokens.typography.body}}>
                {minimized?'▲':'▼'}
              </button>
              <button onClick={()=>setShowCloseConfirm(true)} style={{width:uiTokens.control.icon,height:uiTokens.control.icon,borderRadius:uiTokens.radius.control,background:C.surface,border:`1px solid ${C.border}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.text,fontSize:14}}>✕</button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Close Confirm */}
          {showCloseConfirm && (
            <div style={{position:'absolute',inset:0,zIndex:10,background:uiTokens.color.backdrop,display:'flex',alignItems:'center',justifyContent:'center',padding:20,borderRadius:uiTokens.radius.panel}}>
              <div className="storely-dialog-shell" style={{width:'100%',maxWidth:280,textAlign:'center',direction:'rtl'}}>
                <div style={{fontSize:28,marginBottom:10}}><FeatureIcon name="💬" size={26} /></div>
                <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:6}}>إغلاق المحادثة؟</div>
                <div style={{fontSize:uiTokens.typography.body,color:C.text3,marginBottom:18,lineHeight:uiTokens.typography.lineHeight}}>سيتم حذف المحادثة الحالية. المرة القادمة ستبدأ محادثة جديدة.</div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setShowCloseConfirm(false)}
                    style={{flex:1,padding:'10px',background:C.bg,border:`1px solid ${C.border2}`,borderRadius:uiTokens.radius.control,fontSize:uiTokens.typography.body,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:C.text2}}>
                    إلغاء
                  </button>
                  <button onClick={()=>{
                    setShowCloseConfirm(false)
                    setOpen(false)
                    setMinimized(false)
                    setMsgs([])
                    sessionStorage.removeItem('ai_msgs')
                    if(timeoutRef.current) clearTimeout(timeoutRef.current)
                  }}
                    style={{flex:1,padding:'10px',background:uiTokens.color.danger,color:'white',border:'none',borderRadius:uiTokens.radius.control,fontSize:uiTokens.typography.body,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
              <div style={{flex:1,overflowY:'auto',padding:'16px 14px',display:'flex',flexDirection:'column',gap:12,background:C.bg}}>
                {msgs.map((m,i)=><MsgBubble key={i} msg={m}/>)}
                {loading && (
                  <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
                    <div style={{width:30,height:30,borderRadius:uiTokens.radius.control,background:C.primary,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <div style={{width:12,height:12,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'white',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
                    </div>
                    <div style={{background:C.surface,padding:'11px 14px',borderRadius:uiTokens.radius.card,border:`1px solid ${C.border}`,boxShadow:uiTokens.shadow.surface}}>
                      <TypingDots/>
                    </div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              {/* Timeout message */}
          {showTimeout && (
            <div style={{margin:'8px 12px',background:uiTokens.color.warningBg,border:`1px solid ${uiTokens.color.warningBorder}`,borderRadius:uiTokens.radius.control,padding:'12px 14px',textAlign:'center'}}>
              <div style={{fontSize:uiTokens.typography.body,fontWeight:700,color:uiTokens.color.warning,marginBottom:10}}><FeatureIcon name="⏱️" /> هل تريد مواصلة المحادثة؟</div>
              <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                <button onClick={continueChat}
                  style={{padding:'7px 16px',background:C.primary,color:'white',border:'none',borderRadius:uiTokens.radius.control,fontSize:uiTokens.typography.body,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  مواصلة
                </button>
                <button onClick={closeChat}
                  style={{padding:'7px 16px',background:uiTokens.color.dangerBg,color:uiTokens.color.danger,border:`1px solid ${uiTokens.color.dangerBorder}`,borderRadius:uiTokens.radius.control,fontSize:uiTokens.typography.body,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {/* Quick suggestions */}
              {msgs.length<=1 && (
                <div style={{padding:'10px 14px 0',background:C.surface,borderTop:`1px solid ${C.border}`,flexShrink:0}}>
                  <div style={{fontSize:uiTokens.typography.supporting,fontWeight:700,color:C.text4,marginBottom:8,textTransform:'uppercase',letterSpacing:'.06em'}}>اقتراحات سريعة</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10}}>
                    {(hasAi===false ? QUICK_BASIC : QUICK_AI).map(q=>(
                      <button key={q.text} className="quick-btn" onClick={()=>send(q.text)}
                        style={{display:'flex',alignItems:'center',gap:6,padding:'8px 10px',background:C.bg,border:`1px solid ${C.border2}`,borderRadius:uiTokens.radius.control,fontSize:uiTokens.typography.supporting,fontWeight:600,color:C.text2,cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
                        {q.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

          {/* Input */}
              <div style={{padding:'10px 12px',borderTop:`1px solid ${C.border}`,background:C.surface,display:'flex',gap:8,alignItems:'flex-end',flexShrink:0}}>
                <input ref={inputRef} className="ai-input" value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
                  placeholder="اسألني عن مخزونك..."
                  style={{flex:1,minWidth:0,padding:'10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:uiTokens.radius.control,fontSize:uiTokens.typography.body,fontFamily:'inherit',color:C.text,background:C.bg,resize:'none',transition:'all .15s'}}/>
                <button className="send-btn" onClick={()=>send()} disabled={!input.trim()||loading}
                  style={{width:42,height:42,borderRadius:uiTokens.radius.control,background:input.trim()&&!loading?C.primary:C.border2,border:'none',cursor:input.trim()&&!loading?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:input.trim()&&!loading?uiTokens.shadow.surface:'none'}}>
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
