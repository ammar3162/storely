'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string; role?: string
}

interface Purchase { amount: string; reason: string }

const STEPS = [
  { key: 1, label: 'البيانات' },
  { key: 2, label: 'المصاريف' },
  { key: 3, label: 'الصور' },
  { key: 4, label: 'المراجعة' },
]

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function MoneyInput({ value, onChange, placeholder, icon, iconBg, iconColor, error }: any) {
  return (
    <div>
      <div style={{position:'relative'}}>
        <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',width:30,height:30,borderRadius:9,background:iconBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>
          {icon}
        </div>
        <input type="number" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{width:'100%',padding:'14px 54px 14px 46px',border:`1.5px solid ${error?'#dc2626':'#e5e5e2'}`,borderRadius:12,fontSize:16,fontWeight:700,fontFamily:'inherit',outline:'none',boxSizing:'border-box',direction:'ltr',textAlign:'right',color:'#1c1c1a',transition:'border-color .15s',background:error?'#fef7f7':'white'}}
          onFocus={e=>{if(!error)e.target.style.borderColor=iconColor}}
          onBlur={e=>{if(!error)e.target.style.borderColor='#e5e5e2'}}
        />
        <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:11,fontWeight:700,color:'#a8a7a1'}}>ر.س</span>
      </div>
      {error && <div style={{fontSize:11,color:'#dc2626',fontWeight:700,marginTop:6,display:'flex',alignItems:'center',gap:4}}>⚠️ {error}</div>}
    </div>
  )
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{display:'flex',alignItems:'center',marginBottom:26}}>
      {STEPS.map((s, i) => (
        <div key={s.key} style={{display:'flex',alignItems:'center',flex:i<STEPS.length-1?1:'unset'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
            <div style={{
              width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:13,fontWeight:800,transition:'all .2s',
              background: step>s.key ? '#16a34a' : step===s.key ? '#16a34a' : '#e5e5e2',
              color: step>=s.key ? 'white' : '#a8a7a1',
              boxShadow: step===s.key ? '0 0 0 4px #dcfce7' : 'none',
            }}>
              {step>s.key ? '✓' : s.key}
            </div>
            <span style={{fontSize:10,fontWeight:700,color: step>=s.key ? '#1c1c1a' : '#a8a7a1',whiteSpace:'nowrap'}}>{s.label}</span>
          </div>
          {i<STEPS.length-1 && (
            <div style={{flex:1,height:2,background: step>s.key ? '#16a34a' : '#e5e5e2',margin:'0 6px 18px',transition:'background .3s'}}/>
          )}
        </div>
      ))}
    </div>
  )
}

export default function CashierClosingPage() {
  const [session, setSession] = useState<StaffSession|null>(null)
  const [orgLogo, setOrgLogo] = useState<string|null>(null)
  const [step, setStep] = useState(1)
    const [totalSales, setTotalSales] = useState('')
  const [madaAmount, setMadaAmount] = useState('')
  const [visaAmount, setVisaAmount] = useState('')
  const [mastercardAmount, setMastercardAmount] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [hasPurchases, setHasPurchases] = useState<'yes'|'no'|null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([{amount:'',reason:''}])
  const [networkImage, setNetworkImage] = useState('')
  const [salesImage, setSalesImage] = useState('')
  const [uploadingNetwork, setUploadingNetwork] = useState(false)
  const [uploadingSales, setUploadingSales] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState<{msg:string,type:'success'|'error'}|null>(null)
  const router = useRouter()
  const sb = createClient()

  useEffect(()=>{
    const savedSession = localStorage.getItem('staff_session')
    if(!savedSession){router.push('/staff');return}
    const s = JSON.parse(savedSession) as StaffSession
    if(s.role !== 'cashier'){router.push('/staff/dispense');return}
    setSession(s)
    sb.from('organizations' as any).select('logo_url').eq('id',s.org_id).single()
      .then(({data}:any)=>{ if(data?.logo_url) setOrgLogo(data.logo_url) })
  },[])

  useEffect(()=>{
    async function checkStillActive() {
      const saved = localStorage.getItem('staff_session')
      if(!saved) return
      const s = JSON.parse(saved)
      try {
        const res = await fetch('/api/staff-permissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({staff_id:s.id})})
        if(res.ok){
          const data = await res.json()
          if(data.deleted){
            localStorage.removeItem('staff_session')
            router.push('/staff')
          }
        }
      } catch {}
    }
    checkStillActive()
    const interval = setInterval(checkStillActive, 5000)
    return ()=>clearInterval(interval)
  },[])

  function logout() { localStorage.removeItem('staff_session'); router.push('/staff') }

  function showToast(msg:string, type:'success'|'error'='success') {
    setToast({msg,type})
    setTimeout(()=>setToast(null),3000)
  }

  async function uploadImage(file: File, kind: 'network'|'sales') {
    if(!session) return
    kind==='network'?setUploadingNetwork(true):setUploadingSales(true)
    const ext = file.name.split('.').pop()
    const path = `cashier-closings/${session.org_id}-${kind}-${Date.now()}.${ext}`
    const { error } = await sb.storage.from('invoices').upload(path, file, { upsert: true })
    if(error){ showToast('فشل رفع الصورة','error'); kind==='network'?setUploadingNetwork(false):setUploadingSales(false); return }
    const { data: { publicUrl } } = sb.storage.from('invoices').getPublicUrl(path)
    if(kind==='network') setNetworkImage(publicUrl)
    else setSalesImage(publicUrl)
    kind==='network'?setUploadingNetwork(false):setUploadingSales(false)
    showToast('تم رفع الصورة ✓')
  }

  function addPurchaseRow() { setPurchases(prev=>[...prev,{amount:'',reason:''}]) }
  function removePurchaseRow(idx:number) { setPurchases(prev=>prev.filter((_,i)=>i!==idx)) }
  function updatePurchase(idx:number, field:'amount'|'reason', value:string) {
    setPurchases(prev=>prev.map((p,i)=>i===idx?{...p,[field]:value}:p))
  }

  // حسابات مباشرة (معاينة حية)
  const sales = Number(totalSales)||0
  const mada = Number(madaAmount)||0
  const visa = Number(visaAmount)||0
  const mastercard = Number(mastercardAmount)||0
  const network = mada + visa + mastercard
  const cash = Number(cashAmount)||0
  const anyNetworkEntered = !!(madaAmount || visaAmount || mastercardAmount)
  const networkError = (totalSales && anyNetworkEntered && network > sales) ? 'إجمالي الشبكة أكبر من إجمالي المبيعات — راجع الأرقام' : ''
  const validPurchasesNow = hasPurchases==='yes' ? purchases.filter(p=>Number(p.amount)>0) : []
  const totalPurchasesNow = validPurchasesNow.reduce((sum,p)=>sum+(Number(p.amount)||0),0)
  const expectedCash = sales - network
  const cashAfterWithdrawal = cash - totalPurchasesNow
  const difference = cashAfterWithdrawal - expectedCash
  const status = Math.abs(difference)<0.01 ? 'balanced' : (difference<0 ? 'deficit' : 'surplus')

  const step1Valid = !!totalSales && !!cashAmount && anyNetworkEntered && !networkError
  const step2Valid = hasPurchases!==null
  const step3Valid = !!salesImage && !!networkImage

  function goNext() {
    if(step===1 && !step1Valid){
      showToast(networkError || 'أدخل إجمالي المبيعات والشبكة والكاش','error')
      return
    }
    if(step===2 && !step2Valid){
      showToast('حدد هل فيه مبالغ مسحوبة أم لا','error')
      return
    }
    if(step===3 && !step3Valid){
      showToast('يرجى رفع صورتي تقرير المبيعات وموازنة الشبكة','error')
      return
    }
    setStep(s=>Math.min(4,s+1))
  }
  function goBack() { setStep(s=>Math.max(1,s-1)) }

  async function saveClosing() {
    if(!session) return
    setSubmitting(true)
    try {
      const validPurchases = validPurchasesNow.map(p=>({amount:Number(p.amount),reason:p.reason||'بدون سبب'}))
      const res = await fetch('/api/cashier-closing',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          org_id: session.org_id, branch_id: session.branch_id,
          staff_id: session.id, staff_name: session.name,
          total_sales: sales, network_amount: network,
          mada_amount: mada, visa_amount: visa, mastercard_amount: mastercard,
          cash_amount: cash, purchases: validPurchases,
          network_image: networkImage, sales_image: salesImage,
        })
      })
      if(!res.ok){ showToast('حدث خطأ أثناء الحفظ','error'); setSubmitting(false); return }
      setSaved(true)
      showToast('✅ تم حفظ تقرير الإقفال')
    } catch {
      showToast('حدث خطأ، حاول مرة أخرى','error')
    }
    setSubmitting(false)
  }

  function resetForm() {
    setTotalSales(''); setMadaAmount(''); setVisaAmount(''); setMastercardAmount(''); setCashAmount('')
    setHasPurchases(null); setPurchases([{amount:'',reason:''}])
    setNetworkImage(''); setSalesImage('')
    setStep(1); setSaved(false)
  }

  if(!session) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f4',fontFamily:"'IBM Plex Sans Arabic',system-ui"}}>
      <div style={{width:32,height:32,border:'3px solid #e5e5e2',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f7f7f5',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',paddingBottom:50}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}} .fu{animation:fadeUp .3s ease both}`}</style>

      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:toast.type==='success'?'#16a34a':'#dc2626',color:'white',padding:'12px 24px',borderRadius:40,fontSize:14,fontWeight:700,boxShadow:'0 8px 24px rgba(0,0,0,.25)',whiteSpace:'nowrap'}}>
          {toast.msg}
        </div>
      )}

      <div style={{background:'linear-gradient(135deg,#0d2818,#1a4731)',padding:'16px 20px',position:'sticky',top:0,zIndex:100,boxShadow:'0 4px 20px rgba(0,0,0,.2)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {orgLogo ? (
            <img src={orgLogo} alt="" style={{width:42,height:42,borderRadius:12,objectFit:'cover',border:'2px solid rgba(255,255,255,.2)'}}/>
          ) : (
            <div style={{width:42,height:42,borderRadius:12,background:'rgba(255,255,255,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:19}}>💰</div>
          )}
          <div>
            <div style={{fontSize:15,fontWeight:800,color:'white'}}>{session.name}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.55)',marginTop:2,display:'flex',alignItems:'center',gap:5}}>
              <span>{session.org_name}{session.branch_name?` · ${session.branch_name}`:''}</span>
              <span style={{background:'rgba(255,255,255,.15)',padding:'1px 8px',borderRadius:20,fontWeight:700,fontSize:10}}>كاشير</span>
            </div>
          </div>
        </div>
        <button onClick={logout} style={{background:'rgba(255,255,255,.1)',color:'white',border:'1px solid rgba(255,255,255,.2)',borderRadius:10,padding:'8px 16px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          خروج
        </button>
      </div>

      <div style={{maxWidth:520,margin:'0 auto',padding:'28px 16px'}}>
        {!saved && (
          <div className="fu" style={{marginBottom:6}}>
            <div style={{fontSize:22,fontWeight:800,color:'#1c1c1a',marginBottom:4}}>إقفال الكاشير اليومي</div>
            <div style={{fontSize:13,color:'#8b8a84',fontWeight:600,marginBottom:22}}>{new Date().toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
            <ProgressBar step={step}/>
          </div>
        )}

        {saved ? (
          <div className="fu" style={{background:'white',borderRadius:20,padding:36,textAlign:'center',boxShadow:'0 4px 24px rgba(0,0,0,.06)',border:'1px solid #eeeeeb'}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,margin:'0 auto 16px'}}>✅</div>
            <div style={{fontSize:18,fontWeight:800,color:'#1c1c1a',marginBottom:6}}>تم حفظ تقرير الإقفال بنجاح</div>
            <div style={{fontSize:13,color:'#8b8a84',marginBottom:24}}>يمكن للمالك مراجعة التقرير من صفحة التقارير</div>
            <button onClick={resetForm} style={{padding:'13px 28px',background:'#16a34a',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(22,163,74,.3)'}}>
              إقفال جديد
            </button>
          </div>
        ) : (
          <>
            {/* خطوة 1: البيانات */}
            {step===1 && (
              <div className="fu" style={{background:'white',borderRadius:18,padding:22,marginBottom:16,boxShadow:'0 2px 16px rgba(0,0,0,.05)',border:'1px solid #eeeeeb'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#1c1c1a',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:24,height:24,borderRadius:7,background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>📊</span>
                  بيانات اليوم
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:12,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:7}}>إجمالي المبيعات (النظام)</label>
                  <MoneyInput value={totalSales} onChange={setTotalSales} placeholder="0.00" icon="📊" iconBg="#f0fdf4" iconColor="#16a34a"/>
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:12,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:7}}>الشبكة — حسب تقرير جهاز مدى</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:'#8b8a84',marginBottom:5,textAlign:'center' as const}}>مدى</div>
                      <input type="number" value={madaAmount} onChange={e=>setMadaAmount(e.target.value)} placeholder="0.00"
                        style={{width:'100%',padding:'11px 8px',border:`1.5px solid ${networkError?'#dc2626':'#e5e5e2'}`,borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'inherit',outline:'none',boxSizing:'border-box',direction:'ltr',textAlign:'center' as const,background:networkError?'#fef7f7':'white'}}/>
                    </div>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:'#8b8a84',marginBottom:5,textAlign:'center' as const}}>فيزا</div>
                      <input type="number" value={visaAmount} onChange={e=>setVisaAmount(e.target.value)} placeholder="0.00"
                        style={{width:'100%',padding:'11px 8px',border:`1.5px solid ${networkError?'#dc2626':'#e5e5e2'}`,borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'inherit',outline:'none',boxSizing:'border-box',direction:'ltr',textAlign:'center' as const,background:networkError?'#fef7f7':'white'}}/>
                    </div>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:'#8b8a84',marginBottom:5,textAlign:'center' as const}}>ماستركارد</div>
                      <input type="number" value={mastercardAmount} onChange={e=>setMastercardAmount(e.target.value)} placeholder="0.00"
                        style={{width:'100%',padding:'11px 8px',border:`1.5px solid ${networkError?'#dc2626':'#e5e5e2'}`,borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'inherit',outline:'none',boxSizing:'border-box',direction:'ltr',textAlign:'center' as const,background:networkError?'#fef7f7':'white'}}/>
                    </div>
                  </div>
                  {anyNetworkEntered && (
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:8,padding:'8px 10px',background:'#eff6ff',borderRadius:8,fontSize:11,fontWeight:700}}>
                      <span style={{color:'#2563eb'}}>إجمالي الشبكة</span>
                      <span style={{color:'#2563eb',direction:'ltr' as const}}>{fmt(network)} ر.س</span>
                    </div>
                  )}
                  {networkError && <div style={{fontSize:11,color:'#dc2626',fontWeight:700,marginTop:6,display:'flex',alignItems:'center',gap:4}}>⚠️ {networkError}</div>}
                </div>
                <div style={{marginBottom: (totalSales && anyNetworkEntered && !networkError) ? 16 : 0}}>
                  <label style={{fontSize:12,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:7}}>الكاش الفعلي بالدرج</label>
                  <MoneyInput value={cashAmount} onChange={setCashAmount} placeholder="0.00" icon="💵" iconBg="#fffbeb" iconColor="#d97706"/>
                </div>
                {totalSales && anyNetworkEntered && !networkError && (
                  <div style={{display:'flex',justifyContent:'space-between',padding:'12px 14px',background:'#f7f7f5',borderRadius:10,fontSize:12,fontWeight:700}}>
                    <span style={{color:'#8b8a84'}}>الكاش المتوقع (معاينة)</span>
                    <span style={{color:'#1c1c1a',direction:'ltr' as const}}>{fmt(expectedCash)} ر.س</span>
                  </div>
                )}
              </div>
            )}

            {/* خطوة 2: المصاريف */}
            {step===2 && (
              <div className="fu" style={{background:'white',borderRadius:18,padding:22,marginBottom:16,boxShadow:'0 2px 16px rgba(0,0,0,.05)',border:'1px solid #eeeeeb'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#1c1c1a',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:24,height:24,borderRadius:7,background:'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🧾</span>
                  هل فيه مبالغ اتسحبت من الكاش لمشتريات؟
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:hasPurchases==='yes'?16:0}}>
                  <button onClick={()=>setHasPurchases('no')} style={{padding:'11px',borderRadius:10,border:`1.5px solid ${hasPurchases==='no'?'#16a34a':'#e5e5e2'}`,background:hasPurchases==='no'?'#f0fdf4':'white',color:hasPurchases==='no'?'#16a34a':'#5f5e5a',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                    لا
                  </button>
                  <button onClick={()=>setHasPurchases('yes')} style={{padding:'11px',borderRadius:10,border:`1.5px solid ${hasPurchases==='yes'?'#16a34a':'#e5e5e2'}`,background:hasPurchases==='yes'?'#f0fdf4':'white',color:hasPurchases==='yes'?'#16a34a':'#5f5e5a',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                    نعم
                  </button>
                </div>

                {hasPurchases==='yes' && (
                  <div>
                    {purchases.map((p,idx)=>(
                      <div key={idx} style={{display:'flex',gap:8,marginBottom:10,alignItems:'center',background:'#faf9f7',padding:10,borderRadius:12,border:'1px solid #f0efec'}}>
                        <div style={{flex:1}}>
                          <input type="number" value={p.amount} onChange={e=>updatePurchase(idx,'amount',e.target.value)} placeholder="المبلغ"
                            style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e5e5e2',borderRadius:9,fontSize:14,fontWeight:700,fontFamily:'inherit',outline:'none',boxSizing:'border-box',direction:'ltr',textAlign:'right'}}/>
                        </div>
                        <div style={{flex:1.4}}>
                          <input type="text" value={p.reason} onChange={e=>updatePurchase(idx,'reason',e.target.value)} placeholder="السبب"
                            style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e5e5e2',borderRadius:9,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                        </div>
                        {purchases.length>1 && (
                          <button onClick={()=>removePurchaseRow(idx)} style={{width:34,height:34,flexShrink:0,borderRadius:9,border:'none',background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontSize:16,fontWeight:700}}>×</button>
                        )}
                      </div>
                    ))}
                    <button onClick={addPurchaseRow} style={{width:'100%',padding:'11px',borderRadius:10,border:'1.5px dashed #d4d3ce',background:'transparent',color:'#5f5e5a',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginTop:2}}>
                      + إضافة مصروف آخر
                    </button>
                    {totalPurchasesNow>0 && (
                      <div style={{display:'flex',justifyContent:'space-between',marginTop:12,padding:'10px 12px',background:'#fef2f2',borderRadius:9,fontSize:12,fontWeight:700}}>
                        <span style={{color:'#dc2626'}}>إجمالي المسحوبات</span>
                        <span style={{color:'#dc2626',direction:'ltr' as const}}>{fmt(totalPurchasesNow)} ر.س</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* خطوة 3: الصور */}
            {step===3 && (
              <div className="fu" style={{background:'white',borderRadius:18,padding:22,marginBottom:16,boxShadow:'0 2px 16px rgba(0,0,0,.05)',border:'1px solid #eeeeeb'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#1c1c1a',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:24,height:24,borderRadius:7,background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>📸</span>
                  صور الإثبات (إلزامي)
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:6}}>صورة تقرير المبيعات</label>
                    {salesImage ? (
                      <div style={{position:'relative'}}>
                        <img src={salesImage} alt="تقرير المبيعات" style={{width:'100%',height:130,borderRadius:10,objectFit:'cover'}}/>
                        <button type="button" onClick={()=>setSalesImage('')} style={{position:'absolute',top:6,left:6,background:'rgba(0,0,0,.55)',color:'white',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:14}}>×</button>
                      </div>
                    ):(
                      <label style={{display:'flex',alignItems:'center',justifyContent:'center',height:130,border:'2px dashed #d4d3ce',borderRadius:10,cursor:'pointer',background:'#faf9f7',textAlign:'center' as const,padding:8}}>
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&uploadImage(e.target.files[0],'sales')}/>
                        <span style={{fontSize:12,color:'#8b8a84',fontWeight:600}}>{uploadingSales?'⏳ جاري الرفع...':'📊 اضغط للرفع'}</span>
                      </label>
                    )}
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:6}}>صورة موازنة الشبكة</label>
                    {networkImage ? (
                      <div style={{position:'relative'}}>
                        <img src={networkImage} alt="موازنة الشبكة" style={{width:'100%',height:130,borderRadius:10,objectFit:'cover'}}/>
                        <button type="button" onClick={()=>setNetworkImage('')} style={{position:'absolute',top:6,left:6,background:'rgba(0,0,0,.55)',color:'white',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:14}}>×</button>
                      </div>
                    ):(
                      <label style={{display:'flex',alignItems:'center',justifyContent:'center',height:130,border:'2px dashed #d4d3ce',borderRadius:10,cursor:'pointer',background:'#faf9f7',textAlign:'center' as const,padding:8}}>
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&uploadImage(e.target.files[0],'network')}/>
                        <span style={{fontSize:12,color:'#8b8a84',fontWeight:600}}>{uploadingNetwork?'⏳ جاري الرفع...':'💳 اضغط للرفع'}</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* خطوة 4: المراجعة */}
            {step===4 && (
              <div className="fu" style={{background:'white',borderRadius:18,padding:22,marginBottom:16,boxShadow:'0 2px 16px rgba(0,0,0,.05)',border:'1px solid #eeeeeb'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#1c1c1a',marginBottom:14}}>ملخص الاحتساب</div>
                {[
                  {label:'إجمالي المبيعات',value:sales,sign:''},
                  ...(mada>0?[{label:'— مدى',value:mada,sign:'−'}]:[]),
                  ...(visa>0?[{label:'— فيزا',value:visa,sign:'−'}]:[]),
                  ...(mastercard>0?[{label:'— ماستركارد',value:mastercard,sign:'−'}]:[]),
                ].map((r,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:13,borderBottom:'1px dashed #eeeeeb'}}>
                    <span style={{color:'#8b8a84',fontWeight:600}}>{r.label}</span>
                    <span style={{color:'#1c1c1a',fontWeight:700,direction:'ltr' as const}}>{r.sign}{fmt(r.value)} ر.س</span>
                  </div>
                ))}
                <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0 16px',fontSize:14}}>
                  <span style={{color:'#1c1c1a',fontWeight:800}}>= الكاش المتوقع</span>
                  <span style={{color:'#1c1c1a',fontWeight:900,direction:'ltr' as const}}>{fmt(expectedCash)} ر.س</span>
                </div>
                <div style={{height:1,background:'#eeeeeb',margin:'4px 0 12px'}}/>
                <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:13,borderBottom:'1px dashed #eeeeeb'}}>
                  <span style={{color:'#8b8a84',fontWeight:600}}>الكاش الفعلي (قبل خصم المسحوبات)</span>
                  <span style={{color:'#1c1c1a',fontWeight:700,direction:'ltr' as const}}>{fmt(cash)} ر.س</span>
                </div>
                {totalPurchasesNow>0 && (
                  <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:13,borderBottom:'1px dashed #eeeeeb'}}>
                    <span style={{color:'#8b8a84',fontWeight:600}}>المسحوبات (مصاريف)</span>
                    <span style={{color:'#dc2626',fontWeight:700,direction:'ltr' as const}}>−{fmt(totalPurchasesNow)} ر.س</span>
                  </div>
                )}
                <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0 16px',fontSize:14}}>
                  <span style={{color:'#1c1c1a',fontWeight:800}}>= الكاش الفعلي بعد خصم المسحوبات</span>
                  <span style={{color:'#1c1c1a',fontWeight:900,direction:'ltr' as const}}>{fmt(cashAfterWithdrawal)} ر.س</span>
                </div>
                <div style={{
                  padding:'18px',borderRadius:14,textAlign:'center',marginBottom:16,
                  background: status==='balanced' ? '#f0fdf4' : status==='deficit' ? '#fef2f2' : '#eff6ff',
                  border: `1.5px solid ${status==='balanced' ? '#bbf7d0' : status==='deficit' ? '#fecaca' : '#bfdbfe'}`
                }}>
                  <div style={{fontSize:13,fontWeight:800,color: status==='balanced' ? '#16a34a' : status==='deficit' ? '#dc2626' : '#2563eb',marginBottom:status!=='balanced'?6:0}}>
                    {status==='balanced' ? '✅ مطابق تماماً' : status==='deficit' ? '⚠️ يوجد عجز' : '📈 يوجد زيادة'}
                  </div>
                  {status!=='balanced' && (
                    <div style={{fontSize:28,fontWeight:900,color: status==='deficit' ? '#dc2626' : '#2563eb'}}>
                      {fmt(Math.abs(difference))} ر.س
                    </div>
                  )}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div style={{padding:8,borderRadius:9,background:'#f7f7f5',textAlign:'center' as const}}>
                    <img src={salesImage} alt="" style={{width:'100%',height:60,borderRadius:6,objectFit:'cover',marginBottom:4}}/>
                    <span style={{fontSize:10,color:'#8b8a84',fontWeight:700}}>تقرير المبيعات ✓</span>
                  </div>
                  <div style={{padding:8,borderRadius:9,background:'#f7f7f5',textAlign:'center' as const}}>
                    <img src={networkImage} alt="" style={{width:'100%',height:60,borderRadius:6,objectFit:'cover',marginBottom:4}}/>
                    <span style={{fontSize:10,color:'#8b8a84',fontWeight:700}}>موازنة الشبكة ✓</span>
                  </div>
                </div>
              </div>
            )}

            {/* أزرار التنقل */}
            <div className="fu" style={{display:'flex',gap:10}}>
              {step>1 && (
                <button onClick={goBack} style={{flex:1,padding:'15px',background:'white',color:'#5f5e5a',border:'1.5px solid #e5e5e2',borderRadius:14,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  رجوع
                </button>
              )}
              {step<4 ? (
                <button onClick={goNext} style={{flex:2,padding:'15px',background:'#16a34a',color:'white',border:'none',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 16px rgba(22,163,74,.28)'}}>
                  التالي
                </button>
              ) : (
                <button onClick={saveClosing} disabled={submitting} style={{flex:2,padding:'15px',background:'#16a34a',color:'white',border:'none',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',opacity:submitting?.7:1,boxShadow:'0 4px 16px rgba(22,163,74,.28)'}}>
                  {submitting ? 'جاري الحفظ...' : '✓ تأكيد وحفظ التقرير'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
