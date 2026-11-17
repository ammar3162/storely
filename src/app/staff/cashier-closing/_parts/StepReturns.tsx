'use client'
import { ct } from './strings'
import type { CashierClosing } from './useCashierClosing'
import { CASHIER_EXTRA } from '@/lib/staffI18n/cashier'
import { RETURN_REASONS, MAX_RETURNS } from '@/lib/closingReturns'
import { Camera, X, RotateCcw } from 'lucide-react'

const reasonText = (r: typeof RETURN_REASONS[number], lang: string) =>
  lang === 'ar' ? r.ar : lang === 'en' ? r.en : ((CASHIER_EXTRA['rr_' + r.key] as any)?.[lang] || r.en)

const choiceBtn = (on: boolean): React.CSSProperties => ({
  padding: '11px', borderRadius: 999, border: `1px solid ${on ? '#203640' : 'var(--storely-border)'}`, background: on ? 'var(--storely-fill)' : 'white',
  color: on ? '#203640' : 'var(--storely-muted)', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', transition: 'background-color .15s,border-color .15s',
})

/** خطوة الصور: الفواتير المرتجعة — سؤال إلزامي، وكل فاتورة بصورة ورقم وسبب اختياري (للتوثيق، ما تغيّر الحساب) */
export default function StepReturns({ m }: { m: CashierClosing }) {
  const { lang, step, hasReturns, setHasReturns, returns, addReturnRow, removeReturnRow, updateReturn, uploadReturnPhoto } = m
  if (step !== 3) return null
  return (
    <div className="fu" style={{ background: 'white', borderRadius: 20, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--storely-text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 28, height: 28, borderRadius: 12, background: 'var(--storely-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--storely-muted)', flexShrink: 0 }}><RotateCcw size={16} strokeWidth={1.75} /></span>
        {ct('returnsTitle', lang)}
      </div>
      <div style={{ fontSize: 15, color: 'var(--storely-muted)', lineHeight: 1.5, marginBottom: 12, paddingInlineStart: 36 }}>{ct('returnsHint', lang)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: hasReturns === 'yes' ? 16 : 0 }}>
        <button type="button" onClick={() => setHasReturns('no')} style={choiceBtn(hasReturns === 'no')}>{ct('no', lang)}</button>
        <button type="button" onClick={() => setHasReturns('yes')} style={choiceBtn(hasReturns === 'yes')}>{ct('yes', lang)}</button>
      </div>

      {hasReturns === 'yes' && (
        <div>
          {returns.map((r, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12, borderRadius: 20, background: 'var(--storely-fill)', marginBottom: 10 }}>
              {r.photo ? (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={r.preview || r.photo} alt={ct('returnPhoto', lang)} style={{ width: 76, height: 100, borderRadius: 12, objectFit: 'cover', display: 'block' }} />
                  <button type="button" onClick={() => updateReturn(idx, { photo: '', preview: '' })} aria-label={ct('returnRemove', lang)}
                    style={{ position: 'absolute', top: 4, insetInlineEnd: 4, width: 26, height: 26, borderRadius: 999, border: 'none', background: 'rgba(17,24,39,.72)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={14} strokeWidth={1.75} />
                  </button>
                </div>
              ) : (
                <label style={{ width: 76, height: 100, flexShrink: 0, borderRadius: 12, border: '1px dashed #c9cdd3', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: r.uploading ? 'default' : 'pointer', textAlign: 'center', padding: 4 }}>
                  <Camera size={20} strokeWidth={1.75} color="var(--storely-muted)" />
                  <span style={{ fontSize: 12, color: 'var(--storely-text)', lineHeight: 1.3 }}>{r.uploading ? ct('uploadingImg', lang) : ct('returnPhoto', lang)}</span>
                  <input type="file" accept="image/*" disabled={r.uploading} style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadReturnPhoto(idx, f) }} />
                </label>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input value={r.invoice_no} onChange={e => updateReturn(idx, { invoice_no: e.target.value.slice(0, 40) })} placeholder={ct('returnNoPh', lang)}
                    aria-label={ct('returnNoPh', lang)} dir="auto" autoComplete="off" enterKeyHint="done"
                    style={{ flex: 1, width: 0, minWidth: 0, padding: '10px 12px', border: '1px solid var(--storely-border)', borderRadius: 12, fontSize: 17, fontFamily: 'inherit', outline: 'none', background: 'white', boxSizing: 'border-box', color: 'var(--storely-text)' }} />
                  {returns.length > 1 && (
                    <button type="button" onClick={() => removeReturnRow(idx)} aria-label={ct('returnRemove', lang)}
                      style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 999, border: 'none', background: 'transparent', color: 'var(--storely-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={16} strokeWidth={1.75} />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--storely-muted)', margin: '10px 0 6px' }}>{ct('returnReasonLbl', lang)}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {RETURN_REASONS.map(rr => {
                    const on = r.reason === rr.key
                    return (
                      <button key={rr.key} type="button" aria-pressed={on} onClick={() => updateReturn(idx, { reason: on ? null : rr.key })}
                        style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${on ? '#203640' : 'var(--storely-border)'}`, background: on ? '#203640' : 'white', color: on ? 'white' : 'var(--storely-text)', fontSize: 14, fontWeight: on ? 600 : 500, fontFamily: 'inherit', cursor: 'pointer' }}>
                        {reasonText(rr, lang)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
          {returns.length < MAX_RETURNS && (
            <button type="button" onClick={addReturnRow}
              style={{ width: '100%', padding: '11px', borderRadius: 999, border: '1px dashed var(--storely-control-border)', background: 'transparent', color: 'var(--storely-text)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 2 }}>
              {ct('addReturnRow', lang)}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
