'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string; role?: string
}

interface Purchase { amount: string; reason: string }

function MoneyInput({ value, onChange, placeholder, icon, iconBg, iconColor }: any) {
  return (
    <div style={{position:'relative'}}>
      <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',width:30,height:30,borderRadius:9,background:iconBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>
        {icon}
      </div>
      <input type="number" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:'100%',padding:'14px 54px 14px 46px',border:'1.5px solid #e5e5e2',borderRadius:12,fontSize:16,fontWeight:700,fontFamily:'inherit',outline:'none',boxSizing:'border-box',direction:'ltr',textAlign:'right',color:'#1c1c1a',transition:'border-color .15s'}}
        onFocus={e=>e.target.style.borderColor=iconColor}
        onBlur={e=>e.target.style.borderColor='#e5e5e2'}
      />
      <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:11,fontWeight:700,color:'#a8a7a1'}}>ر.س</span>
    </div>
  )
}

export default function CashierClosingPage() {
  const [session, setSession] = useState<StaffSession|null>(null)
  const [orgLogo, setOrgLogo] = useState<string|null>(null)
  const [totalSales, setTotalSales] = useState('')
  const [networkAmount, setNetworkAmount] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [hasPurchases, setHasPurchases] = useState<'yes'|'no'|null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([{amount:'',reason:''}])
  const [result, setResult] = useState<{expectedCash:number,cashAfterWithdrawal:number,difference:number,status:string}|null>(null)
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

  function addPurchaseRow() { setPurchases(prev=>[...prev,{amount:'',reason:''}]) }
  function removePurchaseRow(idx:number) { setPurchases(prev=>prev.filter((_,i)=>i!==idx)) }
  function updatePurchase(idx:number, field:'amount'|'reason', value:string) {
    setPurchases(prev=>prev.map((p,i)=>i===idx?{...p,[field]:value}:p))
  }

  const validPurchasesNow = hasPurchases==='yes' ? purchases.filter(p=>Number(p.amount)>0) : []
  const totalPurchasesNow = validPurchasesNow.reduce((sum,p)=>sum+(Number(p.amount)||0),0)

  function calculate() {
    if(!totalSales || !networkAmount || !cashAmount){
      showToast('أدخل إجمالي المبيعات والشبكة والكاش أولاً','error')
      return
    }
    const sales = Number(totalSales)||0
    const network = Number(networkAmount)||0
    const cash = Number(cashAmount)||0
    const expectedCash = sales - network
    const cashAfterWithdrawal = cash - totalPurchasesNow
    const difference = cashAfterWithdrawal - expectedCash
    const status = Math.abs(difference)<0.01 ? 'balanced' : (difference<0 ? 'deficit' : 'surplus')
    setResult({expectedCash,cashAfterWithdrawal,difference,status})
  }

  async function saveClosing() {
    if(!session || !result) return
    setSubmitting(true)
    try {
      const validPurchases = validPurchasesNow.map(p=>({amount:Number(p.amount),reason:p.reason||'بدون سبب'}))
      const res = await fetch('/api/cashier-closing',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          org_id: session.org_id, branch_id: session.branch_id,
          staff_id: session.id, staff_name: session.name,
          total_sales: Number(totalSales), network_amount: Number(networkAmount),
          cash_amount: Number(cashAmount), purchases: validPurchases,
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
    setTotalSales(''); setNetworkAmount(''); setCashAmount('')
    setHasPurchases(null); setPurchases([{amount:'',reason:''}])
    setResult(null); setSaved(false)
  }

  if(!session) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f4',fontFamily:"'IBM Plex Sans Arabic',system-ui"}}>
      <div style={{width:32,height:32,border:'3px solid #e5e5e2',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const sales = Number(totalSales)||0
  const network = Number(networkAmount)||0

  return (
    <div style={{minHeight:'100vh',background:'#f7f7f5',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',paddingBottom:50}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}} .fu{animation:fadeUp .35s ease both}`}</style>

      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:toast.type==='success'?'#16a34a':'#dc2626',color:'white',padding:'12px 24px',borderRadius:40,fontSize:14,fontWeight:700,boxShadow:'0 8px 24px rgba(0,0,0,.25)',whiteSpace:'nowrap'}}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
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
        <div className="fu" style={{marginBottom:22}}>
          <div style={{fontSize:22,fontWeight:800,color:'#1c1c1a',marginBottom:4}}>إقفال الكاشير اليومي</div>
          <div style={{fontSize:13,color:'#8b8a84',fontWeight:600}}>{new Date().toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
        </div>

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
            {/* بيانات المبيعات */}
            <div className="fu" style={{background:'white',borderRadius:18,padding:22,marginBottom:16,boxShadow:'0 2px 16px rgba(0,0,0,.05)',border:'1px solid #eeeeeb'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#1c1c1a',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:24,height:24,borderRadius:7,background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>📊</span>
                بيانات اليوم
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:7}}>إجمالي المبيعات (النظام)</label>
                <MoneyInput value={totalSales} onChange={setTotalSales} placeholder="0.00" icon="📊" iconBg="#f0fdf4" iconColor="#16a34a"/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:7}}>إجمالي الشبكة (مدى + فيزا)</label>
                <MoneyInput value={networkAmount} onChange={setNetworkAmount} placeholder="0.00" icon="💳" iconBg="#eff6ff" iconColor="#2563eb"/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:7}}>الكاش الفعلي بالدرج</label>
                <MoneyInput value={cashAmount} onChange={setCashAmount} placeholder="0.00" icon="💵" iconBg="#fffbeb" iconColor="#d97706"/>
              </div>
            </div>

            {/* المصاريف */}
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
                      <span style={{color:'#dc2626'}}>{totalPurchasesNow.toFixed(2)} ر.س</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!result ? (
              <button onClick={calculate} className="fu" style={{width:'100%',padding:'16px',background:'#16a34a',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 16px rgba(22,163,74,.28)'}}>
                احسب النتيجة
              </button>
            ) : (
              <>
                <div className="fu" style={{background:'white',borderRadius:18,padding:22,marginBottom:16,boxShadow:'0 2px 16px rgba(0,0,0,.05)',border:'1px solid #eeeeeb'}}>
                  <div style={{fontSize:13,fontWeight:800,color:'#1c1c1a',marginBottom:14}}>ملخص الاحتساب</div>
                  {[
                    {label:'إجمالي المبيعات',value:sales,sign:''},
                    {label:'الشبكة',value:network,sign:'−'},
                  ].map((r,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:13,borderBottom:'1px dashed #eeeeeb'}}>
                      <span style={{color:'#8b8a84',fontWeight:600}}>{r.label}</span>
                      <span style={{color:'#1c1c1a',fontWeight:700,direction:'ltr'}}>{r.sign}{r.value.toFixed(2)} ر.س</span>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0 16px',fontSize:14}}>
                    <span style={{color:'#1c1c1a',fontWeight:800}}>= الكاش المتوقع</span>
                    <span style={{color:'#1c1c1a',fontWeight:900,direction:'ltr'}}>{result.expectedCash.toFixed(2)} ر.س</span>
                  </div>
                  <div style={{height:1,background:'#eeeeeb',margin:'4px 0 12px'}}/>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:13,borderBottom:'1px dashed #eeeeeb'}}>
                    <span style={{color:'#8b8a84',fontWeight:600}}>الكاش الفعلي (قبل خصم المسحوبات)</span>
                    <span style={{color:'#1c1c1a',fontWeight:700,direction:'ltr'}}>{Number(cashAmount).toFixed(2)} ر.س</span>
                  </div>
                  {totalPurchasesNow>0 && (
                    <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:13,borderBottom:'1px dashed #eeeeeb'}}>
                      <span style={{color:'#8b8a84',fontWeight:600}}>المسحوبات (مصاريف)</span>
                      <span style={{color:'#dc2626',fontWeight:700,direction:'ltr'}}>−{totalPurchasesNow.toFixed(2)} ر.س</span>
                    </div>
                  )}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0 16px',fontSize:14}}>
                    <span style={{color:'#1c1c1a',fontWeight:800}}>= الكاش الفعلي بعد خصم المسحوبات</span>
                    <span style={{color:'#1c1c1a',fontWeight:900,direction:'ltr'}}>{result.cashAfterWithdrawal.toFixed(2)} ر.س</span>
                  </div>
                  <div style={{
                    padding:'18px',borderRadius:14,textAlign:'center',
                    background: result.status==='balanced' ? '#f0fdf4' : result.status==='deficit' ? '#fef2f2' : '#eff6ff',
                    border: `1.5px solid ${result.status==='balanced' ? '#bbf7d0' : result.status==='deficit' ? '#fecaca' : '#bfdbfe'}`
                  }}>
                    <div style={{fontSize:13,fontWeight:800,color: result.status==='balanced' ? '#16a34a' : result.status==='deficit' ? '#dc2626' : '#2563eb',marginBottom:result.status!=='balanced'?6:0}}>
                      {result.status==='balanced' ? '✅ مطابق تماماً' : result.status==='deficit' ? '⚠️ يوجد عجز' : '📈 يوجد زيادة'}
                    </div>
                    {result.status!=='balanced' && (
                      <div style={{fontSize:28,fontWeight:900,color: result.status==='deficit' ? '#dc2626' : '#2563eb'}}>
                        {Math.abs(result.difference).toFixed(2)} ر.س
                      </div>
                    )}
                  </div>
                </div>
                <div className="fu" style={{display:'flex',gap:10}}>
                  <button onClick={()=>setResult(null)} style={{flex:1,padding:'15px',background:'white',color:'#5f5e5a',border:'1.5px solid #e5e5e2',borderRadius:14,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    تعديل
                  </button>
                  <button onClick={saveClosing} disabled={submitting} style={{flex:2,padding:'15px',background:'#16a34a',color:'white',border:'none',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',opacity:submitting?.7:1,boxShadow:'0 4px 16px rgba(22,163,74,.28)'}}>
                    {submitting ? 'جاري الحفظ...' : '✓ حفظ التقرير'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
