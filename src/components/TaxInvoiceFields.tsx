'use client'
import { normalizeVat, isValidVat } from '@/lib/taxInvoice'

// حقول الفاتورة الضريبية (تطلع لما تكون الفاتورة شاملة الضريبة) — المحاسب يحتاجها لخصم ضريبة المشتريات
const T = {
  ar: { inv: 'رقم الفاتورة', invPh: 'مثلاً INV-1024', vat: 'الرقم الضريبي للمورد', bad: '١٥ رقم يبدأ وينتهي بـ 3', saved: 'محفوظ من المورد', hint: 'تلقاه في أعلى الفاتورة — يحتاجه المحاسب للضريبة' },
  en: { inv: 'Invoice number', invPh: 'e.g. INV-1024', vat: 'Supplier VAT number', bad: '15 digits, starts and ends with 3', saved: 'Saved from supplier', hint: 'Printed at the top of the invoice — needed for VAT' },
}

export default function TaxInvoiceFields({ invoiceNumber, vatNumber, onChange, inputStyle, labelStyle, savedFromSupplier, lang = 'ar' }: {
  invoiceNumber: string; vatNumber: string
  onChange: (patch: { invoice_number?: string; supplier_vat_number?: string }) => void
  inputStyle: React.CSSProperties; labelStyle: React.CSSProperties
  savedFromSupplier?: boolean
  lang?: 'ar' | 'en'
}) {
  const t = T[lang]
  const vat = normalizeVat(vatNumber)
  const vatBad = !!vat && !isValidVat(vat)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8, marginBottom: 10 }}>
      <div>
        <label style={labelStyle}>{t.inv}</label>
        <input value={invoiceNumber} onChange={e => onChange({ invoice_number: e.target.value })} maxLength={50} dir="ltr" placeholder={t.invPh} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>{t.vat}</label>
        <input value={vatNumber} onChange={e => onChange({ supplier_vat_number: e.target.value })} inputMode="numeric" maxLength={20} dir="ltr" placeholder="3xxxxxxxxxxxxx3"
          style={{ ...inputStyle, ...(vatBad ? { borderColor: '#dc2626' } : {}) }} />
        <div style={{ fontSize: 10.5, marginTop: 3, color: vatBad ? '#dc2626' : '#98a2b3' }}>
          {vatBad ? t.bad : savedFromSupplier ? t.saved : t.hint}
        </div>
      </div>
    </div>
  )
}
