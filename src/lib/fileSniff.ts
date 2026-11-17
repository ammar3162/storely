// نوع الملف الحقيقي من أول بايتاته — ما نصدّق النوع اللي يرسله المتصفح ولا الامتداد.
// السبب: ملف HTML أو SVG ينرفع على إنه «صورة» ثم ينفتح من رابطنا (/api/file) فيشتغل داخل حساب
// المالك أو المحاسب (يقدر يسوي أي شي باسمه). نخدم الصور وPDF فقط كما هي، وأي شي ثاني تنزيل محمي.
export const SAFE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'] as const
export const SAFE_INLINE_TYPES = [...SAFE_IMAGE_TYPES, 'application/pdf'] as const
export type SafeType = typeof SAFE_INLINE_TYPES[number]

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v)
const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.slice(from, to))

/** يرجّع نوع الملف لو كان صورة أو PDF حقيقي، وإلا null (HTML، SVG، سكربت، أي شي ثاني) */
export function sniffSafeType(head: Uint8Array): SafeType | null {
  if (head.length < 4) return null
  if (startsWith(head, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (ascii(head, 0, 6) === 'GIF87a' || ascii(head, 0, 6) === 'GIF89a') return 'image/gif'
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 12) === 'WEBP') return 'image/webp'
  if (ascii(head, 4, 8) === 'ftyp') {
    const brand = ascii(head, 8, 12)
    if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) return 'image/heic'
    if (['mif1', 'msf1', 'heif'].includes(brand)) return 'image/heif'
  }
  if (ascii(head, 0, 5) === '%PDF-') return 'application/pdf'
  return null
}

export const extForSafeType = (t: SafeType) =>
  ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif', 'application/pdf': 'pdf' } as const)[t]

/** ترويسات خدمة ملف مخزّن من رابطنا: الآمن يعرض بنوعه الحقيقي، وغيره ينزل كملف بدون ما يشتغل */
export function storedFileHeaders(safe: SafeType | null, size: number): Record<string, string> {
  const base = { 'Content-Length': String(size), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
  if (safe === 'application/pdf') return { ...base, 'Content-Type': safe, 'Content-Disposition': 'inline' }
  if (safe) return { ...base, 'Content-Type': safe, 'Content-Disposition': 'inline', 'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" }
  return { ...base, 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="file.bin"', 'Content-Security-Policy': "default-src 'none'; sandbox" }
}
