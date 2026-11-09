'use client'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { T } from './strings'

// نوافذ الصرف السفلية: رأس ثابت فوق (زر «رجوع» + العنوان) وزر الحفظ ثابت تحت (SheetFoot)،
// والمحتوى بينهم يتمرر لو النافذة أطول من الشاشة — عشان الأزرار تبقى ظاهرة على أي جوال
export const sheetStyle = {
  background: 'white', borderRadius: '20px 20px 0 0', padding: '0 20px', width: '100%', maxWidth: 480,
  maxHeight: '94dvh', overflowY: 'auto' as const, overscrollBehavior: 'contain' as const, animation: 'slideUp .3s ease',
}

export default function SheetTop({ lang, onBack, title, children }: { lang: string; onBack: () => void; title?: React.ReactNode; children?: React.ReactNode }) {
  const rtl = lang === 'ar' || lang === 'ur'
  const Icon = rtl ? ChevronRight : ChevronLeft
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'white', padding: '14px 0 10px', marginBottom: 12, borderBottom: '1px solid var(--storely-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <button type="button" onClick={onBack} aria-label={T('back', lang)}
        style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 2, height: 40, padding: '0 12px 0 8px', borderRadius: 10, border: '1px solid var(--storely-border)', background: 'white', color: '#111827', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Icon size={18} strokeWidth={2} /> {T('back', lang)}
      </button>
      <div style={{ minWidth: 0, flex: 1 }}>
        {title && <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--storely-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>}
        {children}
      </div>
    </div>
  )
}

/** زر الحفظ ثابت أسفل النافذة (فوق منطقة الأمان بالآيفون) */
export function SheetFoot({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'sticky', bottom: 0, zIndex: 2, background: 'white', margin: '0 -20px', padding: '10px 20px calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--storely-border)' }}>
      {children}
    </div>
  )
}
