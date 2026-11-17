'use client'
import { FeatureIcon } from '@/components/ui/feature-icon'
import React, { useState, useRef, useEffect } from 'react'
import { Bot, ChevronDown, ChevronUp, ChevronLeft, X, ArrowUp, LifeBuoy, Send, Receipt, UserCheck, Clock, AlertTriangle, RotateCcw, PackageMinus, Percent, Wallet, CalendarClock, Sparkles } from 'lucide-react'
import type { Suggestion, SuggestIcon } from '@/lib/assistantSuggestions'
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

// أيقونة كل اقتراح (lib/assistantSuggestions)
const SUGGEST_ICON: Record<SuggestIcon, React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>> = {
  closing: Receipt, attendance: UserCheck, late: Clock, deficit: AlertTriangle, returns: RotateCcw, stock: PackageMinus, vat: Percent, payables: Wallet, subscription: CalendarClock,
}
const SUGGEST_TTL = 2 * 60 * 1000   // نحدّث الاقتراحات لو صار لها أكثر من دقيقتين

const SUPPORT_TIP_KEY = 'support_tip_seen'
// suggest = ترحيب المساعد بأهم أشياء اليوم، والاقتراحات أزرار تحت الرسالة
interface Msg { role:'user'|'ai'; text:string; time:string; kind?:'support'|'ticket'|'suggest'; sugs?: Suggestion[] }
const greeting = () => (new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير')
const BUBBLE_SEEN = 'ai_bubble_seen'   // الاقتراحات اللي طلعت كفقاعة بهالجلسة (ما تتكرر)

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
        style={yt ? { display:'inline-flex', alignItems:'center', gap:6, margin:'4px 0', padding:'7px 14px', borderRadius:999, background:uiTokens.color.navy, color:'white', fontWeight:600, fontSize:14, textDecoration:'none' }
          : { color:uiTokens.color.navy, fontWeight:600, textDecoration:'underline', textUnderlineOffset:3, wordBreak:'break-all' }}>
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
        <div key={i} style={{width:7,height:7,borderRadius:'50%',background:'var(--storely-subtle, #8E8E93)',animation:`aiBounce 1.2s ease ${i*0.15}s infinite`}}/>
      ))}
    </div>
  )
}

// فقاعات مثل الرسائل في الآيفون: المستخدم كحلي، والمساعد رمادي فاتح — بدون حدود ولا ظلال
function MsgBubble({ msg }: { msg:Msg }) {
  const isUser = msg.role==='user'
  return (
    <div style={{display:'flex',justifyContent:isUser?'flex-start':'flex-end',width:'100%'}}>
      <div style={{
        maxWidth:'82%', padding:'9px 14px',
        background: isUser ? C.primary : 'var(--storely-fill, #E9E9EB)',
        color: isUser ? 'white' : C.text,
        borderRadius:20,
        // زاوية «الذيل» أصغر مثل الآيفون (المستخدم يمين، والمساعد يسار بالعربي)
        ...(isUser ? { borderBottomRightRadius:6 } : { borderBottomLeftRadius:6 }),
        fontSize:16, lineHeight:1.55, wordBreak:'break-word',
      }}>
        {isUser ? <div style={{fontSize:16,fontWeight:400,color:'white',whiteSpace:'pre-wrap'}}>{msg.text}</div> : <>{renderText(msg.text)}</>}
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const [open, setOpen]       = useState(false)
  // عنده ميزة الذكاء (الباقة أو الإضافة أو التجربة)؟ — يحدد الترحيب والاقتراحات
  const [hasAi, setHasAi] = useState<boolean|null>(null)
  useEffect(()=>{ getMe().then(me=>setHasAi(!!me?.org?.features?.ai)).catch(()=>setHasAi(false)) },[])
  // اقتراحات من بيانات المنشأة الحين (إقفالات اليوم، من داوم، العجز...) — بدون ذكاء اصطناعي، وتتحدث كل دقيقتين
  const [sugs, setSugs] = useState<Suggestion[]|null>(null)
  const sugsAt = useRef(0)
  const [asked, setAsked] = useState<string[]>([])
  async function loadSuggestions(force = false) {
    if (!force && Date.now() - sugsAt.current < SUGGEST_TTL) return
    const org_id = typeof window!=='undefined' ? sessionStorage.getItem('s_org_id') : null
    if (!org_id) { setSugs([]); return }
    sugsAt.current = Date.now()
    try {
      const branch_id = sessionStorage.getItem('s_branch_id') || ''
      const r = await fetch(`/api/ai-assistant/suggestions?org_id=${encodeURIComponent(org_id)}&branch_id=${encodeURIComponent(branch_id)}`)
      const j = await r.json().catch(()=>null)
      setSugs(j?.success && Array.isArray(j.suggestions) ? j.suggestions : [])
    } catch { setSugs([]) }
  }
  useEffect(()=>{ if(hasAi) loadSuggestions(true) },[hasAi])
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
    setAsked([])
    sessionStorage.removeItem('ai_msgs')
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  useEffect(()=>{
    if(msgs.length>0) {
      sessionStorage.setItem('ai_msgs', JSON.stringify(msgs))
      resetTimer()
    }
  },[msgs])

  useEffect(()=>{ if(open && hasAi) loadSuggestions() },[open])
  useEffect(()=>{
    if(open) resetTimer()
    else { if(timeoutRef.current) clearTimeout(timeoutRef.current); setShowTimeout(false) }
    return ()=>{ if(timeoutRef.current) clearTimeout(timeoutRef.current) }
  },[open])

  useEffect(()=>{
    // الترحيب: لو المساعد يحلل البيانات ننتظر الاقتراحات، فيرحّب بأهم أشياء اليوم كأزرار
    if(open && msgs.length===0 && hasAi!==null && !(hasAi && sugs===null)) {
      const live = hasAi ? (sugs||[]).filter(x=>!asked.includes(x.id)) : []
      setMsgs([live.length
        ? {role:'ai', kind:'suggest', text:`${greeting()}، هذه أهم الأشياء الآن في منشأتك. اضغط أي منها وأعرض لك التفاصيل، أو اسألني عن أي شيء.`, sugs: live.slice(0, 5), time:now()}
        : {role:'ai', text: hasAi===false ? WELCOME_BASIC : WELCOME_AI, time:now()}])
    }
    if(open && !minimized) {
      setTimeout(()=>inputRef.current?.focus(), 300)
    }
  },[open, minimized, hasAi, sugs])

  useEffect(()=>{
    if(!minimized) bottomRef.current?.scrollIntoView({behavior:'smooth'})
  },[msgs, minimized])

  // تذكرة دعم: المحادثة كاملة + الصفحة الحالية → «صندوق الطلبات ← الدعم» في لوحة الإدارة
  const [ticketBusy, setTicketBusy] = useState(false)
  function offerSupport() { setMsgs(m=>[...m, {role:'ai', text:'أرسل طلبك لفريق الدعم الفني — يوصلهم سؤالك والمحادثة كاملة، ويصلك ردّهم في الإشعارات.', time:now(), kind:'support'}]) }
  async function sendTicket() {
    if (ticketBusy) return
    setTicketBusy(true)
    try {
      const conversation = msgs.slice(1).filter(m=>m.kind!=='support'&&m.kind!=='ticket').map(m=>({role:m.role, text:m.text}))   // بدون رسالة الترحيب
      const r = await fetch('/api/support-tickets', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ conversation, page: window.location.pathname, source:'assistant' }) })
      const j = await r.json().catch(()=>({}))
      setMsgs(m=>[...m.filter(x=>x.kind!=='support'), j.success
        ? {role:'ai', text:`وصل طلبك للدعم الفني — رقم الطلب **${j.number}**.\nسيرد عليك الفريق في أقرب وقت، ويصلك الرد في الإشعارات.`, time:now(), kind:'ticket'}
        : {role:'ai', text: j.error || 'تعذّر إرسال الطلب، حاول مرة أخرى.', time:now()}])
    } catch {
      setMsgs(m=>[...m, {role:'ai', text:'تعذّر إرسال الطلب، تأكد من اتصالك بالإنترنت.', time:now()}])
    }
    setTicketBusy(false)
  }

  // shown = نص الاقتراح القصير اللي يطلع بفقاعة المستخدم (والسؤال الكامل يروح للمساعد)
  async function send(text?:string, shown?:string) {
    const msg = (text || input).trim()
    if(!msg || loading) return
    setInput('')
    const userMsg:Msg = {role:'user', text:shown || msg, time:now()}
    setMsgs(m=>[...m, userMsg])
    setLoading(true)

    // كشف طلب التواصل مع الدعم
    // طلب صريح لدعم بشري بس — كلمات عامة مثل «موظف» أو «واتساب» تروح للمساعد (أسئلة عن الموظفين والتقرير)
    const supportKeywords = ['الدعم الفني','مساعدة بشرية','أكلم الدعم','اكلم الدعم','تواصل مع الدعم','شكوى','مشكلة تقنية']
    if (supportKeywords.some(k => msg.includes(k))) {
      setMsgs(m=>[...m, {role:'ai', text:'أرسل طلبك لفريق الدعم الفني من الزر أدناه — يوصلهم سؤالك والمحادثة كاملة، ويصلك ردّهم في الإشعارات.', time:now(), kind:'support'}])
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
        body: JSON.stringify({message:msg, org_id, branch_id, lang: (()=>{ try { return localStorage.getItem('storely_lang')==='en'?'en':'ar' } catch { return 'ar' } })(), history: msgs.slice(1).slice(-6).map(m=>({role:m.role==='user'?'user':'assistant', text:m.text}))})
      })
      const data = await res.json()
      setMsgs(m=>[...m, {role:'ai', text:data.reply||data.error||'عذراً، حدث خطأ', time:now()}])
    } catch {
      setMsgs(m=>[...m, {role:'ai', text:'عذراً، حدث خطأ في الاتصال. تأكد من اتصالك بالإنترنت.', time:now()}])
    }
    setLoading(false)
    setTimeout(()=>inputRef.current?.focus(), 100)
  }

  // نقطة على زر المساعد: فيه شي يحتاج انتباهه (عجز ينتظر قراره، إقفال ناقص، اشتراك ينتهي...)
  const urgentSug = (sugs || []).find(s=>s.urgent && !asked.includes(s.id))
  // فقاعة من زر المساعد بأهم اقتراح (بدون فتح الشات) — مرة لكل اقتراح بالجلسة، وتختفي بعد 15 ثانية
  const [bubble, setBubble] = useState<Suggestion|null>(null)
  function dismissBubble(b: Suggestion|null = bubble) {
    if (b) { try { const seen = JSON.parse(sessionStorage.getItem(BUBBLE_SEEN)||'[]'); sessionStorage.setItem(BUBBLE_SEEN, JSON.stringify([...new Set([...seen, b.id])])) } catch {} }
    setBubble(null)
  }
  function openBubble(b: Suggestion) {
    dismissBubble(b)
    setOpen(true); setMinimized(false)
    setAsked(a=>[...a, b.id])
    send(b.prompt, b.label)
  }

  // زر المساعد: العميل يسحبه لأي مكان (يلتصق بأقرب طرف يمين/يسار) ويُحفظ مكانه بالجهاز
  const FAB_KEY = 'storely_ai_fab'
  const [fabPos, setFabPos] = useState<{ side:'left'|'right'; bottom:number }|null>(()=>{
    if(typeof window==='undefined') return null
    try { const v = JSON.parse(localStorage.getItem(FAB_KEY)||'null'); return v && (v.side==='left'||v.side==='right') && typeof v.bottom==='number' ? v : null } catch { return null }
  })
  const [drag, setDrag] = useState<{ x:number; y:number }|null>(null)
  // مكان الزر محفوظ بالجهاز: نرسمه بعد التحميل عشان ما يختلف عن نسخة الخادم
  const [mounted, setMounted] = useState(false)
  useEffect(()=>{ setMounted(true) },[])
  // زر «الدعم الفني» (القائمة الجانبية وأعلى الصفحة) يفتح المساعد على «أرسل طلبك للدعم» — بدل واتساب شخصي
  useEffect(()=>{
    const onSupport = () => {
      setOpen(true); setMinimized(false); setSupportTip(false)
      try { localStorage.setItem(SUPPORT_TIP_KEY,'1') } catch {}
      setMsgs(m=>{
        const base = m.length ? m : [{role:'ai' as const, text: hasAi===false ? WELCOME_BASIC : WELCOME_AI, time:now()}]
        return base[base.length-1]?.kind==='support' ? base : [...base, {role:'ai' as const, text:'اكتب سؤالك أو مشكلتك في الخانة تحت — أحاول أحلّها فوراً، وإذا ما انحلّت يظهر لك زر «إرسال للدعم الفني» ويوصلهم سؤالك والمحادثة كاملة.', time:now(), kind:'support' as const}]
      })
    }
    window.addEventListener('storely:support', onSupport)
    return ()=>window.removeEventListener('storely:support', onSupport)
  },[hasAi])
  // إعلان لمرة وحدة: الدعم الفني صار من المساعد
  const [supportTip, setSupportTip] = useState(false)
  useEffect(()=>{ try { if(!localStorage.getItem(SUPPORT_TIP_KEY)) setTimeout(()=>setSupportTip(true), 2500) } catch {} },[])
  const hideSupportTip = () => { setSupportTip(false); try { localStorage.setItem(SUPPORT_TIP_KEY,'1') } catch {} }
  // الفقاعة: أعلى اقتراح ما طلع قبل بهالجلسة، بعد ثانيتين من التحميل (وما تطلع مع إعلان الدعم ولا والشات مفتوح)
  useEffect(()=>{
    if (open || !mounted || supportTip || !sugs?.length) return
    let seen: string[] = []
    try { seen = JSON.parse(sessionStorage.getItem(BUBBLE_SEEN)||'[]') } catch {}
    const next = sugs.find(x=>!seen.includes(x.id) && !asked.includes(x.id))
    if (!next) return
    const t = setTimeout(()=>setBubble(next), 2500)
    return ()=>clearTimeout(t)
  },[sugs, open, mounted, supportTip])
  useEffect(()=>{
    if (!bubble) return
    const t = setTimeout(()=>dismissBubble(bubble), 15000)
    return ()=>clearTimeout(t)
  },[bubble])
  // فتح الشات = شاف الاقتراحات كلها بالترحيب: ما ترجع نفسها كفقاعة لما يقفله
  useEffect(()=>{
    if (!open) return
    setBubble(null)
    if (sugs?.length) { try { const seen = JSON.parse(sessionStorage.getItem(BUBBLE_SEEN)||'[]'); sessionStorage.setItem(BUBBLE_SEEN, JSON.stringify([...new Set([...seen, ...sugs.map(x=>x.id)])])) } catch {} }
  },[open, sugs])
  const dragRef = useRef<{ sx:number; sy:number; ox:number; oy:number; moved:boolean }|null>(null)
  const fabLimits = () => {
    const mobile = window.innerWidth < 768, size = mobile ? 46 : 50
    return { size, edge: mobile ? 14 : 24, minBottom: mobile ? 76 : 16, maxBottom: window.innerHeight - size - (mobile ? 72 : 80) }
  }
  const onFabDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    dragRef.current = { sx:e.clientX, sy:e.clientY, ox:e.clientX - r.left, oy:e.clientY - r.top, moved:false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onFabMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current; if(!d) return
    if(!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return
    d.moved = true
    const { size } = fabLimits()
    setDrag({ x: Math.min(Math.max(0, e.clientX - d.ox), window.innerWidth - size), y: Math.min(Math.max(0, e.clientY - d.oy), window.innerHeight - size) })
  }
  const onFabUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current; dragRef.current = null
    if(!d) return
    if(!d.moved) { setOpen(true); hideSupportTip(); return }
    const { size, minBottom, maxBottom } = fabLimits()
    const x = e.clientX - d.ox, y = e.clientY - d.oy
    const pos = { side: (x + size/2 < window.innerWidth/2 ? 'left' : 'right') as 'left'|'right', bottom: Math.round(Math.min(Math.max(minBottom, window.innerHeight - y - size), Math.max(minBottom, maxBottom))) }
    setFabPos(pos); setDrag(null)
    try { localStorage.setItem(FAB_KEY, JSON.stringify(pos)) } catch {}
  }
  const fabStyle = (): React.CSSProperties => {
    if(drag) return { left:drag.x, top:drag.y, transition:'none' }
    if(typeof window==='undefined') return { left:14, bottom:84 }
    const { edge, minBottom, maxBottom } = fabLimits()
    const side = fabPos?.side || 'left'
    const bottom = fabPos ? Math.min(Math.max(minBottom, fabPos.bottom), Math.max(minBottom, maxBottom)) : (window.innerWidth < 768 ? 84 : 24)
    return { [side]: edge, bottom } as React.CSSProperties
  }

  return (
    <>
      <style>{`
        @keyframes aiBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        @keyframes aiFadeUp{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ai-fab{display:flex;transition:transform .15s}
        /* على الكمبيوتر: النافذة بالزاوية السفلية بجهة زر المساعد (الزر مكانه يحدده العميل بالسحب) */
        @media(min-width:768px){.ai-fab{width:50px!important;height:50px!important}.ai-win{bottom:86px!important;left:24px!important;right:auto!important;width:400px;margin:0!important}.ai-win.ai-win-r{left:auto!important;right:24px!important}}
        .ai-fab:active{transform:none}
        .ai-win button:focus-visible{outline:2px solid ${C.primary};outline-offset:2px}.ai-win{animation:aiFadeUp .2s ease}
        .ai-input:focus{border-color:${C.primary};box-shadow:0 0 0 3px rgba(32,54,64,.14);outline:none}
        .quick-btn{transition:transform .15s,background-color .15s}
        .ai-win,.ai-bubble{--ai-orange:#C2410C;--ai-orange-bg:rgba(255,149,0,.13);--ai-hair:rgba(60,60,67,.16)}
        :root[data-theme="dark"] .ai-win,:root[data-theme="dark"] .ai-bubble{--ai-orange:#FF9F0A;--ai-orange-bg:rgba(255,159,10,.18);--ai-hair:rgba(84,84,88,.65)}
        .ai-row{transition:background-color .15s}
        .ai-row:hover:not(:disabled),.ai-row:focus-visible{background:var(--storely-fill)}
        .ai-chip{transition:background-color .15s,transform .1s}
        .ai-chip:hover{background:var(--storely-control-border)}
        .ai-chip:active,.ai-row:active{transform:scale(.98)}
        .ai-ic-btn{transition:background-color .15s}
        .ai-ic-btn:hover{background:var(--storely-control-border)}
        .ai-bubble button:focus-visible,.ai-win input:focus-visible{outline:2px solid ${C.primary};outline-offset:2px}
        @media (prefers-reduced-motion:reduce){.ai-win,.ai-bubble{animation:none!important}.ai-chip:active,.ai-row:active{transform:none}}
        .ai-chips::-webkit-scrollbar{display:none}
        .quick-btn:active{transform:scale(.95)}
        .send-btn{transition:all .2s}
        .send-btn:not(:disabled):active{transform:scale(.92)}
      `}</style>

      {/* FAB Button */}
      {!open && mounted && (
        <button className="ai-fab" onPointerDown={onFabDown} onPointerMove={onFabMove} onPointerUp={onFabUp} onPointerCancel={()=>{ dragRef.current=null; setDrag(null) }}
          onKeyDown={e=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); setOpen(true) } }}
          aria-label={urgentSug ? `المساعد — ${urgentSug.label}` : 'المساعد'} title={urgentSug ? `المساعد: ${urgentSug.label}` : 'المساعد — اسحبه لتغيير مكانه'} style={{position:'fixed',...fabStyle(),touchAction:'none',userSelect:'none' as const,zIndex:999,width:48,height:48,borderRadius:'50%',background:C.primary,color:'white',border:'none',boxShadow:'0 8px 24px rgba(32,54,64,.28), 0 1px 3px rgba(0,0,0,.12)',cursor:'pointer',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Bot size={22} strokeWidth={2} />
          {urgentSug&&<span aria-hidden style={{position:'absolute',top:0,right:0,width:13,height:13,borderRadius:'50%',background:'#FF3B30',border:'2px solid var(--storely-surface, #fff)'}}/>}
        </button>
      )}

      {/* إعلان الدعم الجديد — فوق زر المساعد، مرة وحدة */}
      {/* فقاعة اقتراح من زر المساعد: ضغطة تفتح الشات ويجاوب المساعد مباشرة */}
      {bubble && !open && mounted && !drag && !supportTip && (()=>{
        const fs = fabStyle() as any, side = fs.left !== undefined ? 'left' : 'right'
        const Icon = SUGGEST_ICON[bubble.icon] || Sparkles
        return (
          // مثل إشعارات الآيفون: اسم المساعد بالأعلى، والعنوان، وسطر يوضّح وش يصير لو ضغط
          <div className="ai-bubble" role="status" aria-live="polite" style={{position:'fixed', [side]: fs[side], bottom: (Number(fs.bottom)||24)+60, zIndex:999, width:300, maxWidth:'calc(100vw - 28px)', background:C.surface, borderRadius:20, boxShadow:'0 12px 40px rgba(0,0,0,.16), 0 0 0 .5px rgba(0,0,0,.08)', animation:'aiFadeUp .25s cubic-bezier(.22,1,.36,1)', direction:'rtl'}}>
            <button onClick={()=>openBubble(bubble)} aria-label={`${bubble.label}${bubble.count ? ` (${bubble.count})` : ''} — اضغط لأعرض لك التفاصيل`}
              style={{display:'block',width:'100%',padding:'12px 14px 13px',paddingInlineEnd:44,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'start',color:C.text}}>
              <span style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
                <span style={{width:20,height:20,borderRadius:6,background:C.primary,color:'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Bot size={13} strokeWidth={2.2}/></span>
                <span style={{fontSize:13,fontWeight:500,color:C.text3}}>المساعد</span>
                <span style={{fontSize:13,color:C.text3}}>الآن</span>
              </span>
              <span style={{display:'flex',alignItems:'center',gap:6,fontSize:16,fontWeight:600,lineHeight:1.45}}>
                <Icon size={16} strokeWidth={2.2} style={{color:bubble.urgent?'var(--ai-orange)':C.primary,flexShrink:0}}/>
                {bubble.label}{bubble.count ? ` (${bubble.count})` : ''}
              </span>
              <span style={{display:'block',fontSize:14,color:C.text3,marginTop:2}}>اضغط لأعرض لك التفاصيل</span>
            </button>
            <button className="ai-ic-btn" onClick={()=>dismissBubble(bubble)} aria-label="إخفاء الاقتراح"
              style={{position:'absolute',top:10,insetInlineEnd:10,width:26,height:26,borderRadius:'50%',border:'none',background:'var(--storely-fill)',color:C.text3,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <X size={14} strokeWidth={2.4}/>
            </button>
          </div>
        )
      })()}

      {supportTip && !open && mounted && !drag && (()=>{
        const fs = fabStyle() as any, side = fs.left !== undefined ? 'left' : 'right'
        return (
          <div role="status" style={{position:'fixed', [side]: fs[side], bottom: (Number(fs.bottom)||24)+58, zIndex:999, width:260, background:C.surface, border:`1px solid ${C.border}`, borderRadius:uiTokens.radius.card, boxShadow:'0 12px 32px rgba(32,54,64,.18)', padding:'12px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:uiTokens.typography.body,fontWeight:800,color:C.text,marginBottom:4}}><LifeBuoy size={16}/> جديد: الدعم الفني من هنا</div>
            <div style={{fontSize:uiTokens.typography.supporting,color:C.text3,lineHeight:1.8,marginBottom:10}}>اسأل المساعد عن أي شيء، وإذا ما انحلّت مشكلتك أرسلها للدعم الفني بضغطة — يوصلك الرد في الإشعارات.</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{ hideSupportTip(); window.dispatchEvent(new Event('storely:support')) }} style={{flex:1,padding:'7px 10px',background:C.primary,color:'white',border:'none',borderRadius:uiTokens.radius.control,fontSize:uiTokens.typography.supporting,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>جرّبه</button>
              <button onClick={hideSupportTip} style={{padding:'7px 10px',background:'none',color:C.text3,border:`1px solid ${C.border}`,borderRadius:uiTokens.radius.control,fontSize:uiTokens.typography.supporting,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>فهمت</button>
            </div>
          </div>
        )
      })()}

      {/* Chat Window */}
      {open && (
        <div className={`ai-win${fabPos?.side==='right'?' ai-win-r':''}`} style={{
          position:'fixed',
          bottom: minimized ? 86 : 86,
          left: 12, right: 12,
          zIndex:999,
          maxWidth:420,
          margin:'0 auto',
          background:C.surface,
          borderRadius:uiTokens.radius.panel,
          boxShadow:'0 24px 64px rgba(0,0,0,.18), 0 0 0 .5px rgba(0,0,0,.08)',
          border:'none',
          display:'flex',
          flexDirection:'column',
          height: minimized ? 'auto' : 'min(72dvh, 580px)',
          maxHeight: minimized ? 'auto' : 580,
          overflow:'hidden',
          fontFamily:uiTokens.typography.family,
          direction:'rtl',
        }}>

          {/* الرأس: أيقونة دائرية واسم المساعد، وزرّا تصغير وإغلاق رماديان مثل الآيفون */}
          <div style={{background:C.surface,borderBottom:'.5px solid var(--ai-hair)',padding:'12px 14px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:C.primary,color:'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Bot size={19} strokeWidth={2} />
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:17,fontWeight:600,color:C.text,lineHeight:1.3}}>المساعد</div>
              <div style={{fontSize:13,color:C.text3,lineHeight:1.4}}>يجيبك من بيانات منشأتك</div>
            </div>
            <button className="ai-ic-btn" onClick={()=>setMinimized(m=>!m)} aria-label={minimized?'توسيع':'تصغير'}
              style={{width:32,height:32,borderRadius:'50%',background:'var(--storely-fill)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.text3,flexShrink:0}}>
              {minimized?<ChevronUp size={17} strokeWidth={2.2}/>:<ChevronDown size={17} strokeWidth={2.2}/>}
            </button>
            <button className="ai-ic-btn" onClick={()=>setShowCloseConfirm(true)} aria-label="إغلاق المحادثة"
              style={{width:32,height:32,borderRadius:'50%',background:'var(--storely-fill)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.text3,flexShrink:0}}>
              <X size={16} strokeWidth={2.4}/>
            </button>
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
              <div style={{flex:1,overflowY:'auto',padding:'14px 14px 10px',display:'flex',flexDirection:'column',gap:8,background:C.surface}}>
                {msgs.map((m,i)=>(
                  <React.Fragment key={i}>
                    <MsgBubble msg={m}/>
                    {m.kind==='suggest' && !!m.sugs?.length && (
                      // قائمة مثل إعدادات الآيفون: أيقونة بدائرة ملوّنة، العنوان، العدد، وسهم
                      <div role="list" aria-label="مقترح لك الآن" style={{width:'100%',background:'var(--storely-background)',borderRadius:16,overflow:'hidden',margin:'2px 0 4px'}}>
                        {m.sugs.map((x,k)=>{
                          const Icon = SUGGEST_ICON[x.icon] || Sparkles, done = asked.includes(x.id)
                          return (
                            <button key={x.id} role="listitem" className="ai-row" disabled={loading} onClick={()=>{ setAsked(a=>[...a, x.id]); send(x.prompt, x.label) }}
                              style={{display:'flex',alignItems:'center',gap:12,width:'100%',minHeight:52,padding:'8px 14px',background:'transparent',border:'none',borderTop:k?'.5px solid var(--ai-hair)':'none',color:C.text,opacity:done?.5:1,cursor:loading?'default':'pointer',fontFamily:'inherit',textAlign:'start'}}>
                              <span style={{width:30,height:30,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:x.urgent?'var(--ai-orange-bg)':'rgba(32,54,64,.1)',color:x.urgent?'var(--ai-orange)':C.primary}}>
                                <Icon size={16} strokeWidth={2.2}/>
                              </span>
                              <span style={{flex:1,minWidth:0,fontSize:16,fontWeight:500}}>{x.label}</span>
                              {x.count!=null && x.count>0 && <span style={{fontSize:16,fontWeight:500,color:x.urgent?'var(--ai-orange)':C.text3,fontVariantNumeric:'tabular-nums'}}>{x.count}</span>}
                              <ChevronLeft size={17} strokeWidth={2.2} style={{color:'var(--storely-subtle, #8E8E93)',flexShrink:0}}/>
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {m.kind==='support' && msgs.some(x=>x.role==='user') && (
                      <button onClick={sendTicket} disabled={ticketBusy}
                        style={{alignSelf:'flex-end',display:'inline-flex',alignItems:'center',gap:6,padding:'9px 16px',background:C.primary,color:'white',border:'none',borderRadius:999,fontSize:uiTokens.typography.body,fontWeight:700,cursor:ticketBusy?'wait':'pointer',fontFamily:'inherit',opacity:ticketBusy?.7:1}}>
                        <Send size={15}/> {ticketBusy?'جاري الإرسال...':'إرسال للدعم الفني'}
                      </button>
                    )}
                    {i===msgs.length-1 && i>0 && m.role==='ai' && !m.kind && !loading && (
                      <button onClick={offerSupport}
                        style={{alignSelf:'flex-end',display:'inline-flex',alignItems:'center',gap:5,background:'none',border:'none',padding:'2px 4px',color:C.text3,fontSize:uiTokens.typography.supporting,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}>
                        <LifeBuoy size={13}/> ما انحلت مشكلتك؟ أرسلها للدعم الفني
                      </button>
                    )}
                  </React.Fragment>
                ))}
                {loading && (
                  <div style={{display:'flex',justifyContent:'flex-end'}} aria-label="المساعد يكتب">
                    <div style={{background:'var(--storely-fill, #E9E9EB)',padding:'12px 14px',borderRadius:20,borderBottomLeftRadius:6}}>
                      <TypingDots/>
                    </div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              {/* Timeout message */}
          {showTimeout && (
            <div style={{margin:'6px 12px',background:'var(--storely-background)',borderRadius:16,padding:'12px 14px',textAlign:'center'}}>
              <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:10}}>هل تريد مواصلة المحادثة؟</div>
              <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                <button onClick={continueChat} style={{padding:'8px 20px',background:C.primary,color:'white',border:'none',borderRadius:999,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>مواصلة</button>
                <button onClick={closeChat} style={{padding:'8px 20px',background:'var(--storely-fill)',color:uiTokens.color.danger,border:'none',borderRadius:999,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إغلاق</button>
              </div>
            </div>
          )}

          {/* اقتراحات (مثل Siri وGemini): من بيانات المنشأة الحين، وإلا الأسئلة الثابتة — ضغطة وحدة ترسل السؤال */}
              {(()=>{
                // الترحيب فيه الاقتراحات كأزرار: الصف يطلع بعد أول سؤال (اقتراحات متابعة)
                if (msgs.length===1 && msgs[0].kind==='suggest') return null
                const live = (sugs || []).filter(x=>!asked.includes(x.id))
                const fallback = msgs.length<=1 ? (hasAi===false ? QUICK_BASIC : QUICK_AI).map((q,k)=>({ id:`q${k}`, label:q.text, prompt:q.text })) : []
                const list: (Partial<Suggestion> & { id:string; label:string; prompt:string })[] = live.length ? live : (hasAi && sugs===null ? [] : fallback)
                if (!list.length || loading) return null
                return (
                  <div style={{padding:'8px 0 6px',background:C.surface,flexShrink:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:5,fontSize:13,fontWeight:500,color:C.text3,margin:'0 16px 6px'}}>
                      <Sparkles size={13} strokeWidth={2}/> {live.length ? 'مقترح لك الآن' : 'اقتراحات'}
                    </div>
                    <div className="ai-chips" style={{display:'flex',gap:8,overflowX:'auto',padding:'0 14px 2px',scrollbarWidth:'none' as const}}>
                      {list.map(x=>{
                        const Icon = x.icon ? SUGGEST_ICON[x.icon] : null
                        return (
                          <button key={x.id} className="ai-chip" onClick={()=>{ setAsked(a=>[...a, x.id]); send(x.prompt, x.label) }}
                            style={{display:'inline-flex',alignItems:'center',gap:6,flexShrink:0,minHeight:36,padding:'7px 14px',borderRadius:999,border:'none',background:x.urgent?'var(--ai-orange-bg)':'var(--storely-fill)',color:x.urgent?'var(--ai-orange)':C.text,fontSize:15,fontWeight:500,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const}}>
                            {Icon && <Icon size={15} strokeWidth={2.2}/>}
                            {x.label}
                            {x.count!=null && x.count>0 && <span style={{color:x.urgent?'var(--ai-orange)':C.text3,fontVariantNumeric:'tabular-nums'}}>{x.count}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

          {/* خانة الكتابة مثل الرسائل في الآيفون: كبسولة، وزر الإرسال دائرة كحلية بسهم */}
              <div style={{padding:'8px 12px 12px',background:C.surface,display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                <input ref={inputRef} className="ai-input" value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
                  placeholder="اسأل عن منشأتك…" aria-label="اكتب سؤالك" enterKeyHint="send"
                  style={{flex:1,minWidth:0,height:40,padding:'0 16px',border:'1px solid var(--storely-control-border)',borderRadius:999,fontSize:16,fontFamily:'inherit',color:C.text,background:C.surface,transition:'border-color .15s'}}/>
                <button className="send-btn" onClick={()=>send()} disabled={!input.trim()||loading} aria-label="إرسال"
                  style={{width:36,height:36,borderRadius:'50%',background:input.trim()&&!loading?C.primary:'var(--storely-fill)',color:input.trim()&&!loading?'white':'var(--storely-subtle, #8E8E93)',border:'none',cursor:input.trim()&&!loading?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <ArrowUp size={19} strokeWidth={2.6}/>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
