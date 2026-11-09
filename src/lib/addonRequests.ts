// الكمية بعد الموافقة على طلب إضافة: الطلب "يضيف" فوق الموجود

export const QTY_REQUEST_SLUGS = ['extra_branch', 'extra_staff', 'extra_suppliers']

type Sub = { status?: string; quantity?: number | null; branch_ids?: string[] | null; expires_at?: string | null } | null
export function targetForRequest(slug: string | undefined, sub: Sub, req: { quantity?: number | null; branch_ids?: string[] | null }, now = new Date()) {
  const live = !!sub && sub.status === 'active' && !!sub.expires_at && new Date(sub.expires_at) > now
  if (slug && QTY_REQUEST_SLUGS.includes(slug)) {
    const had = live ? Number(sub!.quantity) || 0 : 0
    return { quantity: Math.min(20, had + Math.max(1, Number(req.quantity) || 1)), branchIds: null as string[] | null }
  }
  // إضافة لفروع معيّنة (الباقات الجديدة): الطلب فيه الفروع المطلوبة كاملة — التفعيل يتحقق منها ويحسب الكمية
  if (Array.isArray(req.branch_ids) && req.branch_ids.length) return { quantity: req.branch_ids.length, branchIds: req.branch_ids }
  return { quantity: 1, branchIds: null as string[] | null }
}
