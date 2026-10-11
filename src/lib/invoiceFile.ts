// مرفق فاتورة المشتريات: صورة (كاميرا أو من الصور) أو ملف PDF — نجهزه للرفع وللقراءة الذكية
import { shrinkImage } from '@/lib/zatcaScan'

export const INVOICE_MAX_BYTES = 4 * 1024 * 1024   // حد طلبات الخادم ٤.٥ ميجا — الصور تنضغط قبلها
export const INVOICE_ACCEPT_ANY = 'image/*,application/pdf,.pdf,.heic,.heif'
export const INVOICE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'application/pdf'] as const
// الأنواع اللي تقدر القراءة الذكية تقراها
export const OCR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'] as const

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif', 'application/pdf': 'pdf' }

// بعض الجوالات ترسل النوع فاضي — نعرفه من الامتداد
export function invoiceType(f: { type?: string; name?: string }): string {
  const t = (f.type || '').toLowerCase()
  if (t === 'image/jpg' || t === 'image/pjpeg') return 'image/jpeg'
  if (t) return t
  const ext = (f.name || '').split('.').pop()?.toLowerCase() || ''
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf' } as Record<string, string>)[ext] || ''
}

export const invoiceExt = (type: string) => EXT[type] || 'bin'
export const isPdfUrl = (u?: string | null) => !!u && /\.pdf(\?|$)/i.test(u)

export type PreparedInvoice = { blob: Blob; type: string; ext: string; ocrType: string | null; isPdf: boolean }

// يرجّع الملف جاهز أو رسالة خطأ واضحة
export async function prepareInvoiceFile(file: File): Promise<PreparedInvoice | { error: string }> {
  const type = invoiceType(file)
  if (!(INVOICE_TYPES as readonly string[]).includes(type)) return { error: 'الملف لازم يكون صورة أو PDF' }
  if (type === 'application/pdf') {
    if (file.size > INVOICE_MAX_BYTES) return { error: 'ملف الـ PDF أكبر من ٤ ميجا — صوّر الفاتورة بدالها' }
    return { blob: file, type, ext: 'pdf', ocrType: type, isPdf: true }
  }
  // الصور تتصغّر وتتحول JPEG (حتى HEIC لو الجهاز يفتحها)
  const small = await shrinkImage(new File([file], file.name || 'invoice', { type }))
  const outType = invoiceType({ type: small.type }) || type
  if (small.size > INVOICE_MAX_BYTES) return { error: 'الصورة كبيرة — صوّرها مرة ثانية' }
  return { blob: small, type: outType, ext: invoiceExt(outType), ocrType: (OCR_TYPES as readonly string[]).includes(outType) ? outType : null, isPdf: false }
}
