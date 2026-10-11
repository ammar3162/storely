'use client'
import { useState } from 'react'

// قائمة اختيار — ولو اختار «أخرى» تطلع خانة يكتب فيها الاسم اللي يبيه (الفئة أو الوحدة)
export default function SelectOrOther({ value, onChange, options, style, placeholder = 'اكتب الاسم', emptyLabel, emptyValue = '', label = o => o }: {
  value: string; onChange: (v: string) => void; options: string[]; style?: React.CSSProperties
  placeholder?: string; emptyLabel?: string; emptyValue?: string; label?: (o: string) => string
}) {
  const base = options.filter(o => o !== 'أخرى')
  const isCustom = !!value && value !== emptyValue && !base.includes(value)
  const [other, setOther] = useState(isCustom)
  const showInput = other || isCustom
  const typed = value === 'أخرى' ? '' : value
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <select value={showInput ? 'أخرى' : value} style={{ ...style, ...(emptyLabel && !value ? { color: '#94a3b8' } : {}) }}
        onChange={e => {
          const v = e.target.value
          if (v === 'أخرى') { setOther(true); onChange('أخرى') } else { setOther(false); onChange(v) }
        }}>
        {emptyLabel !== undefined && <option value={emptyValue}>{emptyLabel}</option>}
        {base.map(o => <option key={o} value={o}>{label(o)}</option>)}
        <option value="أخرى">{label('أخرى')}…</option>
      </select>
      {showInput && (
        <input autoFocus={other && !isCustom} value={typed} maxLength={40} placeholder={placeholder}
          onChange={e => onChange(e.target.value.trimStart() || 'أخرى')} style={style} />
      )}
    </div>
  )
}
