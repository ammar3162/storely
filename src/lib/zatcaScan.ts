'use client'
import { parseZatcaQr, type ZatcaInvoice } from '@/lib/zatcaQr'

// يقرأ باركود هيئة الزكاة من صورة الفاتورة (على الجوال نفسه، بدون إنترنت) — null لو ما لقى باركود
// صور الجوال كبيرة (١٢ ميقا+) والقارئ يفشل فيها، فنجرب أحجام مختلفة، ونص الفاتورة السفلي (مكان الباركود غالباً)
export async function zatcaFromImage(file: Blob): Promise<{ raw: string; inv: ZatcaInvoice } | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    const { BrowserQRCodeReader } = await import('@zxing/browser')
    const { DecodeHintType } = await import('@zxing/library')
    const reader = new BrowserQRCodeReader(new Map([[DecodeHintType.TRY_HARDER, true]]))
    const W = img.naturalWidth, H = img.naturalHeight
    // [نسبة البداية من الأعلى، الطول] × [أقصى عرض]
    const crops: [number, number][] = [[0, 1], [0.45, 0.55], [0.6, 0.4], [0, 0.5]]
    for (const maxW of [1400, 1000, 2000, 700]) {
      for (const [top, h] of crops) {
        const sw = W, sh = Math.round(H * h), sy = Math.round(H * top)
        const scale = Math.min(1, maxW / sw)
        const c = document.createElement('canvas')
        c.width = Math.max(1, Math.round(sw * scale)); c.height = Math.max(1, Math.round(sh * scale))
        c.getContext('2d')!.drawImage(img, 0, sy, sw, sh, 0, 0, c.width, c.height)
        try {
          const raw = reader.decodeFromCanvas(c).getText()
          const inv = parseZatcaQr(raw)
          if (inv) return { raw, inv }
        } catch { /* ما لقى بهذا الحجم — نجرب اللي بعده */ }
      }
    }
    return null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** يصغّر الصورة (للرفع والقراءة الذكية) — أسرع على النت وأرخص */
export async function shrinkImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    if (scale === 1 && file.size < 900 * 1024) return file
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return await new Promise<Blob>(res => c.toBlob(b => res(b || file), 'image/jpeg', quality))
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const blobToBase64 = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(b)
})
