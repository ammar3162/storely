// يشتغل قبل كل ملف اختبار تكامل (vitest.config.mts → project «integration»): يحمّل المتغيرات ويبدّل الخدمات الخارجية
import { vi } from 'vitest'
import './harness'

vi.mock('next/headers', () => ({ headers: async () => new Headers(), cookies: async () => ({ getAll: () => [], set: () => {} }) }))
// ما نرسل واتساب حقيقي من الاختبارات
vi.mock('@/lib/whatsapp', () => ({ sendWhatsAppMessage: async () => ({ ok: true, success: true }), formatPhone: (x: string) => x }))
// لوحة الأدمن: جلسة أدمن وهمية للاختبار بس
vi.mock('@/lib/adminAuth', () => ({
  requirePermission: async (key: string | null) => (key === 'it-admin' ? { id: 'it-admin', name: 'اختبار' } : null),
  logAdminAction: async () => {},
}))
vi.mock('@/lib/invoiceOcr', async () => {
  const { ocrFixture } = await import('./harness')
  return { readInvoice: async () => ocrFixture.current }
})
vi.mock('@/lib/verifyOrgAccess', async (importOriginal) => {
  const real: any = await importOriginal()
  const { auth } = await import('./harness')
  return {
    ...real,
    getCurrentProfile: async () => auth.current
      ? { userId: auth.current.userId, email: null, status: 'active', orgId: auth.current.orgId, role: auth.current.role, branchId: auth.current.branchId }
      : null,
    verifyOrgAccess: async (orgId: string) => auth.current && auth.current.orgId === orgId
      ? { authorized: true, userId: auth.current.userId, orgId, role: auth.current.role, branchId: auth.current.branchId, permissions: auth.current.permissions ?? null }
      : { authorized: false, error: 'غير مصرح', status: 403 },
  }
})
