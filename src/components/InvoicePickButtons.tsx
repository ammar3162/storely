'use client'
import { INVOICE_ACCEPT_ANY } from '@/lib/invoiceFile'

// ثلاث طرق لإرفاق الفاتورة: تصوير مباشر، من الصور، أو ملف (PDF أو صورة)
export default function InvoicePickButtons({ onFile, disabled, labels, primary, primaryL }: {
  onFile: (f: File) => void; disabled?: boolean
  labels: { camera: string; gallery: string; file: string }
  primary: string; primaryL: string
}) {
  const opts = [
    { k: 'cam', l: labels.camera, accept: 'image/*', cap: true },
    { k: 'gal', l: labels.gallery, accept: 'image/*', cap: false },
    { k: 'file', l: labels.file, accept: INVOICE_ACCEPT_ANY, cap: false },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
      {opts.map(o => (
        <label key={o.k} data-pick={o.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '11px 6px', borderRadius: 10, cursor: disabled ? 'wait' : 'pointer', fontSize: 12.5, fontWeight: 800,
          background: o.cap ? primary : primaryL, color: o.cap ? 'white' : primary, border: `1.5px solid ${primary}`, opacity: disabled ? .6 : 1 }}>
          {/* capture يفتح الكاميرا مباشرة؛ بدونه يفتح الصور أو الملفات */}
          <input type="file" accept={o.accept} {...(o.cap ? { capture: 'environment' as const } : {})} disabled={disabled} style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f) }} />
          {o.l}
        </label>
      ))}
    </div>
  )
}
