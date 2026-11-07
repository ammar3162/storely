'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { PlayCircle, X } from 'lucide-react'
import { helpKeyFor } from '@/lib/helpVideos'

// زر «كيف أستخدم الصفحة؟» — يطلع بس لو للصفحة فيديو، والفيديو ما ينحمّل إلا لما ينضغط
type V = Record<string, { id: string; title: string | null }>
let cache: Promise<V> | null = null
const load = () => (cache ||= fetch('/api/help-videos').then(r => r.json()).then(j => (j.videos || {}) as V).catch(() => { cache = null; return {} as V }))

export default function HelpVideoButton({ variant = 'icon' }: { variant?: 'icon' | 'floating' }) {
  const pathname = usePathname()
  const [videos, setVideos] = useState<V | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => { load().then(setVideos) }, [])
  useEffect(() => { setOpen(false) }, [pathname])
  const key = helpKeyFor(pathname)
  const v = key && videos ? videos[key] : null
  if (!v) return null
  const label = 'كيف أستخدم الصفحة؟'
  return (
    <>
      {variant === 'icon' ? (
        <button className="sh-icon-btn" title={label} aria-label={label} onClick={() => setOpen(true)} style={{ color: '#0f766e' }}><PlayCircle size={20} /></button>
      ) : (
        <button onClick={() => setOpen(true)} aria-label={label}
          style={{ position: 'fixed', insetInlineEnd: 14, bottom: 'calc(env(safe-area-inset-bottom) + 18px)', zIndex: 60, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 99, border: 'none',
            background: '#0f766e', color: '#fff', fontSize: 13, fontWeight: 800, fontFamily: 'inherit', boxShadow: '0 8px 20px rgba(15,118,110,.35)', cursor: 'pointer' }}>
          <PlayCircle size={17} /> شرح الصفحة
        </button>
      )}
      {open && (
        <div role="dialog" aria-modal="true" aria-label={v.title || label} onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,6,23,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 900, background: '#000', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', background: '#0b1413', color: '#fff', fontSize: 14, fontWeight: 700 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title || label}</span>
              <button onClick={() => setOpen(false)} aria-label="إغلاق" style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'inline-flex' }}><X size={18} /></button>
            </div>
            <div style={{ position: 'relative', paddingTop: '56.25%' }}>
              <iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title={v.title || label} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
