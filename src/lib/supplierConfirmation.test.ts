import { describe, it, expect, vi } from 'vitest'

// الملف يستورد مكتبات إرسال (واتساب/إشعارات) — ما نحتاجها لاختبار فهم الرد
vi.mock('@/lib/push', () => ({ sendPushToOrg: vi.fn() }))
vi.mock('@/lib/whatsapp', () => ({ formatPhone: (p: string) => p, sendWhatsAppMessage: vi.fn() }))

const { isSupplierConfirmation } = await import('./supplierConfirmation')

describe('isSupplierConfirmation', () => {
  it.each(['تم', 'تم ✅', 'تمام', 'تم التوريد', 'أبشر', 'حاضر', 'OK', 'okay', '👍', '✅', '  تم  '])(
    'recognizes %s as a confirmation', (reply) => {
      expect(isSupplierConfirmation(reply)).toBe(true)
    })

  it.each(['0', '1', 'غير متوفر', 'مخزون', 'تمر', 'متى التوصيل؟', ''])(
    'does not treat %s as a confirmation', (reply) => {
      expect(isSupplierConfirmation(reply)).toBe(false)
    })
})
