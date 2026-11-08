'use client'
import type { CSSProperties } from 'react'
import { CalendarDays } from 'lucide-react'

// حقل تاريخ بعرض ثابت — الآيفون يعرض حقل التاريخ الفاضي مربعاً صغيراً بلا كتابة،
// فنعرض «placeholder» فوقه لين يختار المستخدم تاريخاً.
export default function DateField({ value, onChange, min, max, placeholder = 'اختر التاريخ', ariaLabel, disabled, style, width = 160 }: {
  value: string; onChange: (v: string) => void; min?: string; max?: string; placeholder?: string; ariaLabel?: string; disabled?: boolean; style?: CSSProperties; width?: number
}) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width, maxWidth: '100%', flexShrink: 0 }}>
      <input type="date" className={value ? undefined : 'df-empty'} value={value} min={min} max={max} disabled={disabled} aria-label={ariaLabel || placeholder}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', minHeight: 34, padding: '5px 10px', fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--storely-border)', borderRadius: 8, background: 'var(--storely-surface)', ...style, color: value ? 'var(--storely-text)' : 'transparent' }} />
      {!value && (
        <span style={{ position: 'absolute', insetInlineStart: 10, fontSize: 12.5, color: 'var(--storely-muted)', pointerEvents: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <CalendarDays size={14} /> {placeholder}
        </span>
      )}
    </span>
  )
}
