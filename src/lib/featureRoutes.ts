// قفل المخزون والمشتريات على مستوى الخادم — لـ «ابنِ باقتك» (custom) لو ما اختارها.
// كل الباقات الثانية فيها الميزتين، فالفحص ما يقفل عليهم شي (lib/planFeatures planIncludes).
// يُطبّق مركزياً في verifyOrgAccess على طلبات التعديل (غير GET) — القراءة تبقى (بيانات فاضية أصلاً).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { orgFeatures, planIncludes, FEATURE_LABEL, type Feature, type Features } from '@/lib/planFeatures'

/** المسار ← الميزات (يكفي وحدة منها). الأطول يغلب */
export const FEATURE_ROUTES: Record<string, Feature[]> = {
  '/api/products': ['inventory', 'purchases'],
  '/api/products/import': ['inventory'],
  '/api/sync-product-to-staff': ['inventory', 'purchases'],
  '/api/stock-movements': ['inventory'],
  '/api/stock-counts': ['inventory'],
  '/api/branch-transfer': ['inventory'],
  '/api/branches/copy-products': ['inventory'],
  '/api/recipes': ['inventory'],
  '/api/notify-low-stock-instant': ['inventory'],
  '/api/notify-staff-dispense': ['inventory'],
  '/api/notify-waste': ['inventory'],
  '/api/translate-products': ['inventory'],
  '/api/purchases': ['purchases'],
  '/api/invoice-agent': ['purchases'],
  '/api/ocr-invoice': ['purchases'],
  '/api/supplier-delivery-thanks': ['purchases'],
  '/api/suppliers': ['inventory', 'purchases'],
  '/api/add-supplier': ['inventory', 'purchases'],
  '/api/notify-supplier': ['inventory'],
  '/api/marketplace': ['inventory', 'purchases'],
}

export function routeFeatures(path: string): Feature[] | null {
  let p = path.replace(/\/+$/, '')
  while (p.split('/').length > 2) {
    if (FEATURE_ROUTES[p]) return FEATURE_ROUTES[p]
    p = p.slice(0, p.lastIndexOf('/'))
  }
  return null
}

// ذاكرة قصيرة (30 ثانية) عشان ما نقرأ الباقة مع كل طلب
const cache = new Map<string, { f: Features; plan: string | null; at: number }>()
const TTL = 30_000
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/** null = مسموح، أو رسالة القفل. لو القاعدة ما ردّت نسمح (ما نوقف النظام) */
export async function routeFeatureError(orgId: string, path: string, method: string, db?: SupabaseClient): Promise<string | null> {
  if (method.toUpperCase() === 'GET') return null
  const need = routeFeatures(path)
  if (!need) return null
  try {
    const hit = await orgCached(orgId, db)
    if (need.some(f => hit.f[f])) return null
    return `ميزة ${FEATURE_LABEL[need[0]]} غير مشمولة باشتراكك — أضفها من صفحة الإضافات`
  } catch { return null }
}

async function orgCached(orgId: string, db?: SupabaseClient) {
  let hit = cache.get(orgId)
  if (!hit || Date.now() - hit.at > TTL) {
    const d = db || admin()
    const { data: org } = await d.from('organizations').select('plan').eq('id', orgId).maybeSingle()
    const plan = ((org as any)?.plan ?? null) as string | null
    hit = { f: await orgFeatures(d, orgId, plan), plan, at: Date.now() }
    cache.set(orgId, hit)
  }
  return hit
}

/**
 * الميزة مفعّلة لهالفرع بالذات؟ (للمسارات اللي تعرف الفرع: إضافة صنف، صرف، جرد، نقل، فاتورة شراء)
 * null = مسموح. الباقة فيها الميزة = بدون استعلامات زيادة. لو القاعدة ما ردّت نسمح.
 */
export async function branchFeatureDenied(orgId: string, need: Feature[], branchId: string | null | undefined, db?: SupabaseClient): Promise<string | null> {
  try {
    const hit = await orgCached(orgId, db)
    if (need.some(f => planIncludes(hit.plan, f))) return null
    if (!need.some(f => hit.f[f])) return `ميزة ${FEATURE_LABEL[need[0]]} غير مشمولة باشتراكك — أضفها من صفحة الإضافات`
    if (!branchId) return null
    const bf = await orgFeatures(db || admin(), orgId, hit.plan, branchId)
    return need.some(f => bf[f]) ? null : `ميزة ${FEATURE_LABEL[need[0]]} غير مفعّلة لهذا الفرع — المالك يقدر يضيفها للفرع من صفحة الإضافات`
  } catch { return null }
}

/** بعد تغيير الإضافات أو الباقة (عشان القفل/الفتح يطبّق فوراً) */
export const clearFeatureCache = (orgId: string) => { cache.delete(orgId) }

/** لحسابات الموظفين (PIN): الميزة لازم تكون مفعّلة لفرع الموظف — null = مسموح */
export async function staffFeatureError(data: { org_id: string; branch_id?: string | null } | undefined, f: Feature, db?: SupabaseClient): Promise<string | null> {
  if (!data?.org_id) return null
  try {
    const { branchFeatureError } = await import('@/lib/planFeatures')
    return await branchFeatureError(db || admin(), data.org_id, f, undefined, data.branch_id || null)
  } catch { return null }
}
