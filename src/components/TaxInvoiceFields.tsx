'use client'
import { useState, lazy, Suspense } from 'react'
import { normalizeVat, isValidVat } from '@/lib/taxInvoice'
import { parseZatcaQr, type ZatcaInvoice } from '@/lib/zatcaQr'

const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))

export type ZatcaState = { raw: string; inv: ZatcaInvoice } | null

const T = {
  ar: { inv: 'رقم الفاتورة', invPh: 'مثلاً INV-1024', vat: 'الرقم الضريبي للمورد', bad: '١٥ رقم يبدأ وينتهي بـ 3', saved: 'محفوظ من المورد', hint: 'تلقاه في أعلى الفاتورة — يحتاجه المحاسب للضريبة',
    scan: 'امسح باركود الفاتورة', scanHint: 'الباركود المربع اللي تحت الفاتورة — يعبّي البيانات ويوثّقها', verified: 'فاتورة موثقة من باركود الهيئة', total: 'الإجمالي', tax: 'الضريبة',
    remove: 'إلغاء', notZatca: 'هذا مو باركود فاتورة ضريبية — امسح الباركود المربع اللي تحت الفاتورة', over: 'المبلغ المكتوب أكبر من مبلغ الفاتورة الأصلي', fromQr: 'من باركود الفاتورة' },
  en: { inv: 'Invoice number', invPh: 'e.g. INV-1024', vat: 'Supplier VAT number', bad: '15 digits, starts and ends with 3', saved: 'Saved from supplier', hint: 'Printed at the top of the invoice — needed for VAT',
    scan: 'Scan invoice QR', scanHint: 'The square QR at the bottom of the invoice — fills and verifies the data', verified: 'Verified by the ZATCA QR', total: 'Total', tax: 'VAT',
    remove: 'Remove', notZatca: 'This is not a tax-invoice QR — scan the square code at the bottom of the invoice', over: 'Entered amount is higher than the original invoice', fromQr: 'From the invoice QR' },
}

// حقول الفاتورة الضريبية (تطلع لما تكون الفاتورة شاملة الضريبة) — المحاسب يحتاجها لخصم ضريبة المشتريات
export default function TaxInvoiceFields({ invoiceNumber, vatNumber, onChange, inputStyle, labelStyle, savedFromSupplier, lang = 'ar', zatca, onZatca, enteredTotal = 0, onError }: {
  invoiceNumber: string; vatNumber: string
  onChange: (patch: { invoice_number?: string; supplier_vat_number?: string }) => void
  inputStyle: React.CSSProperties; labelStyle: React.CSSProperties
  savedFromSupplier?: boolean
  lang?: 'ar' | 'en'
  zatca?: ZatcaState
  onZatca?: (z: ZatcaState) => void
  enteredTotal?: number
  onError?: (msg: string) => void
}) {
  const t = T[lang]
  const [scanning, setScanning] = useState(false)
  const vat = normalizeVat(vatNumber)
  const vatBad = !!vat && !isValidVat(vat)
  const over = !!zatca && enteredTotal > zatca.inv.total + 0.5
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div style={{ marginBottom: 10 }}>
      {onZatca && (zatca ? (
        <div style={{ background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#047857' }}>✅ {t.verified}</span>
            <button type="button" onClick={() => onZatca(null)} style={{ fontSize: 11, fontWeight: 700, color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontFamily: 'inherit' }}>{t.remove}</button>
          </div>
          <div style={{ fontSize: 12, color: '#065f46', marginTop: 4, lineHeight: 1.7 }}>
            {zatca.inv.sellerName} · {t.total} <b dir="ltr">{fmt(zatca.inv.total)}</b> · {t.tax} <b dir="ltr">{fmt(zatca.inv.vat)}</b>
          </div>
          {over && <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>⚠️ {t.over} ({fmt(zatca.inv.total)})</div>}
        </div>
      ) : (
        <button type="button" onClick={() => setScanning(true)}
          style={{ width: '100%', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, padding: '10px', borderRadius: 10, border: '1.5px dashed #029FA2', background: '#f0fdfa', color: '#0f766e', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>📷 {t.scan}</span>
          <span style={{ fontSize: 10.5, color: '#5f8f8b' }}>{t.scanHint}</span>
        </button>
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8 }}>
        <div>
          <label style={labelStyle}>{t.inv}</label>
          <input value={invoiceNumber} onChange={e => onChange({ invoice_number: e.target.value })} maxLength={50} dir="ltr" placeholder={t.invPh} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t.vat}</label>
          <input value={zatca ? zatca.inv.vatNumber : vatNumber} readOnly={!!zatca} onChange={e => onChange({ supplier_vat_number: e.target.value })} inputMode="numeric" maxLength={20} dir="ltr" placeholder="3xxxxxxxxxxxxx3"
            style={{ ...inputStyle, ...(vatBad && !zatca ? { borderColor: '#dc2626' } : {}), ...(zatca ? { background: '#f8fafc' } : {}) }} />
          <div style={{ fontSize: 10.5, marginTop: 3, color: vatBad && !zatca ? '#dc2626' : '#98a2b3' }}>
            {zatca ? t.fromQr : vatBad ? t.bad : savedFromSupplier ? t.saved : t.hint}
          </div>
        </div>
      </div>

      {scanning && onZatca && (
        <Suspense fallback={null}>
          <BarcodeScanner onClose={() => setScanning(false)} onScan={code => {
            setScanning(false)
            const inv = parseZatcaQr(code)
            if (inv) onZatca({ raw: code, inv })
            else onError?.(t.notZatca)
          }} />
        </Suspense>
      )}
    </div>
  )
}
