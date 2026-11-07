'use client'
import NumberInput from '@/components/NumberInput'
import { ct } from './strings'
import { fmt, Section, Row, MoneyField, Figure } from './inputs'
import type { CashierClosing } from './useCashierClosing'
import { Plus, X, Camera, FileImage, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

// صفحة إقفال وحدة بأسلوب أنظمة الكاشير: كل الأقسام قدامه، والحسابات تتحدث وهو يكتب،
// وزر «مراجعة وإقفال» مباشرة بعد آخر قسم.
export default function CloseForm({ m }: { m: CashierClosing }) {
  const { lang, curr, totalSales, setTotalSales, madaAmount, setMadaAmount, visaAmount, setVisaAmount, mastercardAmount, setMastercardAmount,
    cashAmount, setCashAmount, deliveryChoices, deliveryApps, appPickerOpen, setAppPickerOpen, deliveryAmounts, setDeliveryAmounts,
    otherAppOpen, setOtherAppOpen, otherAppName, setOtherAppName, addDeliveryApp, removeDeliveryApp,
    hasPurchases, setHasPurchases, purchases, addPurchaseRow, removePurchaseRow, updatePurchase, totalPurchasesNow,
    network, anyNetworkEntered, networkError, expectedCash, difference, status,
    salesImage, setSalesImage, networkImage, setNetworkImage, salesPreview, networkPreview, uploadingSales, uploadingNetwork, uploadImage, openReview } = m
  const withdrawals = hasPurchases==='yes'
  const showDiff = !!cashAmount && !!totalSales && anyNetworkEntered && !networkError
  const diffColor = status==='balanced' ? '#15803d' : status==='deficit' ? '#dc2626' : '#111827'
  const diffLabel = status==='balanced' ? ct('balanced',lang) : status==='deficit' ? ct('deficit',lang) : ct('surplus',lang)

  const photoRow = (label: string, image: string, preview: string, uploading: boolean, kind: 'sales'|'network', clear: () => void, first?: boolean) => (
    <label style={{display:'flex',alignItems:'center',gap:12,minHeight:64,padding:'10px 16px',borderTop:first?'none':'1px solid #e5e7eb',cursor:'pointer'}}>
      <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{ const f=e.target.files?.[0]; if(f){ clear(); uploadImage(f,kind) } e.target.value='' }}/>
      <span style={{width:44,height:44,borderRadius:8,background:'#eceef1',color:'#4b5565',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>
        {uploading ? <Loader2 size={18} strokeWidth={1.75} style={{animation:'spin .8s linear infinite'}}/>
          : image ? <img src={preview||image} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          : <FileImage size={18} strokeWidth={1.75}/>}
      </span>
      <span style={{flex:1,minWidth:0}}>
        <span style={{display:'block',fontSize:15,color:'#111827'}}>{label}</span>
        <span style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:image?'#15803d':'#6b7487',marginTop:1}}>
          {image ? <><CheckCircle2 size={13} strokeWidth={1.75}/>{ct('attached',lang)}</> : ct('photoHint',lang)}
        </span>
      </span>
      <span style={{display:'flex',alignItems:'center',gap:4,fontSize:14,fontWeight:500,color:'#0b5d56',flexShrink:0}}>
        {!image && <Camera size={16} strokeWidth={1.75}/>}{image ? ct('change',lang) : ct('takePhoto',lang)}
      </span>
    </label>
  )

  return (
    <div>
      <Section id="sec-sales" title={ct('salesSection',lang)} note={ct('q_salesHint',lang)}>
        <Row label={ct('totalSalesRow',lang)} first><MoneyField value={totalSales} onChange={setTotalSales} currency={curr} strong/></Row>
      </Section>

      <Section id="sec-network" title={ct('networkSection',lang)} note={ct('networkNote',lang)}>
        <Row label={ct('mada',lang)} first><MoneyField value={madaAmount} onChange={setMadaAmount} currency={curr} error={!!networkError}/></Row>
        <Row label={ct('visa',lang)}><MoneyField value={visaAmount} onChange={setVisaAmount} currency={curr} error={!!networkError}/></Row>
        <Row label={ct('mastercard',lang)}><MoneyField value={mastercardAmount} onChange={setMastercardAmount} currency={curr} error={!!networkError}/></Row>
        {anyNetworkEntered && <Row label={<span style={{color:'#4b5565',fontSize:14}}>{ct('networkTotal',lang)}</span>}><Figure value={network}/></Row>}
        {networkError && <div style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderTop:'1px solid #e5e7eb',fontSize:13,color:'#dc2626'}}><AlertTriangle size={14} strokeWidth={1.75}/>{networkError}</div>}
      </Section>

      <Section id="sec-delivery" title={ct('deliverySection',lang)}>
        {deliveryApps.map((name,i)=>(
          <Row key={name} label={name} first={i===0}>
            <MoneyField value={deliveryAmounts[name]||''} onChange={v=>setDeliveryAmounts(prev=>({...prev,[name]:v}))} currency={curr}/>
            <button type="button" onClick={()=>removeDeliveryApp(name)} aria-label="حذف" style={{width:32,height:32,flexShrink:0,border:'none',background:'transparent',color:'#6b7487',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',marginInlineStart:-6}}><X size={16} strokeWidth={1.75}/></button>
          </Row>
        ))}
        {!appPickerOpen ? (
          <button type="button" onClick={()=>setAppPickerOpen(true)}
            style={{width:'100%',minHeight:52,padding:'0 16px',border:'none',borderTop:deliveryApps.length?'1px solid #e5e7eb':'none',background:'white',color:'#0b5d56',fontSize:15,fontWeight:500,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:8}}>
            <Plus size={18} strokeWidth={1.75}/>{ct('addDeliveryApp',lang).replace(/^\+\s*/,'')}
          </button>
        ) : (
          <div style={{padding:12,borderTop:deliveryApps.length?'1px solid #e5e7eb':'none'}}>
            <div style={{display:'flex',flexWrap:'wrap' as const,gap:8}}>
              {deliveryChoices.filter(n=>!deliveryApps.includes(n)).map(name=>(
                <button key={name} type="button" onClick={()=>addDeliveryApp(name)}
                  style={{height:40,padding:'0 14px',borderRadius:8,border:'1px solid #e5e7eb',background:'#f4f5f6',color:'#111827',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>{name}</button>
              ))}
              {!otherAppOpen && (
                <button type="button" onClick={()=>setOtherAppOpen(true)}
                  style={{height:40,padding:'0 14px',borderRadius:8,border:'1px dashed #9ca3af',background:'transparent',color:'#111827',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>+ {ct('otherApp',lang)}</button>
              )}
            </div>
            {otherAppOpen && (
              <div style={{display:'flex',gap:8,marginTop:10}}>
                <input value={otherAppName} onChange={e=>setOtherAppName(e.target.value)} maxLength={40} placeholder={ct('appNamePh',lang)} autoFocus
                  onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addDeliveryApp(otherAppName) } }}
                  style={{flex:1,minWidth:0,height:40,padding:'0 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:16,fontFamily:'inherit',outline:'none',boxSizing:'border-box',color:'#111827',background:'white'}}/>
                <button type="button" onClick={()=>addDeliveryApp(otherAppName)} disabled={!otherAppName.trim()}
                  style={{padding:'0 14px',borderRadius:8,border:'none',background:otherAppName.trim()?'#0f766e':'#e5e7eb',color:'white',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{ct('addApp',lang)}</button>
              </div>
            )}
            <button type="button" onClick={()=>{setAppPickerOpen(false);setOtherAppOpen(false);setOtherAppName('')}}
              style={{display:'block',margin:'10px auto 0',border:'none',background:'none',color:'#4b5565',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{ct('cancelPick',lang)}</button>
          </div>
        )}
      </Section>

      <Section id="sec-withdraw" title={ct('withdrawSection',lang)}>
        <Row label={ct('withdrawToggle',lang)} hint={ct('q_withdrawHint',lang)} first onClick={()=>setHasPurchases(withdrawals?'no':'yes')}>
          <span role="switch" aria-checked={withdrawals} style={{width:44,height:26,borderRadius:13,background:withdrawals?'#0f766e':'#d1d5db',position:'relative',flexShrink:0,transition:'background-color .15s'}}>
            <span style={{position:'absolute',top:3,insetInlineStart:withdrawals?21:3,width:20,height:20,borderRadius:10,background:'white',boxShadow:'0 1px 2px rgba(0,0,0,.2)',transition:'inset-inline-start .15s'}}/>
          </span>
        </Row>
        {withdrawals && (
          <>
            {purchases.map((p,idx)=>(
              <div key={idx} style={{display:'flex',gap:8,alignItems:'center',padding:'8px 16px',borderTop:'1px solid #e5e7eb'}}>
                <input type="text" value={p.reason} onChange={e=>updatePurchase(idx,'reason',e.target.value)} placeholder={ct('reasonPh',lang)}
                  style={{flex:1,minWidth:0,height:40,padding:'0 10px',border:'none',borderRadius:8,fontSize:15,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#f4f5f6',color:'#111827'}}/>
                <label className="mf" style={{display:'flex',alignItems:'center',gap:6,width:120,flexShrink:0,height:40,padding:'0 10px',borderRadius:8,background:'#f4f5f6',border:'1px solid transparent'}}>
                  <NumberInput value={p.amount} onChange={e=>updatePurchase(idx,'amount',e.target.value)} placeholder="0.00"
                    style={{flex:1,minWidth:0,border:'none',outline:'none',background:'transparent',fontSize:16,fontWeight:500,fontFamily:"'IBM Plex Mono',ui-monospace,monospace",padding:0,direction:'ltr',textAlign:'right',color:'#111827'}}/>
                </label>
                {purchases.length>1 && (
                  <button type="button" onClick={()=>removePurchaseRow(idx)} aria-label="حذف" style={{width:28,height:32,flexShrink:0,border:'none',background:'transparent',color:'#6b7487',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16} strokeWidth={1.75}/></button>
                )}
              </div>
            ))}
            <button type="button" onClick={addPurchaseRow}
              style={{width:'100%',minHeight:48,padding:'0 16px',border:'none',borderTop:'1px solid #e5e7eb',background:'white',color:'#0b5d56',fontSize:15,fontWeight:500,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:8}}>
              <Plus size={18} strokeWidth={1.75}/>{ct('addExpenseRow',lang).replace(/^\+\s*/,'')}
            </button>
            {totalPurchasesNow>0 && <Row label={<span style={{color:'#4b5565',fontSize:14}}>{ct('totalWithdrawals',lang)}</span>}><Figure value={totalPurchasesNow}/></Row>}
          </>
        )}
      </Section>

      <Section id="sec-cash" title={ct('cashSection',lang)}>
        <Row label={<span style={{color:'#4b5565'}}>{ct('expectedCashPreview',lang)}</span>} first><Figure value={expectedCash} color="#4b5565"/></Row>
        <Row label={<span style={{fontWeight:500}}>{ct('actualCashRow',lang)}</span>}><MoneyField value={cashAmount} onChange={setCashAmount} currency={curr} strong/></Row>
        {showDiff && (
          <Row label={ct('differenceLbl',lang)}>
            <span style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:diffColor}}>
              {status==='balanced' ? <CheckCircle2 size={15} strokeWidth={1.75}/> : <AlertTriangle size={15} strokeWidth={1.75}/>}
              {diffLabel}
              {status!=='balanced' && <Figure value={Math.abs(difference)} color={diffColor} strong/>}
            </span>
          </Row>
        )}
      </Section>

      <Section id="sec-photos" title={ct('photosSection',lang)} note={ct('required',lang)}>
        {photoRow(ct('salesReportImg',lang), salesImage, salesPreview, uploadingSales, 'sales', ()=>setSalesImage(''), true)}
        {photoRow(ct('networkBalanceImg',lang), networkImage, networkPreview, uploadingNetwork, 'network', ()=>setNetworkImage(''))}
      </Section>

      {/* زر المراجعة مباشرة بعد آخر قسم */}
      <button type="button" onClick={openReview}
        style={{width:'100%',height:52,marginTop:24,background:'#0f766e',color:'white',border:'none',borderRadius:10,fontSize:16,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
        {ct('reviewAndClose',lang)}
      </button>
      {showDiff && (
        <div style={{textAlign:'center' as const,fontSize:13,color:diffColor,marginTop:10}}>
          {ct('differenceLbl',lang)}: {diffLabel}{status!=='balanced' ? ` ${fmt(Math.abs(difference))} ${curr}` : ''}
        </div>
      )}
    </div>
  )
}
