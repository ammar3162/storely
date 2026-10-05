// باركود الفاتورة الضريبية (هيئة الزكاة والضريبة والجمارك) — TLV مشفّر Base64:
//   1 اسم البائع · 2 الرقم الضريبي · 3 وقت الإصدار · 4 الإجمالي شامل الضريبة · 5 مبلغ الضريبة
//   (المرحلة الثانية تضيف 6-9: بصمة وتوقيع ومفتاح — ما نحتاجها هنا)
export type ZatcaInvoice = { sellerName: string; vatNumber: string; issuedAt: string; total: number; vat: number }

function b64ToBytes(s: string): Uint8Array | null {
  try {
    const clean = s.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
    if (!/^[A-Za-z0-9+/]+=*$/.test(clean)) return null
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(clean, 'base64'))
    return Uint8Array.from(atob(clean), c => c.charCodeAt(0))
  } catch { return null }
}

/** يفك باركود الفاتورة — null لو مو باركود هيئة الزكاة أو بياناته ناقصة/غلط */
export function parseZatcaQr(raw: string): ZatcaInvoice | null {
  if (!raw || raw.length > 4000) return null
  const bytes = b64ToBytes(raw)
  if (!bytes || bytes.length < 10) return null
  const dec = new TextDecoder('utf-8', { fatal: false })
  const tags: Record<number, string> = {}
  let i = 0
  while (i + 2 <= bytes.length) {
    const tag = bytes[i], len = bytes[i + 1]
    if (i + 2 + len > bytes.length) return null
    if (tag >= 1 && tag <= 5) tags[tag] = dec.decode(bytes.subarray(i + 2, i + 2 + len)).trim()
    i += 2 + len
  }
  const sellerName = tags[1], vatNumber = (tags[2] || '').replace(/\D/g, ''), when = tags[3]
  const total = Number(tags[4]), vat = Number(tags[5])
  if (!sellerName || !/^3\d{13}3$/.test(vatNumber) || !when) return null
  const t = Date.parse(when)
  if (!Number.isFinite(t) || !(total > 0) || !(vat >= 0) || vat > total) return null
  return { sellerName: sellerName.slice(0, 120), vatNumber, issuedAt: new Date(t).toISOString(), total: Math.round(total * 100) / 100, vat: Math.round(vat * 100) / 100 }
}

/** بصمة الفاتورة — نفس المورد ونفس وقت الإصدار ونفس المبلغ = نفس الفاتورة */
export const zatcaFingerprint = (z: ZatcaInvoice) => `${z.vatNumber}|${z.issuedAt}|${z.total.toFixed(2)}`

/** تاريخ الفاتورة بتوقيت السعودية 'YYYY-MM-DD' */
export const zatcaDate = (z: ZatcaInvoice) => new Date(Date.parse(z.issuedAt) + 3 * 3600e3).toISOString().slice(0, 10)

/** للاختبارات والتجربة: يبني باركود بنفس صيغة الهيئة */
export function buildZatcaQr(z: { sellerName: string; vatNumber: string; issuedAt: string; total: string; vat: string }) {
  const enc = new TextEncoder()
  const parts = [z.sellerName, z.vatNumber, z.issuedAt, z.total, z.vat].map((v, i) => { const b = enc.encode(v); return [i + 1, b.length, ...b] })
  return Buffer.from(Uint8Array.from(parts.flat())).toString('base64')
}
