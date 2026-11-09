'use client'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { T } from './strings'

// رأس ثابت لنوافذ الصرف السفلية: زر «رجوع» + العنوان، يبقى ظاهر لو النافذة أطول من الشاشة وتمررت
export const sheetStyle = {
  background: 'white', borderRadius: '24px 24px 0 0', padding: '0 24px calc(24px + env(safe-area-inset-bottom))', width: '100%', maxWidth: 480,
  maxHeight: '92dvh', overflowY: 'auto' as const, overscrollBehavior: 'contain' as const, animation: 'slideUp .3s ease',
}

export default function SheetTop({ lang, onBack, title, children }: { lang: string; onBack: () => void; title?: React.ReactNode; children?: React.ReactNode }) {
  const rtl = lang === 'ar' || lang === 'ur'
  const Icon = rtl ? ChevronRight : ChevronLeft
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'white', padding: '16px 0 12px', marginBottom: 12, borderBottom: '1px solid var(--storely-border)' }}>
      <button type="button" onClick={onBack} aria-label={T('back', lang)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 36, padding: '0 12px 0 8px', borderRadius: 10, border: '1px solid var(--storely-border)', background: 'white', color: '#111827', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: title || children ? 10 : 0 }}>
        <Icon size={18} strokeWidth={2} /> {T('back', lang)}
      </button>
      {title && <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--storely-text)' }}>{title}</div>}
      {children}
    </div>
  )
}
