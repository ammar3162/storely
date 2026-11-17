import type { ReactNode } from 'react'

// جوال بإطار رفيع (معدن كحلي غامق + فتحة الكاميرا) وبداخله شاشة ستورلي الحقيقية — مثل عرض أبل لتطبيقاتها.
// الشاشة لقطة حقيقية من التطبيق؛ الإطار فقط هو المرسوم.
export default function Phone({ src, alt = '', w = 720, h = 1559, className = '', eager = false, children }: {
  src?: string; alt?: string; w?: number; h?: number; className?: string; eager?: boolean; children?: ReactNode
}) {
  return (
    <div className={`ap-phone ${className}`}>
      <div className="ap-phone-screen">
        {children ?? <img src={src} alt={alt} width={w} height={h} loading={eager ? undefined : 'lazy'} decoding="async" />}
      </div>
      <span className="ap-island" aria-hidden="true" />
    </div>
  )
}
