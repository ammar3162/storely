'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const C = {
  primary:'#16a34a', primaryD:'#15803d', primaryL:'#f0fdf4',
  danger:'#e24b4a', text:'#1c1c1a', text3:'#5f5e5a', text4:'#888780',
  bg:'#f5f5f4', border:'#ebebea',
}

export default function StaffLoginPage() {
  const [phone, setPhone] = useState('')
  const [pin, setPin]     = useState('')
  const [step, setStep]   = useState<'phone'|'pin'>('phone')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const router = useRouter()

  const [isPWA, setIsPWA] = useState(false)

  useEffect(()=>{
    const saved = localStorage.getItem('staff_session')
    if(saved) router.push('/staff/dispense')

    // كشف PWA
    const pwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
    setIsPWA(pwa)

    document.title = 'Storely — موظف'

    // manifest مخصص للموظف
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
    if (!manifestLink) {
      manifestLink = document.createElement('link')
      manifestLink.rel = 'manifest'
      document.head.appendChild(manifestLink)
    }
    manifestLink.href = '/staff-manifest.json'

    // وسوم iOS الإلزامية لوضع standalone
    function setMeta(name: string, content: string) {
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement
      if (!tag) {
        tag = document.createElement('meta')
        tag.name = name
        document.head.appendChild(tag)
      }
      tag.content = content
    }
    setMeta('apple-mobile-web-app-capable', 'yes')
    setMeta('mobile-web-app-capable', 'yes')
    setMeta('apple-mobile-web-app-title', 'Storely Staff')
    setMeta('apple-mobile-web-app-status-bar-style', 'default')
    setMeta('theme-color', '#16a34a')
  },[])

  function addDigit(d: string) {
    if(step==='phone'){
      if(phone.length<10) setPhone(p=>p+d)
    } else {
      if(pin.length<4) setPin(p=>p+d)
    }
    setError('')
  }

  function deleteDigit() {
    if(step==='phone') setPhone(p=>p.slice(0,-1))
    else setPin(p=>p.slice(0,-1))
    setError('')
  }

  function doShake() {
    setShake(true)
    setTimeout(()=>setShake(false),600)
  }

  async function handleLogin() {
    if(!phone||phone.length<10){setError('أدخل رقم الجوال');doShake();return}
    if(!pin||pin.length<4){setError('أدخل رمز PIN');doShake();return}
    setLoading(true)
    try {
      const res = await fetch('/api/staff-login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({phone:phone.trim(),pin:pin.trim()}),
      })
      const data = await res.json()
      if(!res.ok){
        setError(data.error||'رقم الجوال أو PIN غير صحيح')
        setPin('')
        doShake()
        setLoading(false)
        return
      }
      localStorage.setItem('staff_session',JSON.stringify(data.staff))
      router.push('/staff/dispense')
    } catch {
      setError('حدث خطأ — حاول مرة أخرى')
      setLoading(false)
    }
  }

  useEffect(()=>{
    if(step==='pin'&&pin.length===4) handleLogin()
  },[pin])

  // إذا مو PWA — أظهر نموذج بسيط
  if(!isPWA) return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f4',padding:20}}>
      <div style={{background:'white',borderRadius:16,padding:28,width:'100%',maxWidth:360,border:'1px solid #ebebea'}}>
        <div style={{fontSize:18,fontWeight:700,color:'#1c1c1a',marginBottom:4}}>دخول الموظف</div>
        <div style={{fontSize:12,color:'#888780',marginBottom:20}}>أدخل رقم جوالك ورمز PIN</div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:5}}>رقم الجوال</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="05xxxxxxxx"
            style={{width:'100%',padding:'10px 12px',border:'1px solid #e0e0dd',borderRadius:8,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box',direction:'ltr'}}/>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:5}}>رمز PIN</label>
          <input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="••••"
            style={{width:'100%',padding:'10px 12px',border:'1px solid #e0e0dd',borderRadius:8,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
        </div>
        {error&&<div style={{fontSize:12,color:'#e24b4a',marginBottom:10,fontWeight:600}}>{error}</div>}
        <button onClick={handleLogin} disabled={loading}
          style={{width:'100%',padding:'12px',background:'#16a34a',color:'white',border:'none',borderRadius:8,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          {loading?'جاري التحقق...':'دخول'}
        </button>
      </div>
    </div>
  )

  const digits = ['3','2','1','6','5','4','9','8','7','⌫','0','']
  const [time, setTime] = useState('')
  useEffect(()=>{
    const update = () => setTime(new Date().toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit',hour12:true}))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  const display = step==='phone' ? phone : pin.replace(/./g,'●')
  const placeholder = step==='phone' ? '05xxxxxxxx' : '● ● ● ●'
  const progress = step==='phone' ? phone.length/10 : pin.length/4

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',minHeight:'100vh',background:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 0 env(safe-area-inset-bottom)'}}>
      <style>{`
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .shake{animation:shake .5s ease}
        .fi{animation:fadeIn .3s ease}
        .dkey{width:72px;height:72px;border-radius:50%;border:none;background:#f5f5f4;font-size:24px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1c1c1a;transition:all .1s;-webkit-tap-highlight-color:transparent;font-family:inherit}
        .dkey:active{background:#e0e0dd;transform:scale(.93)}
        .dkey:disabled{opacity:.3;cursor:default}
      `}</style>

      {/* Logo */}
      <div style={{marginBottom:32,textAlign:'center'}}>
        <div style={{width:60,height:60,borderRadius:16,background:C.primary,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',boxShadow:`0 8px 24px ${C.primary}30`}}>
          <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
        <div style={{fontSize:18,fontWeight:700,color:C.text}}>Storely</div>
        <div style={{fontSize:12,color:C.text4,marginTop:2}}>بوابة الموظف</div>
      </div>

      {/* Time */}
      <div style={{fontSize:42,fontWeight:300,color:C.text,letterSpacing:2,marginBottom:8,fontVariantNumeric:'tabular-nums'}}>{time}</div>
      <div style={{fontSize:13,color:C.text4,marginBottom:24}}>{new Date().toLocaleDateString('ar-SA',{weekday:'long',day:'numeric',month:'long'})}</div>

      {/* Display */}
      <div className={shake?'shake':''} style={{width:260,marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:8,textAlign:'center',textTransform:'uppercase',letterSpacing:'.06em'}}>
          {step==='phone'?'رقم الجوال':'رمز PIN'}
        </div>
        <div style={{
          fontSize:step==='phone'?28:36,fontWeight:700,color:display?C.text:C.text4,
          textAlign:'center',letterSpacing:step==='pin'?12:2,
          height:52,display:'flex',alignItems:'center',justifyContent:'center',
          background:C.bg,borderRadius:12,border:`2px solid ${error?C.danger:C.border}`,
          transition:'border .2s',fontVariantNumeric:'tabular-nums',
        }}>
          {display||placeholder}
        </div>
        {/* Progress bar */}
        <div style={{height:3,background:C.border,borderRadius:99,overflow:'hidden',marginTop:8}}>
          <div style={{height:'100%',width:`${progress*100}%`,background:C.primary,borderRadius:99,transition:'width .15s'}}/>
        </div>
        {error&&<div style={{fontSize:12,color:C.danger,textAlign:'center',marginTop:8,fontWeight:600}}>{error}</div>}
      </div>

      {/* Step indicator */}
      <div style={{display:'flex',gap:6,marginBottom:28}}>
        {['phone','pin'].map((s,i)=>(
          <div key={i} style={{width:step===s?20:6,height:6,borderRadius:99,background:step===s?C.primary:C.border,transition:'all .3s'}}/>
        ))}
      </div>

      {/* Keypad */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,width:260,direction:'ltr'}}>
        {digits.map((d,i)=>(
          <button key={i} className="dkey"
            disabled={d===''||loading}
            onClick={()=>{
              if(d==='⌫') deleteDigit()
              else if(d&&d!=='⌫') addDigit(d)
            }}
            style={{
              margin:'0 auto',
              background:d==='⌫'?'#fef2f2':d===''?'transparent':'#f5f5f4',
              color:d==='⌫'?C.danger:C.text,
              fontSize:d==='⌫'?20:24,
              visibility:d===''?'hidden':'visible',
            }}>
            {d}
          </button>
        ))}
      </div>

      {/* Next / Login button */}
      <div style={{marginTop:28,width:260}}>
        {step==='phone'?(
          <button onClick={()=>{
            if(phone.length<10){setError('أدخل رقم الجوال كاملاً');doShake();return}
            setStep('pin');setError('')
          }} style={{width:'100%',padding:'14px',background:phone.length>=10?C.primary:'#e0e0dd',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:phone.length>=10?'pointer':'default',fontFamily:'inherit',transition:'all .2s'}}>
            التالي ←
          </button>
        ):(
          <button onClick={()=>{setStep('phone');setPin('');setError('')}}
            style={{width:'100%',padding:'12px',background:'transparent',color:C.text3,border:`1px solid ${C.border}`,borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
            ← تغيير رقم الجوال
          </button>
        )}
      </div>

      {loading&&(
        <div style={{position:'fixed',inset:0,background:'rgba(255,255,255,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{width:36,height:36,border:`3px solid ${C.primaryL}`,borderTopColor:C.primary,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  )
}
