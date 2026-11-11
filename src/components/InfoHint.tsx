'use client'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Info, X } from 'lucide-react'

// شرح الأرقام المحسوبة: ٢–٣ أسطر قصيرة، والتفاصيل تحت «المزيد».
// الاتجاه يتبع لغة الواجهة (html dir). الكمبيوتر: فقاعة بجانب الزر. الجوال (أقل من 640px): شريحة من أسفل الشاشة.
// trigger: أيقونة «ⓘ» (لعناوين البطاقات) أو نص بخط منقّط (لأسماء الأرقام الصغيرة).
export type InfoSection = { h: string; p: string[] }
export type InfoContent = { summary: string[]; more?: InfoSection[] }

type Props = InfoContent & { title: string; size?: number; label?: string; children?: ReactNode }

const W = 340, GAP = 8, EDGE = 12

export default function InfoHint({ title, summary, more, size = 16, label, children }: Props) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const aria = label || `شرح: ${title}`

  const close = () => { setOpen(false); setExpanded(false); btn.current?.focus() }

  // موضع الفقاعة: تحت الزر، وفوقه إذا ما فيه مكان، ولا تطلع خارج الشاشة
  const place = () => {
    const b = btn.current?.getBoundingClientRect(); if (!b) return
    const h = pop.current?.offsetHeight || 220
    const left = Math.min(Math.max(EDGE, b.left + b.width / 2 - W / 2), window.innerWidth - W - EDGE)
    const up = b.bottom + GAP + h > window.innerHeight - EDGE && b.top - GAP - h > EDGE
    setPos({ left, up, top: up ? b.top - GAP - h : b.bottom + GAP })
  }
  useLayoutEffect(() => { if (open && !mobile) place() }, [open, mobile, expanded])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onDown = (e: MouseEvent) => { if (!mobile && !pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close() }
    const onMove = () => { if (!mobile) place() }
    window.addEventListener('keydown', onKey); document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onMove); window.addEventListener('scroll', onMove, true)
    const prev = document.body.style.overflow
    if (mobile) document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', onMove); window.removeEventListener('scroll', onMove, true)
      document.body.style.overflow = prev
    }
  }, [open, mobile])   // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (open) return close()
    setMobile(window.innerWidth < 640); setPos(null); setOpen(true)
  }

  const body = (
    <>
      <div className="space-y-1.5">
        {summary.map(t => <p key={t} className="text-[14px] font-normal leading-6 text-[#203640]">{t}</p>)}
      </div>
      {more?.length ? (
        <>
          <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#203640] underline-offset-4 hover:underline">
            {expanded ? 'إخفاء التفاصيل' : 'المزيد'}
            <ChevronDown size={14} className={expanded ? 'rotate-180' : ''} />
          </button>
          {expanded ? (
            <div className="mt-3 space-y-3 border-t border-[#E6ECEF] pt-3">
              {more.map(s => (
                <div key={s.h}>
                  <div className="mb-0.5 text-[13px] font-semibold text-[#203640]">{s.h}</div>
                  {s.p.map(t => <p key={t} className="text-[13px] font-normal leading-6 text-[#4b5565]">{t}</p>)}
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </>
  )

  return (
    <>
      {children ? (
        <button ref={btn} type="button" onClick={toggle} aria-label={aria} aria-expanded={open}
          className="cursor-help rounded-sm text-inherit underline decoration-[#9AA7AE] decoration-dotted decoration-1 underline-offset-[5px] hover:decoration-[#203640] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#203640]">
          {children}
        </button>
      ) : (
        <button ref={btn} type="button" onClick={toggle} aria-label={aria} title={aria} aria-expanded={open}
          className="inline-flex shrink-0 items-center justify-center rounded-md p-1 align-middle text-[#66737C] hover:bg-[#EEF2F4] hover:text-[#203640] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#203640]">
          <Info size={size} />
        </button>
      )}
      {open && typeof document !== 'undefined' ? createPortal(
        mobile ? (
          <div role="dialog" aria-modal="true" aria-label={title} onClick={close} className="fixed inset-0 z-[1000] flex items-end bg-[rgba(2,6,23,.45)]">
            <div onClick={e => e.stopPropagation()} className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-white px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 text-start">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#DEE6EA]" />
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[15px] font-semibold text-[#203640]">{title}</div>
                <button type="button" onClick={close} aria-label="إغلاق" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#66737C] hover:bg-[#EEF2F4]"><X size={18} /></button>
              </div>
              {body}
            </div>
          </div>
        ) : (
          <div ref={pop} role="dialog" aria-label={title}
            style={{ width: W, top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className="fixed z-[1000] max-h-[70vh] overflow-y-auto rounded-xl border border-[#DEE6EA] bg-white p-4 text-start shadow-[0_12px_32px_rgba(15,23,42,.14)]">
            <div className="mb-1.5 text-[14px] font-semibold text-[#203640]">{title}</div>
            {body}
          </div>
        ),
        document.body,
      ) : null}
    </>
  )
}
