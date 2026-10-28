'use client'
// زر اللغة لصفحات الموظف — نفس القائمة بكل الصفحات، والاختيار ينطبق عليها كلها
import { useEffect, useRef, useState } from 'react'
import { Globe, Check } from 'lucide-react'
import { STAFF_LANGS, useStaffLang } from '@/lib/staffLang'
import { staffHeaderBtn } from '@/components/StaffHeader'

export default function StaffLangButton({ style }: { style?: React.CSSProperties }) {
  const { lang, setLang } = useStaffLang()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const cur = STAFF_LANGS.find(l => l.code === lang)
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} aria-label="Language" style={{ ...staffHeaderBtn, ...style }}>
        <Globe size={15} strokeWidth={2.25} />{cur?.code.toUpperCase()}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 44, insetInlineEnd: 0, background: 'white', borderRadius: 12, boxShadow: '0 12px 32px rgba(15,23,42,.2)', overflow: 'hidden', zIndex: 300, minWidth: 160 }}>
          {STAFF_LANGS.map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false) }} dir={l.rtl ? 'rtl' : 'ltr'}
              style={{ width: '100%', padding: '11px 14px', border: 'none', borderBottom: '1px solid #f1f5f9', background: lang === l.code ? '#f0fdfa' : 'white', color: lang === l.code ? '#0f766e' : '#1e293b', fontSize: 13, fontWeight: lang === l.code ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1 }}>{l.label}</span>{lang === l.code && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
