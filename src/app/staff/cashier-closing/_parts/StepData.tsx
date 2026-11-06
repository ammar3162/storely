'use client'
import { ct } from './strings'
import { fmt, MoneyInput, AmountTile, DeliveryRow } from './inputs'
import type { CashierClosing } from './useCashierClosing'

export default function StepData({ m }: { m: CashierClosing }) {
  const { lang, step, madaAmount, setMadaAmount, visaAmount, setVisaAmount, mastercardAmount, setMastercardAmount, cashAmount, setCashAmount, deliveryChoices, deliveryApps, appPickerOpen, setAppPickerOpen, deliveryAmounts, setDeliveryAmounts, otherAppOpen, setOtherAppOpen, otherAppName, setOtherAppName, curr, totalSales, setTotalSales, network, delivery, anyNetworkEntered, networkError, expectedCash, addDeliveryApp, removeDeliveryApp } = m
  return (
    <>
            {/* خطوة 1: البيانات */}
            {step===1 && (
              <div className="fu" style={{background:'white',borderRadius:18,padding:22,marginBottom:16,boxShadow:'0 2px 16px rgba(0,0,0,.05)',border:'1px solid #eeeeeb'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#1c1c1a',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:24,height:24,borderRadius:7,background:'#f0fdfa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>📊</span>
                  {ct('step1Title',lang)}
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:12.5,fontWeight:800,color:'#000',display:'block',marginBottom:7}}>{ct('totalSalesLabel',lang)}</label>
                  <MoneyInput value={totalSales} onChange={setTotalSales} placeholder="0.00" icon="📊" iconBg="#f0fdfa" iconColor="#029FA2" currency={curr}/>
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:12.5,fontWeight:800,color:'#000',display:'block',marginBottom:7}}>{ct('networkLabel',lang)}</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8}}>
                    <AmountTile label={ct('mada',lang)} value={madaAmount} onChange={setMadaAmount} error={!!networkError}/>
                    <AmountTile label={ct('visa',lang)} value={visaAmount} onChange={setVisaAmount} error={!!networkError}/>
                    <AmountTile label={ct('mastercard',lang)} value={mastercardAmount} onChange={setMastercardAmount} error={!!networkError}/>
                  </div>
                  {anyNetworkEntered && (
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:8,padding:'8px 10px',background:'#eff6ff',borderRadius:8,fontSize:11,fontWeight:700}}>
                      <span style={{color:'#2563eb'}}>{ct('networkTotal',lang)}</span>
                      <span style={{color:'#2563eb',direction:'ltr' as const}}>{fmt(network)} {curr}</span>
                    </div>
                  )}
                  {networkError && <div style={{fontSize:11,color:'#dc2626',fontWeight:700,marginTop:6,display:'flex',alignItems:'center',gap:4}}>⚠️ {networkError}</div>}
                </div>
                <div style={{marginBottom:16,paddingTop:14,borderTop:'1px dashed #eeeeeb'}}>
                  <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:8,marginBottom:8}}>
                    <label style={{fontSize:12.5,fontWeight:800,color:'#000'}}>{ct('deliveryLabel',lang)}</label>
                    {delivery>0 && <span style={{fontSize:12.5,fontWeight:800,color:'#0f766e',direction:'ltr' as const,whiteSpace:'nowrap' as const}}>{fmt(delivery)} {curr}</span>}
                  </div>
                  {deliveryApps.length>0 && (
                    <div style={{border:'1px solid #eeeeeb',borderRadius:14,overflow:'hidden',marginBottom:8}}>
                      {deliveryApps.map((name,i)=>(
                        <DeliveryRow key={name} name={name} value={deliveryAmounts[name]||''} currency={curr} last={i===deliveryApps.length-1}
                          onChange={v=>setDeliveryAmounts(prev=>({...prev,[name]:v}))} onRemove={()=>removeDeliveryApp(name)}/>
                      ))}
                    </div>
                  )}
                  {!appPickerOpen ? (
                    <button type="button" onClick={()=>setAppPickerOpen(true)}
                      style={{display:'block',width:'100%',padding:'12px',borderRadius:12,border:'1.5px dashed #b8b7b1',background:'white',color:'#000',fontSize:13.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
                      + {ct('addDeliveryApp',lang)}
                    </button>
                  ) : (
                    <div style={{border:'1.5px solid #029FA2',borderRadius:14,padding:12,background:'#fafaf8'}}>
                      <div style={{display:'flex',flexWrap:'wrap' as const,gap:6}}>
                        {deliveryChoices.filter(n=>!deliveryApps.includes(n)).map(name=>(
                          <button key={name} type="button" onClick={()=>addDeliveryApp(name)}
                            style={{padding:'9px 14px',borderRadius:999,border:'1.5px solid #e5e5e2',background:'white',color:'#000',fontSize:13.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                            {name}
                          </button>
                        ))}
                        {!otherAppOpen && (
                          <button type="button" onClick={()=>setOtherAppOpen(true)}
                            style={{padding:'9px 14px',borderRadius:999,border:'1.5px dashed #b8b7b1',background:'transparent',color:'#000',fontSize:13.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                            + {ct('otherApp',lang)}
                          </button>
                        )}
                      </div>
                      {otherAppOpen && (
                        <div style={{display:'flex',gap:6,marginTop:10}}>
                          <input value={otherAppName} onChange={e=>setOtherAppName(e.target.value)} maxLength={40} placeholder={ct('appNamePh',lang)} autoFocus
                            onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addDeliveryApp(otherAppName) } }}
                            style={{flex:1,minWidth:0,padding:'11px 12px',border:'1.5px solid #e5e5e2',borderRadius:12,fontSize:16,fontFamily:'inherit',outline:'none',boxSizing:'border-box',color:'#000',background:'white'}}/>
                          <button type="button" onClick={()=>addDeliveryApp(otherAppName)} disabled={!otherAppName.trim()}
                            style={{padding:'0 16px',borderRadius:12,border:'none',background:otherAppName.trim()?'#029FA2':'#d4d3ce',color:'white',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{ct('addApp',lang)}</button>
                        </div>
                      )}
                      <button type="button" onClick={()=>{setAppPickerOpen(false);setOtherAppOpen(false);setOtherAppName('')}}
                        style={{display:'block',margin:'10px auto 0',border:'none',background:'none',color:'#3d3d3a',fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{ct('cancelPick',lang)}</button>
                    </div>
                  )}
                  {deliveryApps.length>0 && <div style={{fontSize:11,color:'#3d3d3a',marginTop:7}}>{ct('deliveryHint',lang)}</div>}
                </div>
                <div style={{marginBottom: (totalSales && anyNetworkEntered && !networkError) ? 16 : 0}}>
                  <label style={{fontSize:12.5,fontWeight:800,color:'#000',display:'block',marginBottom:7}}>{ct('cashInDrawer',lang)}</label>
                  <MoneyInput value={cashAmount} onChange={setCashAmount} placeholder="0.00" icon="💵" iconBg="#fffbeb" iconColor="#d97706" currency={curr}/>
                </div>
                {totalSales && anyNetworkEntered && !networkError && (
                  <div style={{display:'flex',justifyContent:'space-between',padding:'12px 14px',background:'#f7f7f5',borderRadius:10,fontSize:12,fontWeight:700}}>
                    <span style={{color:'#8b8a84'}}>{ct('expectedCashPreview',lang)}</span>
                    <span style={{color:'#1c1c1a',direction:'ltr' as const}}>{fmt(expectedCash)} {curr}</span>
                  </div>
                )}
              </div>
            )}
    </>
  )
}
