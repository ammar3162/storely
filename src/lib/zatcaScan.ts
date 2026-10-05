'use client'
import { parseZatcaQr, type ZatcaInvoice } from '@/lib/zatcaQr'

// يقرأ باركود هيئة الزكاة من صورة الفاتورة (على الجوال نفسه، بدون إنترنت) — null لو ما لقى باركود
export async function zatcaFromImage(file: Blob): Promise<{ raw: string; inv: ZatcaInvoice } | null> {
  const url = URL.createObjectURL(file)
  try {
    const { BrowserQRCodeReader } = await import('@zxing/browser')
    const res = await new BrowserQRCodeReader().decodeFromImageUrl(url)
    const raw = res?.getText() || ''
    const inv = parseZatcaQr(raw)
    return inv ? { raw, inv } : null
  } catch {
    return null   // ما فيه باركود واضح بالصورة — عادي، نكمّل بالقراءة الذكية
  } finally {
    URL.revokeObjectURL(url)
  }
}
