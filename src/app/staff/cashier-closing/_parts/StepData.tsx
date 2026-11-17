'use client'
import { ct } from './strings'
import { fmt, MoneyInput, AmountTile, DeliveryRow } from './inputs'
import type { CashierClosing } from './useCashierClosing'
import { BarChart3, Banknote, AlertTriangle } from 'lucide-react'

export default function StepData({ m }: { m: CashierClosing }) {
  const { lang, step, madaAmount, setMadaAmount, visaAmount, setVisaAmount, mastercardAmount, setMastercardAmount, cashAmount, setCashAmount, deliveryChoices, deliveryApps, appPickerOpen, setAppPickerOpen, deliveryAmounts, setDeliveryAmounts, otherAppOpen, setOtherAppOpen, otherAppName, setOtherAppName, curr, totalSales, setTotalSales, network, delivery, anyNetworkEntered, networkError, expectedCash, addDeliveryApp, removeDeliveryApp } = m
  return (
    <>
            {/* خطوة 1: البيانات */}
            {step===1 && (
              <div className="fu" style={{background:'white',borderRadius:20,padding:16,marginBottom:16,border:'1px solid var(--storely-border)'}}>
                <div style={{fontSize:17,fontWeight:600,color:'var(--storely-text)',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:28,height:28,borderRadius:12,background:'var(--storely-fill)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--storely-muted)'}}><BarChart3 size={16} strokeWidth={1.75}/></span>
                  {ct('step1Title',lang)}
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:17,fontWeight:500,color:'var(--storely-text)',display:'block',marginBottom:7}}>{ct('totalSalesLabel',lang)}</label>
                  <MoneyInput value={totalSales} onChange={setTotalSales} placeholder="0.00" icon={<BarChart3 size={16} strokeWidth={1.75}/>} currency={curr}/>
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:17,fontWeight:500,color:'var(--storely-text)',display:'block',marginBottom:7}}>{ct('networkLabel',lang)}</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8}}>
                    <AmountTile label={ct('mada',lang)} value={madaAmount} onChange={setMadaAmount} error={!!networkError}/>
                    <AmountTile label={ct('visa',lang)} value={visaAmount} onChange={setVisaAmount} error={!!networkError}/>
                    <AmountTile label={ct('mastercard',lang)} value={mastercardAmount} onChange={setMastercardAmount} error={!!networkError}/>
                  </div>
                  {anyNetworkEntered && (
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:8,padding:'8px 10px',background:'var(--storely-fill)',borderRadius:12,fontSize:15}}>
                      <span style={{color:'var(--storely-muted)'}}>{ct('networkTotal',lang)}</span>
                      <span style={{color:'var(--storely-text)',fontVariantNumeric:'tabular-nums',direction:'ltr' as const}}>{fmt(network)} {curr}</span>
                    </div>
                  )}
                  {networkError && <div style={{fontSize:15,color:'#dc2626',marginTop:6,display:'flex',alignItems:'center',gap:4}}><AlertTriangle size={13}/> {networkError}</div>}
                </div>
                <div style={{marginBottom:16,paddingTop:14,borderTop:'1px dashed var(--storely-fill)'}}>
                  <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:8,marginBottom:8}}>
                    <label style={{fontSize:17,fontWeight:500,color:'var(--storely-text)'}}>{ct('deliveryLabel',lang)}</label>
                    {delivery>0 && <span style={{fontSize:15,fontWeight:500,color:'var(--storely-text)',fontVariantNumeric:'tabular-nums',direction:'ltr' as const,whiteSpace:'nowrap' as const}}>{fmt(delivery)} {curr}</span>}
                  </div>
                  {deliveryApps.length>0 && (
                    <div style={{border:'1px solid var(--storely-fill)',borderRadius:20,overflow:'hidden',marginBottom:8}}>
                      {deliveryApps.map((name,i)=>(
                        <DeliveryRow key={name} name={name} value={deliveryAmounts[name]||''} currency={curr} last={i===deliveryApps.length-1}
                          onChange={v=>setDeliveryAmounts(prev=>({...prev,[name]:v}))} onRemove={()=>removeDeliveryApp(name)}/>
                      ))}
                    </div>
                  )}
                  {!appPickerOpen ? (
                    <button type="button" onClick={()=>setAppPickerOpen(true)}
                      style={{display:'block',width:'100%',padding:'12px',borderRadius:20,border:'1.5px dashed var(--storely-muted)',background:'white',color:'var(--storely-text)',fontSize:17,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                      + {ct('addDeliveryApp',lang)}
                    </button>
                  ) : (
                    <div style={{border:'1px solid #203640',borderRadius:20,padding:12,background:'var(--storely-fill)'}}>
                      <div style={{display:'flex',flexWrap:'wrap' as const,gap:6}}>
                        {deliveryChoices.filter(n=>!deliveryApps.includes(n)).map(name=>(
                          <button key={name} type="button" onClick={()=>addDeliveryApp(name)}
                            style={{padding:'9px 14px',borderRadius:999,border:'1px solid var(--storely-border)',background:'white',color:'var(--storely-text)',fontSize:17,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                            {name}
                          </button>
                        ))}
                        {!otherAppOpen && (
                          <button type="button" onClick={()=>setOtherAppOpen(true)}
                            style={{padding:'9px 14px',borderRadius:999,border:'1.5px dashed var(--storely-muted)',background:'transparent',color:'var(--storely-text)',fontSize:17,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                            + {ct('otherApp',lang)}
                          </button>
                        )}
                      </div>
                      {otherAppOpen && (
                        <div style={{display:'flex',gap:6,marginTop:10}}>
                          <input value={otherAppName} onChange={e=>setOtherAppName(e.target.value)} maxLength={40} placeholder={ct('appNamePh',lang)} autoFocus
                            onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addDeliveryApp(otherAppName) } }}
                            style={{flex:1,minWidth:0,padding:'11px 12px',border:'1px solid var(--storely-border)',borderRadius:20,fontSize:17,fontFamily:'inherit',outline:'none',boxSizing:'border-box',color:'var(--storely-text)',background:'white'}}/>
                          <button type="button" onClick={()=>addDeliveryApp(otherAppName)} disabled={!otherAppName.trim()}
                            style={{padding:'0 16px',borderRadius:20,border:'none',background:otherAppName.trim()?'#203640':'var(--storely-border)',color:'white',fontSize:17,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{ct('addApp',lang)}</button>
                        </div>
                      )}
                      <button type="button" onClick={()=>{setAppPickerOpen(false);setOtherAppOpen(false);setOtherAppName('')}}
                        style={{display:'block',margin:'10px auto 0',border:'none',background:'none',color:'#1f2937',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{ct('cancelPick',lang)}</button>
                    </div>
                  )}
                  {deliveryApps.length>0 && <div style={{fontSize:15,color:'var(--storely-muted)',marginTop:8}}>{ct('deliveryHint',lang)}</div>}
                </div>
                <div style={{marginBottom: (totalSales && anyNetworkEntered && !networkError) ? 16 : 0}}>
                  <label style={{fontSize:17,fontWeight:500,color:'var(--storely-text)',display:'block',marginBottom:7}}>{ct('cashInDrawer',lang)}</label>
                  <MoneyInput value={cashAmount} onChange={setCashAmount} placeholder="0.00" icon={<Banknote size={16} strokeWidth={1.75}/>} currency={curr}/>
                </div>
                {totalSales && anyNetworkEntered && !networkError && (
                  <div style={{display:'flex',justifyContent:'space-between',padding:'12px 14px',background:'var(--storely-fill)',borderRadius:12,fontSize:17}}>
                    <span style={{color:'var(--storely-muted)'}}>{ct('expectedCashPreview',lang)}</span>
                    <span style={{color:'var(--storely-text)',direction:'ltr' as const}}>{fmt(expectedCash)} {curr}</span>
                  </div>
                )}
              </div>
            )}
    </>
  )
}
