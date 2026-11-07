'use client'
import NumberInput from '@/components/NumberInput'
import { ct } from './strings'
import { fmt, Question } from './inputs'
import type { CashierClosing } from './useCashierClosing'
import { Plus, X } from 'lucide-react'

// خطوة المسحوبات: سؤال بشاشة كاملة بخيارين كبار — الانتقال بزر «التالي» بس
export default function StepExpenses({ m }: { m: CashierClosing }) {
  const { lang, step, hasPurchases, setHasPurchases, purchases, curr, totalPurchasesNow, addPurchaseRow, removePurchaseRow, updatePurchase } = m
  if(step!==2) return null
  const option = (val: 'no'|'yes', label: string) => {
    const on = hasPurchases===val
    return (
      <button type="button" onClick={()=>setHasPurchases(val)} aria-pressed={on}
        style={{width:'100%',height:64,padding:'0 18px',borderRadius:14,border:`1.5px solid ${on?'#111827':'#e5e7eb'}`,background:'white',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:12,textAlign:'start' as const,transition:'border-color .15s'}}>
        <span style={{width:22,height:22,borderRadius:11,border:`2px solid ${on?'#0f766e':'#c9cdd3'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          {on && <span style={{width:10,height:10,borderRadius:5,background:'#0f766e'}}/>}
        </span>
        <span style={{fontSize:18,fontWeight:on?600:500,color:'#111827'}}>{label}</span>
      </button>
    )
  }
  return (
    <div key="s2">
      <Question title={ct('step2Title',lang)} hint={ct('q_withdrawHint',lang)}>
        <div style={{display:'grid',gap:10}}>
          {option('no', ct('no',lang))}
          {option('yes', ct('yes',lang))}
        </div>

        {hasPurchases==='yes' && (
          <div style={{marginTop:20}}>
            <div style={{border:'1px solid #e5e7eb',borderRadius:14,overflow:'hidden',background:'white'}}>
              {purchases.map((p,idx)=>(
                <div key={idx} style={{display:'flex',gap:8,alignItems:'center',padding:'10px 12px',borderTop:idx?'1px solid #e5e7eb':'none'}}>
                  <NumberInput value={p.amount} onChange={e=>updatePurchase(idx,'amount',e.target.value)} placeholder={ct('amountPh',lang)}
                    style={{width:'38%',flexShrink:0,height:48,padding:'0 12px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:18,fontWeight:500,fontFamily:"'IBM Plex Mono',ui-monospace,monospace",outline:'none',boxSizing:'border-box',direction:'ltr',textAlign:'right',background:'#f4f5f6'}}/>
                  <input type="text" value={p.reason} onChange={e=>updatePurchase(idx,'reason',e.target.value)} placeholder={ct('reasonPh',lang)}
                    style={{flex:1,minWidth:0,height:48,padding:'0 12px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:16,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#f4f5f6'}}/>
                  {purchases.length>1 && (
                    <button type="button" onClick={()=>removePurchaseRow(idx)} aria-label="حذف" style={{width:36,height:36,flexShrink:0,borderRadius:8,border:'none',background:'transparent',color:'#6b7487',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16} strokeWidth={1.75}/></button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addPurchaseRow} style={{width:'100%',height:48,marginTop:10,borderRadius:12,border:'1px dashed #9ca3af',background:'transparent',color:'#111827',fontSize:15,fontWeight:500,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <Plus size={16} strokeWidth={1.75}/>{ct('addExpenseRow',lang).replace(/^\+\s*/,'')}
            </button>
            {totalPurchasesNow>0 && (
              <div style={{display:'flex',justifyContent:'space-between',marginTop:12,padding:'12px 16px',background:'white',border:'1px solid #e5e7eb',borderRadius:12,fontSize:15}}>
                <span style={{color:'#4b5565'}}>{ct('totalWithdrawals',lang)}</span>
                <span style={{color:'#111827',fontFamily:"'IBM Plex Mono',ui-monospace,monospace",direction:'ltr' as const}}>{fmt(totalPurchasesNow)} <span style={{fontFamily:'inherit',fontSize:13,color:'#6b7487'}}>{curr}</span></span>
              </div>
            )}
          </div>
        )}
      </Question>
    </div>
  )
}
