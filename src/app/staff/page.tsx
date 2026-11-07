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

  const keyContent = (k: string) => k === '⌫' ? <Delete size={22} strokeWidth={2} /> : k

  return (
    <div style={{minHeight:'100vh',background:'#F6F7F9',display:'flex',flexDirection:'column' as const,alignItems:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:dir}}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-8px)}40%,60%{transform:translateX(8px)}}
        .shake{animation:shake .5s cubic-bezier(.36,.07,.19,.97) both}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .35s ease both}
        @keyframes dotPulse{0%,100%{opacity:.25;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}
        .kp-btn{transition:background .12s ease, transform .08s ease}
        .kp-btn:active{transform:scale(.94);background:#E6F4F2 !important}
        .kp-btn:hover{background:#F6F7F9}
      `}</style>

      <div style={{width:'100%',maxWidth:440,minHeight:'100vh',display:'flex',flexDirection:'column' as const,padding:'0 24px'}}>

        {/* شريط علوي: زر اللغة بالزاوية */}
        <div style={{display:'flex',justifyContent:'flex-end',paddingTop:16}}>
          <button onClick={()=>setLang(lang==='ar'?'en':'ar')} style={{background:'#ffffff',border:'1px solid #E6E8EC',borderRadius:10,padding:'7px 14px',fontSize:13,fontWeight:700,color:'#101828',cursor:'pointer',fontFamily:'inherit'}}>
            {lang==='ar'?'English':'عربي'}
          </button>
        </div>

        {/* الشعار — الصورة فيها اسم Storely أصلاً، فما نكرره */}
        <div style={{display:'flex',justifyContent:'center',paddingTop:'clamp(8px, 3vh, 28px)',paddingBottom:20}}>
          <img src="/storely-logo.png" alt="Storely" style={{width:64,height:64,objectFit:'contain',borderRadius:16,background:'white',padding:6,border:'1px solid #E6E8EC',boxShadow:'0 4px 14px -6px rgba(16,24,40,.15)'}}/>
        </div>

        {/* المحتوى الرئيسي */}
        <div style={{flex:1,display:'flex',flexDirection:'column' as const,justifyContent:'flex-start'}}>
         <div style={{background:'#ffffff',border:'1px solid #E6E8EC',borderRadius:20,padding:'24px 20px',boxShadow:'0 10px 30px -18px rgba(16,24,40,.25)'}}>
          {/* الخطوات: رقم الجوال ← الرمز السري */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20,direction:dir}}>
            {[t('staffLogin.stepPhone'),t('staffLogin.stepPin')].map((label,i)=>{
              const on = (step==='phone'?0:1) >= i
              return (
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column' as const,gap:6}}>
                  <div style={{height:4,borderRadius:99,background:on?'#0f766e':'#E6E8EC',transition:'background .2s'}}/>
                  <span style={{fontSize:12,fontWeight:700,color:on?'#0f766e':'#667085'}}>{i+1}. {label}</span>
                </div>
              )
            })}
          </div>

          {step === 'phone' ? (
            <div key="phone-step" className="fade-up">
              <h1 style={{fontSize:'clamp(22px,5vw,26px)',fontWeight:800,color:'#101828',marginBottom:6,textAlign:'center' as const}}>{t('staffLogin.welcome')}</h1>
              <p style={{fontSize:15,color:'#475569',marginBottom:24,textAlign:'center' as const}}>{t('staffLogin.subtitle')}</p>

              {/* حقل الجوال + اختيار الدولة */}
              <div style={{position:'relative' as const,marginBottom:24}}>
                <div className={shake?'shake':''} style={{display:'flex',alignItems:'center',background:'#F6F7F9',border:`1.5px solid ${shake?'#f87171':'#D5D9DF'}`,borderRadius:16,padding:'4px'}}>
                  <button onClick={()=>setShowCountryPicker(v=>!v)}
                    style={{background:'transparent',border:'none',color:'#101828',fontSize:15,fontWeight:700,padding:'12px 10px',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',whiteSpace:'nowrap' as const}}>
                    <span style={{fontSize:18}}>{selectedCountry.flag}</span>
                    <span style={{fontSize:14}}>+{selectedCountry.code}</span>
                    <ChevronDown size={14} style={{transform:showCountryPicker?'rotate(180deg)':'none',color:'#475569'}}/>
                  </button>
                  <div style={{width:1,height:24,background:'#D5D9DF'}}/>
                  <div style={{flex:1,padding:'12px 14px',fontSize:20,fontWeight:700,color:'#101828',textAlign:'left' as const,direction:'ltr' as const,minHeight:24,letterSpacing:'1px'}}>
                    {phone ? groupDigits(phone) : <span style={{color:'#98A2B3',fontWeight:500}}>{phonePlaceholder}</span>}
                  </div>
                </div>

                {showCountryPicker && (
                  <div style={{position:'absolute' as const,top:'calc(100% + 8px)',right:0,left:0,background:'#ffffff',border:'1px solid #E6E8EC',borderRadius:14,padding:6,zIndex:20,maxHeight:260,overflowY:'auto' as const,boxShadow:'0 20px 50px -12px rgba(16,24,40,.25)'}}>
                    {COUNTRY_PHONE_LEN.map(c=>(
                      <button key={c.code} onClick={()=>{setCountry(c.name);setPhone('');setShowCountryPicker(false)}}
                        style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'11px 12px',background:country===c.name?'#E6F4F2':'transparent',border:'none',borderRadius:10,color:'#101828',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',textAlign:'right' as const}}>
                        <span style={{fontSize:18}}>{c.flag}</span>
                        <span style={{flex:1}}>{t('staffLogin.'+c.key)}</span>
                        <span style={{color:'#475569',fontSize:12,direction:'ltr' as const}}>+{c.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && <div style={{textAlign:'center' as const,color:'#dc2626',fontSize:14,fontWeight:700,marginBottom:16}}>{error}</div>}

              {/* لوحة أرقام مخصصة لإدخال الجوال */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20,direction:'ltr' as const}}>
                {keypadKeys.map((k,i)=> k==='' ? <div key={i}/> : (
                  <button key={i} className="kp-btn" onClick={()=>pressPhoneKey(k)}
                    style={{padding:'15px 0',borderRadius:14,border:'1px solid #E6E8EC',background:'#ffffff',fontSize:22,fontWeight:700,color:k==='⌫'?'#475569':'#101828',boxShadow:'0 1px 2px rgba(16,24,40,.05)',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {keyContent(k)}
                  </button>
                ))}
              </div>

              <button onClick={goToPin} disabled={phone.length<requiredLen}
                style={{width:'100%',padding:16,marginBottom:16,background:phone.length>=requiredLen?'#0f766e':'#E6E8EC',color:phone.length>=requiredLen?'#ffffff':'#667085',border:'none',borderRadius:14,fontSize:16,fontWeight:700,cursor:phone.length>=requiredLen?'pointer':'not-allowed',fontFamily:'inherit',transition:'background .15s, color .15s'}}>
                {t('staffLogin.continueBtn')}
              </button>
              <div style={{textAlign:'center' as const}}>
                <button onClick={()=>{setStaffDevice(false);window.location.href='/login'}}
                  style={{background:'none',border:'none',color:'#0f766e',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  صاحب المنشأة؟ دخول بالإيميل
                </button>
              </div>
            </div>
          ) : (
            <div key="pin-step" className="fade-up">
              <button onClick={()=>{setStep('phone');setPin('');setError('')}}
                style={{background:'none',border:'none',color:'#0f766e',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:16,display:'flex',alignItems:'center',gap:4}}>
                {t('staffLogin.changeNumber')}
              </button>

              <h1 style={{fontSize:'clamp(20px,5vw,24px)',fontWeight:800,color:'#101828',marginBottom:6,textAlign:'center' as const}}>{t('staffLogin.enterPin')}</h1>
              <p style={{fontSize:15,color:'#475569',marginBottom:24,textAlign:'center' as const,direction:'ltr' as const}}>+{selectedCountry.code} {groupDigits(phone)}</p>

              {/* نقاط عرض PIN */}
              <div className={shake?'shake':''} style={{display:'flex',justifyContent:'center',gap:14,marginBottom:32,direction:'ltr' as const}}>
                {[0,1,2,3].map(i=>(
                  <div key={i} style={{
                    width:14,height:14,borderRadius:'50%',
                    background: i<pin.length ? '#0f766e' : '#ffffff',
                    border: i<pin.length ? 'none' : '1.5px solid #D5D9DF',
                    animation: loading && i<pin.length ? 'dotPulse 1s ease infinite' : 'none',
                    animationDelay: `${i*0.08}s`,
                    transition:'all .15s',
                  }}/>
                ))}
              </div>

              {error && <div style={{textAlign:'center' as const,color:'#dc2626',fontSize:14,fontWeight:700,marginBottom:20}}>{error}</div>}
              {loading && <div style={{textAlign:'center' as const,color:'#475569',fontSize:13,marginBottom:20}}>{t('staffLogin.verifying')}</div>}

              {/* لوحة أرقام PIN */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:24,direction:'ltr' as const}}>
                {keypadKeys.map((k,i)=> k==='' ? <div key={i}/> : (
                  <button key={i} className="kp-btn" disabled={loading} onClick={()=>pressPinKey(k)}
                    style={{padding:'16px 0',borderRadius:14,border:'1px solid #E6E8EC',background:'#ffffff',fontSize:22,fontWeight:700,color:k==='⌫'?'#475569':'#101828',boxShadow:'0 1px 2px rgba(16,24,40,.05)',cursor:loading?'default':'pointer',fontFamily:'inherit',opacity:loading?.5:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {keyContent(k)}
                  </button>
                ))}
              </div>

              <div style={{textAlign:'center' as const}}>
                <span style={{fontSize:13,color:'#475569'}}>{t('staffLogin.forgotPin')}</span>
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
