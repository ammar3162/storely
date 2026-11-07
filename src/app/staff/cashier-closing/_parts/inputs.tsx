'use client'
import NumberInput from '@/components/NumberInput'
import { CASHIER_EXTRA } from '@/lib/staffI18n/cashier'
import { STEPS_AR, STEPS_EN } from './strings'
import { AlertTriangle, Check, X } from 'lucide-react'

export function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function MoneyInput({ value, onChange, placeholder, icon, iconBg, iconColor, error, currency, onEnter }: any) {
  return (
    <div>
      <div style={{position:'relative'}}>
        <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',width:32,height:32,borderRadius:8,background:'#eceef1',color:'#4b5565',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>
          {icon}
        </div>
        <NumberInput value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          enterKeyHint={onEnter ? 'next' : undefined} onKeyDown={onEnter ? (e:any)=>{ if(e.key==='Enter'){ e.preventDefault(); (e.target as HTMLInputElement).blur(); onEnter() } } : undefined}
          style={{width:'100%',height:52,padding:'0 54px 0 46px',border:`1px solid ${error?'#dc2626':'#e5e7eb'}`,borderRadius:10,fontSize:18,fontWeight:500,fontVariantNumeric:'tabular-nums',fontFamily:'inherit',outline:'none',boxSizing:'border-box',direction:'ltr',textAlign:'right',color:'#111827',transition:'border-color .15s',background:error?'#fef7f7':'white'}}
          onFocus={e=>{if(!error)e.target.style.borderColor='#0f766e'}}
          onBlur={e=>{if(!error)e.target.style.borderColor='#e5e7eb'}}
        />
        <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'#6b7487'}}>{currency || '⃁'}</span>
      </div>
      {error && <div style={{fontSize:13,color:'#dc2626',marginTop:6,display:'flex',alignItems:'center',gap:4}}><AlertTriangle size={13}/> {error}</div>}
    </div>
  )
}

// خانة مبلغ صغيرة: الاسم فوق والرقم تحته داخل نفس الإطار — الخط 16 عشان الآيفون ما يقرّب الشاشة وقت الكتابة
export function AmountTile({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: boolean }) {
  const filled = Number(value) > 0
  return (
    <label className="amt-tile" style={{display:'block',minWidth:0,border:`1px solid ${error?'#dc2626':filled?'#9ca3af':'#e5e7eb'}`,borderRadius:10,background:error?'#fef7f7':'white',padding:'8px 12px 6px',cursor:'text',transition:'background .15s,border-color .15s'}}>
      <span style={{display:'block',fontSize:13,color:'#4b5565',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</span>
      <NumberInput value={value} onChange={e=>onChange(e.target.value)} placeholder="0.00"
        style={{display:'block',width:'100%',border:'none',outline:'none',background:'transparent',fontSize:17,fontWeight:500,fontVariantNumeric:'tabular-nums',padding:'2px 0',direction:'ltr',textAlign:'right',fontFamily:'inherit',color:'#111827',boxSizing:'border-box'}}/>
    </label>
  )
}

// سطر تطبيق توصيل: الاسم بجهة والمبلغ بالجهة الثانية — قائمة مرتبة بدل مربعات كبيرة
export function DeliveryRow({ name, value, onChange, onRemove, currency, last }: { name: string; value: string; onChange: (v: string) => void; onRemove: () => void; currency: string; last?: boolean }) {
  const filled = Number(value) > 0
  return (
    <label className="dl-row" style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderBottom:last?'none':'1px solid #e5e7eb',background:'white',cursor:'text',transition:'background .15s'}}>
      <span style={{flex:1,minWidth:0,fontSize:15,fontWeight:500,color:'#111827',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
      <span className="dl-field" style={{display:'flex',alignItems:'center',gap:6,width:'46%',flexShrink:0,background:'#f4f5f6',border:'1px solid transparent',borderRadius:8,padding:'0 10px',transition:'all .15s'}}>
        <NumberInput value={value} onChange={e=>onChange(e.target.value)}
          style={{flex:1,minWidth:0,border:'none',outline:'none',background:'transparent',fontSize:16,fontWeight:500,fontVariantNumeric:'tabular-nums',padding:'9px 0',direction:'ltr',textAlign:'right',fontFamily:'inherit',color:'#111827'}}/>
        <span style={{fontSize:12,color:'#6b7487'}}>{currency}</span>
      </span>
      <button type="button" onClick={e=>{e.preventDefault(); onRemove()}} aria-label="حذف"
        style={{width:32,height:32,flexShrink:0,borderRadius:8,border:'none',background:'transparent',color:'#6b7487',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16} strokeWidth={1.75}/></button>
    </label>
  )
}

// شاشة سؤال كاملة: سؤال كبير، سطر توضيح، وتحته الإجابة
export function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="fu" style={{paddingTop:8,paddingBottom:24}}>
      <h2 style={{fontSize:24,fontWeight:600,lineHeight:'34px',color:'#111827'}}>{title}</h2>
      {hint && <p style={{fontSize:15,lineHeight:'22px',color:'#4b5565',marginTop:6}}>{hint}</p>}
      <div style={{marginTop:24}}>{children}</div>
    </div>
  )
}

// خانة مبلغ كبيرة لشاشة السؤال — الرقم بخط الإيصال، و«انتقال» في الكيبورد = التالي
export function BigMoney({ value, onChange, currency, onEnter, autoFocus, error }: { value: string; onChange: (v: string) => void; currency: string; onEnter?: () => void; autoFocus?: boolean; error?: boolean }) {
  return (
    <label className="big-money" style={{display:'flex',alignItems:'center',gap:12,height:76,padding:'0 18px',background:'white',border:`1.5px solid ${error?'#dc2626':'#111827'}`,borderRadius:14,cursor:'text'}}>
      <NumberInput value={value} onChange={e=>onChange(e.target.value)} placeholder="0.00" autoFocus={autoFocus}
        enterKeyHint={onEnter ? 'next' : undefined}
        onKeyDown={onEnter ? (e:any)=>{ if(e.key==='Enter'){ e.preventDefault(); onEnter() } } : undefined}
        style={{flex:1,minWidth:0,border:'none',outline:'none',background:'transparent',fontSize:32,fontWeight:500,fontFamily:"'IBM Plex Mono',ui-monospace,monospace",fontVariantNumeric:'tabular-nums',direction:'ltr',textAlign:'right',color:'#111827',padding:0}}/>
      <span style={{fontSize:15,color:'#6b7487',flexShrink:0}}>{currency || '⃁'}</span>
    </label>
  )
}

// سطر مبلغ في قائمة (الشبكة): الاسم بجهة والخانة بالجهة الثانية
export function MoneyRow({ label, value, onChange, currency, onEnter, last }: { label: string; value: string; onChange: (v: string) => void; currency: string; onEnter?: () => void; last?: boolean }) {
  return (
    <label className="dl-row" style={{display:'flex',alignItems:'center',gap:12,minHeight:64,padding:'8px 16px',borderBottom:last?'none':'1px solid #e5e7eb',background:'white',cursor:'text'}}>
      <span style={{flex:1,fontSize:17,fontWeight:500,color:'#111827'}}>{label}</span>
      <span className="dl-field" style={{display:'flex',alignItems:'center',gap:6,width:'52%',flexShrink:0,background:'#f4f5f6',border:'1px solid transparent',borderRadius:10,padding:'0 12px'}}>
        <NumberInput value={value} onChange={e=>onChange(e.target.value)} placeholder="0.00"
          enterKeyHint={onEnter ? 'next' : undefined}
          onKeyDown={onEnter ? (e:any)=>{ if(e.key==='Enter'){ e.preventDefault(); onEnter() } } : undefined}
          style={{flex:1,minWidth:0,border:'none',outline:'none',background:'transparent',fontSize:20,fontWeight:500,fontFamily:"'IBM Plex Mono',ui-monospace,monospace",padding:'11px 0',direction:'ltr',textAlign:'right',color:'#111827'}}/>
        <span style={{fontSize:13,color:'#6b7487'}}>{currency}</span>
      </span>
    </label>
  )
}

export const STEP_KEYS = ['s_data','s_expenses','s_photos','s_review']
export function ProgressBar({ step, lang, sub = 0 }: { step: number; lang: string; sub?: number }) {
  // تقدّم كل الشاشات (8): البيانات 4، المسحوبات 1، الصور 2، المراجعة 1
  const idx = (step===1 ? sub : step===2 ? 4 : step===3 ? 5 + sub : 7)
  const pct = Math.round(((idx + 1) / 8) * 100)
  const STEPS = lang==='en' ? STEPS_EN : lang==='ar' ? STEPS_AR : STEPS_AR.map((s,i)=>({ ...s, label: (CASHIER_EXTRA[STEP_KEYS[i]] as any)?.[lang] || STEPS_EN[i].label }))
  // شريط خطوات أبيض تحت الرأس: المكتمل رمادي، الحالي أسود، والخطوط رفيعة
  return (
    <div style={{background:'white',borderBottom:'1px solid #e5e7eb',position:'relative'}}>
      <div style={{position:'absolute',insetInlineStart:0,bottom:-1,height:2,width:`${pct}%`,background:'#0f766e',transition:'width .3s cubic-bezier(.22,1,.36,1)'}}/>
      <div style={{maxWidth:520,margin:'0 auto',padding:'12px 16px',display:'flex',alignItems:'center',gap:6}}>
        {STEPS.map((s, i) => (
          <div key={s.key} style={{display:'flex',alignItems:'center',gap:6,flex:i<STEPS.length-1?1:'unset',minWidth:0}}>
            <span style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:step===s.key?600:400,color:step===s.key?'#111827':'#6b7487',whiteSpace:'nowrap'}}>
              <span style={{width:22,height:22,borderRadius:11,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:12,fontVariantNumeric:'tabular-nums',flexShrink:0,
                background: step===s.key ? '#111827' : '#eceef1', color: step===s.key ? 'white' : step>s.key ? '#0f766e' : '#4b5565'}}>
                {step>s.key ? <Check size={13} strokeWidth={2.25}/> : s.key}
              </span>
              {s.label}
            </span>
            {i<STEPS.length-1 && <span style={{flex:1,height:1,minWidth:8,background:'#e5e7eb'}}/>}
          </div>
        ))}
      </div>
    </div>
  )
}
