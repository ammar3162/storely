'use client'
import { useId, useState } from 'react'
import { Plus } from 'lucide-react'

// سؤال واحد: صف بخط رفيع، والإجابة تظهر تحته (مشترك بين الرئيسية وصفحة الأسعار)
export default function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="lp-faq-item">
      <button className="lp-faq-q" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
        <span>{q}</span><Plus size={22} aria-hidden />
      </button>
      {open && <p id={id} className="lp-faq-a">{a}</p>}
    </div>
  )
}
