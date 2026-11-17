'use client'
// صور الفواتير المرتجعة لإقفال واحد — تقرير الإقفالات (المالك) وتقرير المحاسب
// الصور خاصة: تنفتح عبر /api/file للمالك والمدير والمحاسب المربوط بس
import { useEffect } from 'react'
import { X, AlertTriangle, ExternalLink } from 'lucide-react'
import { fileLink } from '@/lib/invoiceUrl'
import { returnReasonAr, type ClosingReturn } from '@/lib/closingReturns'
import { qtyUnit } from '@/lib/arabicCount'

const arDay = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('ar-SA-u-ca-gregory', { numberingSystem: 'latn', day: 'numeric', month: 'long', timeZone: 'UTC' })

export default function ClosingReturnsDialog({ title, returns, onClose }: { title: string; returns: ClosingReturn[]; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 640, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', background: 'var(--storely-surface, #fff)', borderRadius: 22, padding: 20, boxShadow: 'var(--storely-panel-shadow, 0 24px 60px rgba(0,0,0,.2))', direction: 'rtl' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--storely-text)' }}>الفواتير المرتجعة ({qtyUnit(returns.length, 'فاتورة')})</div>
            <div style={{ fontSize: 15, color: 'var(--storely-muted)', marginTop: 2 }}>{title}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" style={{ width: 36, height: 36, borderRadius: 999, border: 'none', background: 'var(--storely-fill)', color: 'var(--storely-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
          {returns.map(r => (
            <div key={r.invoice_no} style={{ borderRadius: 16, background: 'var(--storely-background)', padding: 8, minWidth: 0 }}>
              <a href={fileLink(r.photo)} target="_blank" rel="noopener noreferrer" title="فتح الصورة كاملة" style={{ display: 'block', position: 'relative' }}>
                <img src={fileLink(r.photo)} alt={`الفاتورة المرتجعة ${r.invoice_no}`} loading="lazy" style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 12, display: 'block', background: 'var(--storely-fill)' }} />
                <span style={{ position: 'absolute', bottom: 6, insetInlineStart: 6, width: 26, height: 26, borderRadius: 999, background: 'rgba(0,0,0,.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ExternalLink size={13} strokeWidth={2} /></span>
              </a>
              <div style={{ padding: '8px 4px 2px' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--storely-text)' }}>فاتورة <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.invoice_no}</span></div>
                <div style={{ fontSize: 13, color: 'var(--storely-muted)', marginTop: 2 }}>{returnReasonAr(r.reason) || 'بدون سبب'}</div>
                {r.dup_of && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start', fontSize: 13, fontWeight: 600, color: '#b54708', marginTop: 4, lineHeight: 1.5 }}>
                    <AlertTriangle size={13} strokeWidth={2} style={{ flexShrink: 0, marginTop: 3 }} />
                    <span>مكررة: سُجّلت مرتجعاً في إقفال {arDay(r.dup_of)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
