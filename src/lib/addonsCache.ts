import { api } from '@/lib/api-client'

// قائمة الإضافات يطلبها إطار لوحة التحكم (للقائمة) والصفحة المفتوحة (الإعدادات، الموظفين) بنفس اللحظة —
// نشارك طلب واحد لمدة 15 ثانية. التحديث اللحظي (إضافة تفعّلت) يطلب نسخة جديدة بـ fresh
const TTL = 15_000
let cached: { orgId: string; at: number; p: Promise<any> } | null = null

export function getAddonsMarket(orgId: string, fresh = false): Promise<any> {
  if (!fresh && cached && cached.orgId === orgId && Date.now() - cached.at < TTL) return cached.p
  const p = api.get('/api/addons-market', { org_id: orgId })
  cached = { orgId, at: Date.now(), p }
  p.then(j => { if (!j?.success && cached?.p === p) cached = null })
  return p
}
