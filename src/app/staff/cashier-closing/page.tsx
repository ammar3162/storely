'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string; role?: string
}

interface Purchase { amount: string; reason: string }

export default function CashierClosingPage() {
  const [session, setSession] = useState<StaffSession|null>(null)
  const [orgLogo, setOrgLogo] = useState<string|null>(null)
  const [totalSales, setTotalSales] = useState('')
  const [networkAmount, setNetworkAmount] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [hasPurchases, setHasPurchases] = useState<'yes'|'no'|null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([{amount:'',reason:''}])
  const [result, setResult] = useState<{expectedCash:number,difference:number,status:string}|null>(null)
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

  function logout() { localStorage.removeItem('staff_session'); router.push('/staff') }

  function showToast(msg:string, type:'success'|'error'='success') {
    setToast({msg,type})
    setTimeout(()=>setToast(null),3000)
  }

  function addPurchaseRow() {
    setPurchases(prev=>[...prev,{amount:'',reason:''}])
  }

  function removePurchaseRow(idx:number) {
    setPurchases(prev=>prev.filter((_,i)=>i!==idx))
  }

  function updatePurchase(idx:number, field:'amount'|'reason', value:string) {
    setPurchases(prev=>prev.map((p,i)=>i===idx?{...p,[field]:value}:p))
  }

  function calculate() {
    const sales = Number(totalSales)||0
    const network = Number(networkAmount)||0
    const cash = Number(cashAmount)||0
    if(!totalSales || !networkAmount || !cashAmount){
      showToast('أدخل إجمالي المبيعات والشبكة والكاش أولاً','error')
      return
    }
    const validPurchases = hasPurchases==='yes' ? purchases.filter(p=>Number(p.amount)>0) : []
    const totalPurchases = validPurchases.reduce((sum,p)=>sum+(Number(p.amount)||0),0)
    const expectedCash = sales - network - totalPurchases
    const difference = cash - expectedCash
    const status = Math.abs(difference)<0.01 ? 'balanced' : (difference<0 ? 'deficit' : 'surplus')
    setResult({expectedCash,difference,status})
  }

  async function saveClosing() {
    if(!session || !result) return
    setSubmitting(true)
    try {
      const validPurchases = hasPurchases==='yes' ? purchases.filter(p=>Number(p.amount)>0).map(p=>({amount:Number(p.amount),reason:p.reason||'بدون سبب'})) : []
      const res = await fetch('/api/cashier-closing',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          org_id: session.org_id,
          branch_id: session.branch_id,
          staff_id: session.id,
          staff_name: session.name,
          total_sales: Number(totalSales),
          network_amount: Number(networkAmount),
          cash_amount: Number(cashAmount),
          purchases: validPurchases,
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
      <div style={{color:'#888780',fontSize:14}}>جاري التحميل...</div>
    </div>
  )

  const inputStyle = {width:'100%',padding:'12px 14px',border:'1.5px solid #e0e0dd',borderRadius:10,fontSize:15,fontFamily:'inherit',outline:'none',boxSizing:'border-box' as const,direction:'ltr' as const,textAlign:'right' as const}

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f4',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',paddingBottom:40}}>
      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:toast.type==='success'?'#16a34a':'#ef4444',color:'white',padding:'12px 24px',borderRadius:40,fontSize:14,fontWeight:700,boxShadow:'0 8px 24px rgba(0,0,0,.2)',whiteSpace:'nowrap'}}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0d2818,#1a4731)',padding:'14px 20px',position:'sticky',top:0,zIndex:100,boxShadow:'0 4px 20px rgba(0,0,0,.2)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {orgLogo ? (
            <img src={orgLogo} alt="" style={{width:38,height:38,borderRadius:10,objectFit:'cover',border:'2px solid rgba(255,255,255,.2)'}}/>
          ) : (
            <div style={{width:38,height:38,borderRadius:10,background:'rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>💰</div>
          )}
          <div>
            <div style={{fontSize:15,fontWeight:800,color:'white'}}>{session.name}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.6)',marginTop:1}}>{session.org_name}{session.branch_name?` · ${session.branch_name}`:''} · كاشير</div>
          </div>
        </div>
        <button onClick={logout} style={{background:'rgba(255,255,255,.1)',color:'white',border:'1px solid rgba(255,255,255,.2)',borderRadius:10,padding:'7px 14px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          خروج
        </button>
      </div>

      <div style={{maxWidth:520,margin:'0 auto',padding:'24px 16px'}}>
        <div style={{fontSize:20,fontWeight:800,color:'#1c1c1a',marginBottom:4}}>إقفال الكاشير اليومي</div>
        <div style={{fontSize:13,color:'#888780',marginBottom:24}}>{new Date().toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>

        {saved ? (
          <div style={{background:'white',borderRadius:16,padding:28,textAlign:'center',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:40,marginBottom:12}}>✅</div>
            <div style={{fontSize:17,fontWeight:800,color:'#1c1c1a',marginBottom:6}}>تم حفظ تقرير الإقفال بنجاح</div>
            <div style={{fontSize:13,color:'#888780',marginBottom:20}}>يمكن للمالك مراجعة التقرير من صفحة التقارير</div>
            <button onClick={resetForm} style={{padding:'12px 24px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              إقفال جديد
            </button>
          </div>
        ) : (
          <>
            <div style={{background:'white',borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:6}}>إجمالي المبيعات (فودك)</label>
                <input type="number" value={totalSales} onChange={e=>setTotalSales(e.target.value)} placeholder="0.00" style={inputStyle}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:6}}>إجمالي الشبكة (مدى + فيزا)</label>
                <input type="number" value={networkAmount} onChange={e=>setNetworkAmount(e.target.value)} placeholder="0.00" style={inputStyle}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:6}}>الكاش الفعلي بالدرج</label>
                <input type="number" value={cashAmount} onChange={e=>setCashAmount(e.target.value)} placeholder="0.00" style={inputStyle}/>
              </div>
            </div>

            <div style={{background:'white',borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
              <div style={{fontSize:13,fontWeight:700,color:'#1c1c1a',marginBottom:12}}>هل فيه مبالغ اتسحبت من الكاش لمشتريات؟</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:hasPurchases==='yes'?16:0}}>
                <button onClick={()=>setHasPurchases('no')} style={{padding:'10px',borderRadius:8,border:`1.5px solid ${hasPurchases==='no'?'#16a34a':'#e0e0dd'}`,background:hasPurchases==='no'?'#f0fdf4':'white',color:hasPurchases==='no'?'#16a34a':'#5f5e5a',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
                  لا
                </button>
                <button onClick={()=>setHasPurchases('yes')} style={{padding:'10px',borderRadius:8,border:`1.5px solid ${hasPurchases==='yes'?'#16a34a':'#e0e0dd'}`,background:hasPurchases==='yes'?'#f0fdf4':'white',color:hasPurchases==='yes'?'#16a34a':'#5f5e5a',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
                  نعم
                </button>
              </div>

              {hasPurchases==='yes' && (
                <div>
                  {purchases.map((p,idx)=>(
                    <div key={idx} style={{display:'flex',gap:8,marginBottom:10,alignItems:'center'}}>
                      <input type="number" value={p.amount} onChange={e=>updatePurchase(idx,'amount',e.target.value)} placeholder="المبلغ" style={{...inputStyle,flex:1}}/>
                      <input type="text" value={p.reason} onChange={e=>updatePurchase(idx,'reason',e.target.value)} placeholder="السبب" style={{...inputStyle,flex:1.5,textAlign:'right' as const,direction:'rtl' as const}}/>
                      {purchases.length>1 && (
                        <button onClick={()=>removePurchaseRow(idx)} style={{width:36,height:36,flexShrink:0,borderRadius:8,border:'1.5px solid #fecaca',background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontSize:16}}>×</button>
                      )}
                    </div>
                  ))}
                  <button onClick={addPurchaseRow} style={{width:'100%',padding:'10px',borderRadius:8,border:'1.5px dashed #d1d5db',background:'transparent',color:'#5f5e5a',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    + إضافة مصروف آخر
                  </button>
                </div>
              )}
            </div>

            {!result ? (
              <button onClick={calculate} style={{width:'100%',padding:'14px',background:'#16a34a',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
                احسب النتيجة
              </button>
            ) : (
              <>
                <div style={{background:'white',borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,fontSize:13}}>
                    <span style={{color:'#888780'}}>الكاش المتوقع</span>
                    <span style={{fontWeight:700,color:'#1c1c1a'}}>{result.expectedCash.toFixed(2)}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,fontSize:13}}>
                    <span style={{color:'#888780'}}>الكاش الفعلي</span>
                    <span style={{fontWeight:700,color:'#1c1c1a'}}>{Number(cashAmount).toFixed(2)}</span>
                  </div>
                  <div style={{
                    padding:'16px',borderRadius:12,textAlign:'center',
                    background: result.status==='balanced' ? '#f0fdf4' : result.status==='deficit' ? '#fef2f2' : '#eff6ff',
                    border: `1.5px solid ${result.status==='balanced' ? '#bbf7d0' : result.status==='deficit' ? '#fecaca' : '#bfdbfe'}`
                  }}>
                    <div style={{fontSize:13,fontWeight:700,color: result.status==='balanced' ? '#16a34a' : result.status==='deficit' ? '#dc2626' : '#2563eb',marginBottom:4}}>
                      {result.status==='balanced' ? '✅ مطابق تماماً' : result.status==='deficit' ? '⚠️ يوجد عجز' : '📈 يوجد زيادة'}
                    </div>
                    {result.status!=='balanced' && (
                      <div style={{fontSize:24,fontWeight:900,color: result.status==='deficit' ? '#dc2626' : '#2563eb'}}>
                        {Math.abs(result.difference).toFixed(2)} ﷼
                      </div>
                    )}
                  </div>
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={()=>setResult(null)} style={{flex:1,padding:'14px',background:'white',color:'#5f5e5a',border:'1.5px solid #e0e0dd',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    تعديل
                  </button>
                  <button onClick={saveClosing} disabled={submitting} style={{flex:2,padding:'14px',background:'#16a34a',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',opacity:submitting?.7:1}}>
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
