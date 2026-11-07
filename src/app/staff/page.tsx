'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LanguageProvider, useTranslation } from '@/lib/i18n/LanguageContext'
import { Delete, ChevronDown } from 'lucide-react'
import { setStaffDevice } from '@/lib/inApp'

const COUNTRY_PHONE_LEN: {code:string;flag:string;name:string;key:string;len:number}[] = [
  {code:'966',flag:'🇸🇦',name:'السعودية',key:'countrySaudi',len:10},
  {code:'965',flag:'🇰🇼',name:'الكويت',key:'countryKuwait',len:8},
  {code:'971',flag:'🇦🇪',name:'الإمارات',key:'countryUAE',len:9},
  {code:'973',flag:'🇧🇭',name:'البحرين',key:'countryBahrain',len:8},
  {code:'974',flag:'🇶🇦',name:'قطر',key:'countryQatar',len:8},
  {code:'968',flag:'🇴🇲',name:'عُمان',key:'countryOman',len:8},
  {code:'20',flag:'🇪🇬',name:'مصر',key:'countryEgypt',len:10},
  {code:'962',flag:'🇯🇴',name:'الأردن',key:'countryJordan',len:9},
  {code:'other',flag:'🌍',name:'دولة أخرى',key:'countryOther',len:14},
]

function StaffLoginInner() {
  const { t, lang, setLang, dir } = useTranslation()
  const [phone, setPhone] = useState('')
  const [pin, setPin]     = useState('')
  const [step, setStep]   = useState<'phone'|'pin'>('phone')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [country, setCountry] = useState('السعودية')
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const router = useRouter()

  const selectedCountry = COUNTRY_PHONE_LEN.find(c=>c.name===country) || COUNTRY_PHONE_LEN[0]
  const requiredLen = selectedCountry.len

  useEffect(()=>{
    const saved = localStorage.getItem('staff_session')
    if(saved) { router.push('/staff/choose'); return }
    document.title = t('staffLogin.pageTitle')
  },[])

  function doShake() { setShake(true); setTimeout(()=>setShake(false), 500) }

  function pressPhoneKey(k: string) {
    if (k === '⌫') { setPhone(p=>p.slice(0,-1)); return }
    if (phone.length >= requiredLen) return
    setPhone(p=>(p+k).replace(/[^0-9]/g,''))
  }

  function pressPinKey(k: string) {
    if (k === '⌫') { setPin(p=>p.slice(0,-1)); return }
    if (pin.length >= 4) return
    setPin(p=>(p+k).replace(/[^0-9]/g,''))
  }

  function goToPin() {
    if (!phone || phone.length < requiredLen) { setError(t('staffLogin.errPhoneRequired')); doShake(); return }
    setError('')
    setStep('pin')
  }

  async function handleLogin() {
    if (!pin || pin.length < 4) { setError(t('staffLogin.errPinRequired')); doShake(); return }
    setLoading(true)
    setError('')
    const controller = new AbortController()
    const timeoutId = setTimeout(()=>controller.abort(), 15000)
    try {
      const res = await fetch('/api/staff-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), pin: pin.trim() }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('staffLogin.errWrongCreds'))
        setPin('')
        doShake()
        setLoading(false)
        return
      }
      localStorage.setItem('staff_session', JSON.stringify(data.staff))
      localStorage.setItem('staff_token', data.token)
      setLoading(false)
      router.push('/staff/choose')
    } catch (err: any) {
      clearTimeout(timeoutId)
      setError(err?.name === 'AbortError' ? t('staffLogin.errSlowConn') : t('staffLogin.errGeneric'))
      setPin('')
      setLoading(false)
    }
  }

  // نضغط تلقائياً "دخول" لما نكمل 4 أرقام على الأقل — بدون ضغط زر إضافي، تجربة أسرع
  useEffect(()=>{
    if (step === 'pin' && pin.length === 4 && !loading) handleLogin()
  },[pin])

  const keypadKeys = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  // عرض الرقم مقسّم لمجموعات (050 123 4567) — للقراءة فقط، القيمة المرسلة بدون مسافات
  const groupDigits = (d: string) => d.length <= 3 ? d : d.length <= 6 ? `${d.slice(0,3)} ${d.slice(3)}` : `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6)}`
  const phonePlaceholder = groupDigits((selectedCountry.code === '966' ? '05' : '') + 'X'.repeat(Math.max(requiredLen - (selectedCountry.code === '966' ? 2 : 0), 0)))

  const keyContent = (k: string) => k === '⌫' ? <Delete size={22} strokeWidth={1.75} /> : k

  return (
    <div style={{minHeight:'100vh',background:'#f4f5f6',display:'flex',flexDirection:'column' as const,alignItems:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:dir}}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-8px)}40%,60%{transform:translateX(8px)}}
        .shake{animation:shake .5s cubic-bezier(.36,.07,.19,.97) both}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .3s cubic-bezier(.22,1,.36,1) both}
        @keyframes dotPulse{0%,100%{opacity:.25;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}
        .kp-btn{transition:background-color .12s cubic-bezier(.22,1,.36,1), transform .08s ease}
        .kp-btn:active{transform:scale(.97);background:#eceef1 !important}
        @media(hover:hover){.kp-btn:hover{background:#f9fafb}}
        @media (prefers-reduced-motion:reduce){.fade-up,.shake{animation:none}}
      `}</style>

      <div style={{width:'100%',maxWidth:440,minHeight:'100vh',display:'flex',flexDirection:'column' as const,padding:'0 24px'}}>

        {/* شريط علوي: الشعار وزر اللغة */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:16}}>
          <img src="/storely-logo.png" alt="Storely" style={{width:40,height:40,objectFit:'contain',borderRadius:10,background:'white',padding:4,border:'1px solid #e5e7eb'}}/>
          <button onClick={()=>setLang(lang==='ar'?'en':'ar')} style={{background:'#eceef1',border:'none',borderRadius:10,height:36,padding:'0 12px',fontSize:13,fontWeight:500,color:'#111827',cursor:'pointer',fontFamily:'inherit'}}>
            {lang==='ar'?'English':'عربي'}
          </button>
        </div>

        {/* المحتوى الرئيسي — بدون بطاقة: العنوان والخطوات ثم الحقل ولوحة الأرقام */}
        <div style={{flex:1,display:'flex',flexDirection:'column' as const,justifyContent:'flex-start',paddingTop:'clamp(24px, 6vh, 48px)',paddingBottom:24}}>
         <div>
          <h1 style={{fontSize:26,fontWeight:600,lineHeight:'36px',color:'#111827',marginBottom:4}}>{t('staffLogin.title')}</h1>
          {/* الخطوات: رقم الجوال ← الرمز السري */}
          <div style={{display:'flex',alignItems:'center',gap:16,margin:'16px 0 20px',direction:dir}}>
            {[t('staffLogin.stepPhone'),t('staffLogin.stepPin')].map((label,i)=>{
              const on = (step==='phone'?0:1) === i
              return (
                <span key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:on?500:400,color:on?'#111827':'#6b7487'}}>
                  <span style={{width:16,height:2,background:on?'#111827':'#d1d5db',transition:'background-color .2s'}}/>{label}
                </span>
              )
            })}
          </div>
          {step === 'phone' ? (
            <div key="phone-step" className="fade-up">
              <p style={{fontSize:15,color:'#4b5565',marginBottom:12}}>{t('staffLogin.subtitle')}</p>

              {/* حقل الجوال + اختيار الدولة */}
              <div style={{position:'relative' as const,marginBottom:24}}>
                <div className={shake?'shake':''} style={{display:'flex',alignItems:'center',background:'#ffffff',border:`1.5px solid ${shake?'#dc2626':'#111827'}`,borderRadius:12,padding:'2px 4px',minHeight:56}}>
                  <button onClick={()=>setShowCountryPicker(v=>!v)}
                    style={{background:'transparent',border:'none',color:'#4b5565',fontSize:15,fontWeight:500,padding:'12px 10px',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',whiteSpace:'nowrap' as const}}>
                    <span style={{fontSize:18}}>{selectedCountry.flag}</span>
                    <span style={{fontSize:14}}>+{selectedCountry.code}</span>
                    <ChevronDown size={14} style={{transform:showCountryPicker?'rotate(180deg)':'none',color:'#4b5565'}}/>
                  </button>
                  <div style={{width:1,height:24,background:'#e5e7eb'}}/>
                  <div style={{flex:1,padding:'12px 12px',fontSize:20,fontWeight:500,fontFamily:"'IBM Plex Mono',ui-monospace,monospace",color:'#111827',textAlign:'left' as const,direction:'ltr' as const,minHeight:24,letterSpacing:'1px'}}>
                    {phone ? groupDigits(phone) : <span style={{color:'#9ca3af',fontWeight:400}}>{phonePlaceholder}</span>}
                  </div>
                </div>

                {showCountryPicker && (
                  <div style={{position:'absolute' as const,top:'calc(100% + 8px)',right:0,left:0,background:'#ffffff',border:'1px solid #e5e7eb',borderRadius:14,padding:6,zIndex:20,maxHeight:260,overflowY:'auto' as const,boxShadow:'0 20px 50px -12px rgba(16,24,40,.25)'}}>
                    {COUNTRY_PHONE_LEN.map(c=>(
                      <button key={c.code} onClick={()=>{setCountry(c.name);setPhone('');setShowCountryPicker(false)}}
                        style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'11px 12px',background:country===c.name?'#e7f3f1':'transparent',border:'none',borderRadius:10,color:'#111827',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',textAlign:'right' as const}}>
                        <span style={{fontSize:18}}>{c.flag}</span>
                        <span style={{flex:1}}>{t('staffLogin.'+c.key)}</span>
                        <span style={{color:'#4b5565',fontSize:12,direction:'ltr' as const}}>+{c.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && <div style={{color:'#dc2626',fontSize:14,marginBottom:16}}>{error}</div>}

              {/* لوحة أرقام مخصصة لإدخال الجوال */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16,direction:'ltr' as const}}>
                {keypadKeys.map((k,i)=> k==='' ? <div key={i}/> : (
                  <button key={i} className="kp-btn" onClick={()=>pressPhoneKey(k)}
                    style={{height:56,borderRadius:12,border:k==='⌫'?'none':'1px solid #e5e7eb',background:k==='⌫'?'transparent':'#ffffff',fontSize:22,fontWeight:500,fontFamily:"'IBM Plex Mono',ui-monospace,monospace",color:k==='⌫'?'#4b5565':'#111827',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {keyContent(k)}
                  </button>
                ))}
              </div>

              <button onClick={goToPin} disabled={phone.length<requiredLen}
                style={{width:'100%',height:48,marginBottom:16,background:phone.length>=requiredLen?'#0f766e':'#eceef1',color:phone.length>=requiredLen?'#ffffff':'#6b7487',border:'none',borderRadius:10,fontSize:16,fontWeight:600,cursor:phone.length>=requiredLen?'pointer':'not-allowed',fontFamily:'inherit',transition:'background .15s, color .15s'}}>
                {t('staffLogin.continueBtn')}
              </button>
              <div style={{textAlign:'center' as const}}>
                <button onClick={()=>{setStaffDevice(false);window.location.href='/login'}}
                  style={{background:'none',border:'none',color:'#4b5565',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>
                  صاحب المنشأة؟ <span style={{color:'#0b5d56',fontWeight:500}}>دخول بالإيميل</span>
                </button>
              </div>
            </div>
          ) : (
            <div key="pin-step" className="fade-up">
              <button onClick={()=>{setStep('phone');setPin('');setError('')}}
                style={{background:'none',border:'none',color:'#0b5d56',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',marginBottom:12,display:'flex',alignItems:'center',gap:4,padding:0}}>
                {t('staffLogin.changeNumber')}
              </button>

              <p style={{fontSize:15,color:'#4b5565',marginBottom:4}}>{t('staffLogin.enterPin')}</p>
              <p style={{fontSize:16,color:'#111827',marginBottom:24,direction:'ltr' as const,textAlign:dir==='rtl'?'right':'left',fontFamily:"'IBM Plex Mono',ui-monospace,monospace"}}>+{selectedCountry.code} {groupDigits(phone)}</p>

              {/* نقاط عرض PIN */}
              <div className={shake?'shake':''} style={{display:'flex',justifyContent:'center',gap:14,marginBottom:32,direction:'ltr' as const}}>
                {[0,1,2,3].map(i=>(
                  <div key={i} style={{
                    width:14,height:14,borderRadius:'50%',
                    background: i<pin.length ? '#111827' : '#ffffff',
                    border: i<pin.length ? 'none' : '1.5px solid #d1d5db',
                    animation: loading && i<pin.length ? 'dotPulse 1s ease infinite' : 'none',
                    animationDelay: `${i*0.08}s`,
                    transition:'all .15s',
                  }}/>
                ))}
              </div>

              {error && <div style={{textAlign:'center' as const,color:'#dc2626',fontSize:14,marginBottom:20}}>{error}</div>}
              {loading && <div style={{textAlign:'center' as const,color:'#4b5565',fontSize:13,marginBottom:20}}>{t('staffLogin.verifying')}</div>}

              {/* لوحة أرقام PIN */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:24,direction:'ltr' as const}}>
                {keypadKeys.map((k,i)=> k==='' ? <div key={i}/> : (
                  <button key={i} className="kp-btn" disabled={loading} onClick={()=>pressPinKey(k)}
                    style={{height:56,borderRadius:12,border:k==='⌫'?'none':'1px solid #e5e7eb',background:k==='⌫'?'transparent':'#ffffff',fontSize:22,fontWeight:500,fontFamily:"'IBM Plex Mono',ui-monospace,monospace",color:k==='⌫'?'#4b5565':'#111827',cursor:loading?'default':'pointer',opacity:loading?.5:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {keyContent(k)}
                  </button>
                ))}
              </div>

              <div style={{textAlign:'center' as const}}>
                <span style={{fontSize:13,color:'#4b5565'}}>{t('staffLogin.forgotPin')}</span>
              </div>
            </div>
          )}
         </div>

        </div>
      </div>
    </div>
  )
}

export default function StaffLoginPage() {
  return <LanguageProvider><StaffLoginInner/></LanguageProvider>
}
