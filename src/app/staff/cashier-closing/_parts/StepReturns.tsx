'use client'
import { useRef } from 'react'
import { ct } from './strings'
import type { CashierClosing } from './useCashierClosing'
import { CASHIER_EXTRA } from '@/lib/staffI18n/cashier'
import { RETURN_REASONS, MAX_RETURNS } from '@/lib/closingReturns'
import { Camera, X, RotateCcw, RotateCw, Check } from 'lucide-react'

const NAVY = '#203640'
const reasonText = (r: typeof RETURN_REASONS[number], lang: string) =>
  lang === 'ar' ? r.ar : lang === 'en' ? r.en : ((CASHIER_EXTRA['rr_' + r.key] as any)?.[lang] || r.en)
const latinDigits = (v: string) => v.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))

const pill: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, padding: '0 14px', borderRadius: 999, fontSize: 16, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'background-color .15s,border-color .15s' }

/**
 * المرتجعات بخطوة الصور — أقصر طريق للكاشير:
 * «صوّر فاتورة مرتجعة» يفتح الكاميرا مباشرة → الصورة ترتفع بالخلفية وهو يكتب الرقم (لوحة أرقام) → السبب اختياري من قائمة.
 * «لا توجد» = إقرار من الكاشير. للتوثيق فقط، ما تغيّر حساب الكاش.
 */
export default function StepReturns({ m }: { m: CashierClosing }) {
  const { lang, step, hasReturns, returns, showReturnErrors, updateReturn, addReturnPhoto, retakeReturn, retryReturn, removeReturn, setNoReturns } = m
  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)
  const target = useRef<string | null>(null)                          // null = مرتجع جديد، أو مفتاح صورة تنعاد
  const numRefs = useRef<Record<string, HTMLInputElement | null>>({})
  if (step !== 3) return null

  const pick = (key: string | null, gallery = false) => { target.current = key; (gallery ? galRef : camRef).current?.click() }
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    if (target.current) { retakeReturn(target.current, f); return }
    const key = addReturnPhoto(f)
    if (key) setTimeout(() => numRefs.current[key]?.focus(), 120)
  }
  const many = returns.length > 0

  return (
    <div className="fu" style={{ background: 'white', borderRadius: 20, padding: 16, marginBottom: 16 }}>
      <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: 'none' }} />
      <input ref={galRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />

      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--storely-text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 28, height: 28, borderRadius: 12, background: 'var(--storely-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--storely-muted)', flexShrink: 0 }}><RotateCcw size={16} strokeWidth={1.75} /></span>
        {many ? `${ct('returnsReviewTitle', lang)} (${returns.length})` : ct('returnsTitle', lang)}
      </div>

      {!many && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.7fr)', gap: 8 }}>
          <button type="button" onClick={setNoReturns} aria-pressed={hasReturns === 'no'}
            style={{ ...pill, border: `1px solid ${hasReturns === 'no' ? NAVY : 'var(--storely-border)'}`, background: hasReturns === 'no' ? 'var(--storely-fill)' : 'white', color: hasReturns === 'no' ? NAVY : 'var(--storely-text)' }}>
            {hasReturns === 'no' && <Check size={17} strokeWidth={2} />}{ct('returnsNone', lang)}
          </button>
          <button type="button" onClick={() => pick(null)} style={{ ...pill, border: 'none', background: NAVY, color: 'white' }}>
            <Camera size={19} strokeWidth={1.75} />{ct('snapReturn', lang)}
          </button>
        </div>
      )}

      {many && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {returns.map(r => {
            const missing = showReturnErrors && !r.invoice_no.trim()
            return (
              <div key={r.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 10, borderRadius: 16, background: 'var(--storely-fill)' }}>
                {/* الصورة: ضغطة تعيد التصوير، أو تعيد الرفع لو فشل */}
                <button type="button" onClick={() => (r.failed ? retryReturn(r.key) : pick(r.key))} aria-label={r.failed ? ct('uploadRetry', lang) : ct('retakePhoto', lang)} title={r.failed ? ct('uploadRetry', lang) : ct('retakePhoto', lang)}
                  style={{ position: 'relative', width: 56, height: 56, flexShrink: 0, borderRadius: 12, overflow: 'hidden', border: r.failed ? '2px solid #dc2626' : 'none', padding: 0, background: 'white', cursor: 'pointer' }}>
                  {r.preview && <img src={r.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  {r.uploading && (
                    <span style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ width: 20, height: 20, border: '2.5px solid rgba(32,54,64,.25)', borderTopColor: NAVY, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                    </span>
                  )}
                  {r.failed && (
                    <span style={{ position: 'absolute', inset: 0, background: 'rgba(220,38,38,.75)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RotateCw size={20} strokeWidth={2} /></span>
                  )}
                </button>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input ref={el => { numRefs.current[r.key] = el }} value={r.invoice_no}
                    onChange={e => updateReturn(r.key, { invoice_no: latinDigits(e.target.value).slice(0, 40) })}
                    placeholder={ct('returnNoPh', lang)} aria-label={ct('returnNoPh', lang)} aria-invalid={missing || undefined}
                    inputMode="numeric" dir="auto" autoComplete="off" enterKeyHint="done"
                    style={{ width: '100%', height: 44, padding: '0 12px', border: `1px solid ${missing ? '#dc2626' : 'var(--storely-border)'}`, borderRadius: 12, fontSize: 17, fontFamily: 'inherit', outline: 'none', background: 'white', boxSizing: 'border-box', color: 'var(--storely-text)', fontVariantNumeric: 'tabular-nums' }} />
                  {missing && <span style={{ fontSize: 13, color: '#b42318', fontWeight: 600 }}>{ct('returnNoReq', lang)}</span>}
                  <select value={r.reason || ''} onChange={e => updateReturn(r.key, { reason: e.target.value || null })} aria-label={ct('returnReasonLbl', lang)}
                    style={{ alignSelf: 'flex-start', maxWidth: '100%', height: 36, padding: '0 12px', border: '1px solid var(--storely-border)', borderRadius: 999, fontSize: 16, fontFamily: 'inherit', background: 'white', color: r.reason ? 'var(--storely-text)' : 'var(--storely-muted)', cursor: 'pointer' }}>
                    <option value="">{ct('returnReasonLbl', lang)}</option>
                    {RETURN_REASONS.map(rr => <option key={rr.key} value={rr.key}>{reasonText(rr, lang)}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => removeReturn(r.key)} aria-label={ct('returnRemove', lang)}
                  style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 999, border: 'none', background: 'transparent', color: 'var(--storely-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} strokeWidth={1.75} />
                </button>
              </div>
            )
          })}
          {returns.length < MAX_RETURNS && (
            <button type="button" onClick={() => pick(null)}
              style={{ ...pill, minHeight: 48, border: `1px dashed ${NAVY}`, background: 'white', color: NAVY, marginTop: 2 }}>
              <Camera size={18} strokeWidth={1.75} />{ct('snapAnother', lang)}
            </button>
          )}
        </div>
      )}

      {/* بعض الأنظمة تعطي إشعار المرتجع كصورة على الجهاز */}
      {returns.length < MAX_RETURNS && (
        <button type="button" onClick={() => pick(null, true)}
          style={{ display: 'block', margin: '10px auto 0', padding: '4px 8px', border: 'none', background: 'none', color: 'var(--storely-muted)', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {ct('fromGallery', lang)}
        </button>
      )}
    </div>
  )
}
