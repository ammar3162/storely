'use client'
import NumberInput from '@/components/NumberInput'
import { CASHIER_EXTRA } from '@/lib/staffI18n/cashier'
import { STEPS_AR, STEPS_EN } from './strings'
import { AlertTriangle, Check } from 'lucide-react'

export function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function MoneyInput({ value, onChange, placeholder, icon, iconBg, iconColor, error, currency }: any) {
  return (
    <div>
      <div style={{position:'relative'}}>
        <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',width:30,height:30,borderRadius:9,background:iconBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>
          {icon}
        </div>
        <NumberInput value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{width:'100%',padding:'14px 54px 14px 46px',border:`1.5px solid ${error?'#dc2626':'#e5e5e2'}`,borderRadius:12,fontSize:16,fontWeight:700,fontFamily:'inherit',outline:'none',boxSizing:'border-box',direction:'ltr',textAlign:'right',color:'#000',transition:'border-color .15s',background:error?'#fef7f7':'white'}}
          onFocus={e=>{if(!error)e.target.style.borderColor=iconColor}}
          onBlur={e=>{if(!error)e.target.style.borderColor='#e5e5e2'}}
        />
        <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:11,fontWeight:700,color:'#a8a7a1'}}>{currency || '⃁'}</span>
      </div>
      {error && <div style={{fontSize:11,color:'#dc2626',fontWeight:700,marginTop:6,display:'flex',alignItems:'center',gap:4}}><AlertTriangle size={13}/> {error}</div>}
    </div>
  )
}

// خانة مبلغ صغيرة: الاسم فوق والرقم تحته داخل نفس الإطار — الخط 16 عشان الآيفون ما يقرّب الشاشة وقت الكتابة
export function AmountTile({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: boolean }) {
  const filled = Number(value) > 0
  return (
    <label className="amt-tile" style={{display:'block',minWidth:0,border:`1.5px solid ${error?'#dc2626':filled?'#99f6e4':'#e5e5e2'}`,borderRadius:12,background:error?'#fef7f7':filled?'#f0fdfa':'white',padding:'8px 11px 5px',cursor:'text',transition:'background .15s,border-color .15s'}}>
      <span style={{display:'block',fontSize:11.5,fontWeight:800,color:'#000',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</span>
      <NumberInput value={value} onChange={e=>onChange(e.target.value)} placeholder="0.00"
        style={{display:'block',width:'100%',border:'none',outline:'none',background:'transparent',fontSize:16,fontWeight:800,padding:'3px 0 2px',direction:'ltr',textAlign:'right',fontFamily:'inherit',color:'#000',boxSizing:'border-box'}}/>
    </label>
  )
}

// سطر تطبيق توصيل: الاسم بجهة والمبلغ بالجهة الثانية — قائمة مرتبة بدل مربعات كبيرة
export function DeliveryRow({ name, value, onChange, onRemove, currency, last }: { name: string; value: string; onChange: (v: string) => void; onRemove: () => void; currency: string; last?: boolean }) {
  const filled = Number(value) > 0
  return (
    <label className="dl-row" style={{display:'flex',alignItems:'center',gap:10,padding:'7px 12px',borderBottom:last?'none':'1px solid #f1f1ee',background:filled?'#f0fdfa':'white',cursor:'text',transition:'background .15s'}}>
      <span style={{flex:1,minWidth:0,fontSize:14,fontWeight:800,color:'#000',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
      <span className="dl-field" style={{display:'flex',alignItems:'center',gap:6,width:'46%',flexShrink:0,background:filled?'white':'#f7f7f5',border:`1.5px solid ${filled?'#99f6e4':'transparent'}`,borderRadius:10,padding:'0 10px',transition:'all .15s'}}>
        <NumberInput value={value} onChange={e=>onChange(e.target.value)}
          style={{flex:1,minWidth:0,border:'none',outline:'none',background:'transparent',fontSize:16,fontWeight:800,padding:'9px 0',direction:'ltr',textAlign:'right',fontFamily:'inherit',color:'#000'}}/>
        <span style={{fontSize:11,fontWeight:700,color:'#3d3d3a'}}>{currency}</span>
      </span>
      <button type="button" onClick={e=>{e.preventDefault(); onRemove()}} aria-label="حذف"
        style={{width:30,height:30,flexShrink:0,borderRadius:9,border:'none',background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontSize:16,fontWeight:700,lineHeight:1}}>×</button>
    </label>
  )
}

export const STEP_KEYS = ['s_data','s_expenses','s_photos','s_review']
export function ProgressBar({ step, lang }: { step: number; lang: string }) {
  const STEPS = lang==='en' ? STEPS_EN : lang==='ar' ? STEPS_AR : STEPS_AR.map((s,i)=>({ ...s, label: (CASHIER_EXTRA[STEP_KEYS[i]] as any)?.[lang] || STEPS_EN[i].label }))
  return (
    <div style={{display:'flex',alignItems:'center',marginBottom:26}}>
      {STEPS.map((s, i) => (
        <div key={s.key} style={{display:'flex',alignItems:'center',flex:i<STEPS.length-1?1:'unset'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
            <div style={{
              width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:13,fontWeight:800,transition:'all .2s',
              background: step>s.key ? '#0f766e' : step===s.key ? '#0f766e' : '#e5e5e2',
              color: step>=s.key ? 'white' : '#a8a7a1',
              boxShadow: step===s.key ? '0 0 0 4px #ccfbf1' : 'none',
            }}>
              {step>s.key ? <Check size={14} strokeWidth={3}/> : s.key}
            </div>
            <span style={{fontSize:10,fontWeight:700,color: step>=s.key ? '#1c1c1a' : '#a8a7a1',whiteSpace:'nowrap'}}>{s.label}</span>
          </div>
          {i<STEPS.length-1 && (
            <div style={{flex:1,height:2,background: step>s.key ? '#0f766e' : '#e5e5e2',margin:'0 6px 18px',transition:'background .3s'}}/>
          )}
        </div>
      ))}
    </div>
  )
}
