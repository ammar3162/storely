'use client'
import { ct } from './strings'
import { fmt, BigMoney, MoneyRow, DeliveryRow, Question } from './inputs'
import type { CashierClosing } from './useCashierClosing'
import { AlertTriangle, Plus } from 'lucide-react'

// خطوة البيانات: أربع شاشات، كل سؤال بشاشة كاملة — والانتقال بزر «التالي» بس
export default function StepData({ m }: { m: CashierClosing }) {
  const { lang, step, sub, madaAmount, setMadaAmount, visaAmount, setVisaAmount, mastercardAmount, setMastercardAmount, cashAmount, setCashAmount, deliveryChoices, deliveryApps, appPickerOpen, setAppPickerOpen, deliveryAmounts, setDeliveryAmounts, otherAppOpen, setOtherAppOpen, otherAppName, setOtherAppName, curr, totalSales, setTotalSales, network, delivery, anyNetworkEntered, networkError, expectedCash, addDeliveryApp, removeDeliveryApp, goNext } = m
  if(step!==1) return null
  const summary = (label: string, value: number) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginTop:12,padding:'12px 16px',background:'white',border:'1px solid #e5e7eb',borderRadius:12,fontSize:15}}>
      <span style={{color:'#4b5565'}}>{label}</span>
      <span style={{color:'#111827',fontFamily:"'IBM Plex Mono',ui-monospace,monospace",direction:'ltr' as const}}>{fmt(value)} <span style={{fontFamily:'inherit',fontSize:13,color:'#6b7487'}}>{curr}</span></span>
    </div>
  )
  return (
    <div key={`s1-${sub}`}>
      {sub===0 && (
        <Question title={ct('q_sales',lang)} hint={ct('q_salesHint',lang)}>
          <BigMoney value={totalSales} onChange={setTotalSales} currency={curr} onEnter={goNext} autoFocus/>
        </Question>
      )}

      {sub===1 && (
        <Question title={ct('q_network',lang)} hint={ct('q_networkHint',lang)}>
          <div style={{border:`1px solid ${networkError?'#dc2626':'#e5e7eb'}`,borderRadius:14,overflow:'hidden'}}>
            <MoneyRow label={ct('mada',lang)} value={madaAmount} onChange={setMadaAmount} currency={curr}/>
            <MoneyRow label={ct('visa',lang)} value={visaAmount} onChange={setVisaAmount} currency={curr}/>
            <MoneyRow label={ct('mastercard',lang)} value={mastercardAmount} onChange={setMastercardAmount} currency={curr} onEnter={goNext} last/>
          </div>
          {anyNetworkEntered && summary(ct('networkTotal',lang), network)}
          {networkError && <div style={{fontSize:14,color:'#dc2626',marginTop:10,display:'flex',alignItems:'center',gap:6}}><AlertTriangle size={15} strokeWidth={1.75}/> {networkError}</div>}
        </Question>
      )}

      {sub===2 && (
        <Question title={ct('q_delivery',lang)} hint={ct('q_deliveryHint',lang)}>
          {deliveryApps.length>0 && (
            <div style={{border:'1px solid #e5e7eb',borderRadius:14,overflow:'hidden',marginBottom:12}}>
              {deliveryApps.map((name,i)=>(
                <DeliveryRow key={name} name={name} value={deliveryAmounts[name]||''} currency={curr} last={i===deliveryApps.length-1}
                  onChange={v=>setDeliveryAmounts(prev=>({...prev,[name]:v}))} onRemove={()=>removeDeliveryApp(name)}/>
              ))}
            </div>
          )}
          {!appPickerOpen ? (
            <button type="button" onClick={()=>setAppPickerOpen(true)}
              style={{width:'100%',height:56,borderRadius:12,border:'1px dashed #9ca3af',background:'white',color:'#111827',fontSize:16,fontWeight:500,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <Plus size={18} strokeWidth={1.75}/>{ct('addDeliveryApp',lang)}
            </button>
          ) : (
            <div style={{border:'1px solid #e5e7eb',borderRadius:14,padding:12,background:'white'}}>
              <div style={{display:'flex',flexWrap:'wrap' as const,gap:8}}>
                {deliveryChoices.filter(n=>!deliveryApps.includes(n)).map(name=>(
                  <button key={name} type="button" onClick={()=>addDeliveryApp(name)}
                    style={{height:44,padding:'0 16px',borderRadius:10,border:'1px solid #e5e7eb',background:'#f4f5f6',color:'#111827',fontSize:15,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                    {name}
                  </button>
                ))}
                {!otherAppOpen && (
                  <button type="button" onClick={()=>setOtherAppOpen(true)}
                    style={{height:44,padding:'0 16px',borderRadius:10,border:'1px dashed #9ca3af',background:'transparent',color:'#111827',fontSize:15,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                    + {ct('otherApp',lang)}
                  </button>
                )}
              </div>
              {otherAppOpen && (
                <div style={{display:'flex',gap:8,marginTop:10}}>
                  <input value={otherAppName} onChange={e=>setOtherAppName(e.target.value)} maxLength={40} placeholder={ct('appNamePh',lang)} autoFocus
                    onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addDeliveryApp(otherAppName) } }}
                    style={{flex:1,minWidth:0,height:44,padding:'0 12px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:16,fontFamily:'inherit',outline:'none',boxSizing:'border-box',color:'#111827',background:'white'}}/>
                  <button type="button" onClick={()=>addDeliveryApp(otherAppName)} disabled={!otherAppName.trim()}
                    style={{padding:'0 16px',borderRadius:10,border:'none',background:otherAppName.trim()?'#0f766e':'#e5e7eb',color:'white',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{ct('addApp',lang)}</button>
                </div>
              )}
              <button type="button" onClick={()=>{setAppPickerOpen(false);setOtherAppOpen(false);setOtherAppName('')}}
                style={{display:'block',margin:'12px auto 0',border:'none',background:'none',color:'#4b5565',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>{ct('cancelPick',lang)}</button>
            </div>
          )}
          {delivery>0 && summary(ct('deliveryLabel',lang), delivery)}
        </Question>
      )}

      {sub===3 && (
        <Question title={ct('q_cash',lang)} hint={ct('q_cashHint',lang)}>
          <BigMoney value={cashAmount} onChange={setCashAmount} currency={curr} onEnter={goNext} autoFocus/>
          {totalSales && anyNetworkEntered && !networkError && summary(ct('expectedCashPreview',lang), expectedCash)}
        </Question>
      )}
    </div>
  )
}
