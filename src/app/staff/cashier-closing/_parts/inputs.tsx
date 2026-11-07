'use client'
import NumberInput from '@/components/NumberInput'
import type { ReactNode } from 'react'

export function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const MONO = "'IBM Plex Mono',ui-monospace,monospace"

// عنوان قسم فوق المجموعة: الاسم يمين، وتوضيح صغير يسار
export function Section({ id, title, note, children }: { id?: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={id} style={{scrollMarginTop:80}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8,margin:'20px 4px 8px'}}>
        <span style={{fontSize:13,fontWeight:500,color:'#4b5565'}}>{title}</span>
        {note && <span style={{fontSize:12,color:'#6b7487',textAlign:'end' as const}}>{note}</span>}
      </div>
      <div style={{background:'white',border:'1px solid #e5e7eb',borderRadius:14,overflow:'hidden'}}>{children}</div>
    </section>
  )
}

// سطر داخل المجموعة: الاسم يمين، والقيمة/الخانة يسار
export function Row({ label, hint, children, first, onClick }: { label: ReactNode; hint?: ReactNode; children?: ReactNode; first?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{display:'flex',alignItems:'center',gap:12,minHeight:52,padding:'6px 16px',borderTop:first?'none':'1px solid #e5e7eb',cursor:onClick?'pointer':'default'}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:15,color:'#111827'}}>{label}</div>
        {hint && <div style={{fontSize:12,color:'#6b7487',marginTop:1}}>{hint}</div>}
      </div>
      {children}
    </div>
  )
}

// خانة مبلغ داخل السطر — رمادية، تصير بيضاء بإطار أخضر وقت الكتابة
export function MoneyField({ value, onChange, currency, error, strong }: { value: string; onChange: (v: string) => void; currency: string; error?: boolean; strong?: boolean }) {
  return (
    <label className="mf" style={{display:'flex',alignItems:'center',gap:6,width:148,flexShrink:0,height:40,padding:'0 10px',borderRadius:8,background:error?'#fef2f2':'#f4f5f6',border:`1px solid ${error?'#dc2626':'transparent'}`,cursor:'text'}}>
      <NumberInput value={value} onChange={e=>onChange(e.target.value)} placeholder="0.00"
        style={{flex:1,minWidth:0,border:'none',outline:'none',background:'transparent',fontSize:strong?17:16,fontWeight:500,fontFamily:MONO,padding:0,direction:'ltr',textAlign:'right',color:'#111827'}}/>
      <span style={{fontSize:12,color:'#6b7487'}}>{currency}</span>
    </label>
  )
}

// رقم محسوب (للعرض بس)
export function Figure({ value, color, strong }: { value: number; color?: string; strong?: boolean }) {
  return <span style={{fontFamily:MONO,fontVariantNumeric:'tabular-nums',direction:'ltr',fontSize:strong?17:15,fontWeight:500,color:color||'#111827',whiteSpace:'nowrap'}}>{fmt(value)}</span>
}
