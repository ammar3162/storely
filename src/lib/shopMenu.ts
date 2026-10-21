// المنيو الإلكتروني — منيو لكل فرع
// اشتراك "online_menu" فيه branch_ids = الفروع المشترك لها (كل فرع بسعر الإضافة).
// branch_ids فاضي/null = اشتراك قديم: منيو واحد للمنشأة كلها (نفس السلوك السابق بدون تغيير).
// shop_items.branch_id = الصنف لفرع معيّن، null = يظهر بكل الفروع.
import type { SupabaseClient } from '@supabase/supabase-js'

export const MENU_ADDON_SLUG = 'online_menu'

export type MenuBranch = { id: string; name: string; shop_slug: string | null; shop_hours: any }
export type MenuSub = { id: string; expires_at: string; quantity: number | null; branch_ids: string[] | null }

export type MenuScope =
  | { ok: true; mode: 'org'; branchId: null; canManageOrg: boolean; branches: MenuBranch[] }
  | { ok: true; mode: 'branch'; branchId: string; canManageOrg: boolean; branches: MenuBranch[] }
  | { ok: false; status: number; error: string }

type Access = { role?: string | null; branchId?: string | null }

export function slugifyShop(input: string) {
  return String(input || '').trim().toLowerCase()
    .replace(/[^a-z0-9؀-ۿ\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export function menuBranchIds(sub: { branch_ids?: string[] | null } | null | undefined): string[] | null {
  const ids = Array.isArray(sub?.branch_ids) ? sub!.branch_ids!.filter(Boolean) : []
  return ids.length ? ids : null
}

/** اشتراك المنيو الساري للمنشأة (أو null) */
export async function loadMenuSub(db: SupabaseClient, orgId: string): Promise<MenuSub | null> {
  const { data: addon } = await db.from('marketplace_addons').select('id').eq('slug', MENU_ADDON_SLUG).maybeSingle()
  if (!addon) return null
  const { data: sub } = await db.from('org_addon_subscriptions').select('id,expires_at,quantity,branch_ids')
    .eq('org_id', orgId).eq('addon_id', (addon as any).id).eq('status', 'active').maybeSingle()
  if (!sub || new Date((sub as any).expires_at) <= new Date()) return null
  return sub as any
}

/** الفروع النشطة المشمولة بالاشتراك، بنفس ترتيب إنشائها */
export async function loadMenuBranches(db: SupabaseClient, orgId: string, ids: string[]): Promise<MenuBranch[]> {
  if (!ids.length) return []
  const { data } = await db.from('branches').select('id,name,shop_slug,shop_hours')
    .eq('org_id', orgId).eq('is_active', true).in('id', ids).order('created_at')
  return (data || []) as any
}

/**
 * يحدد أي منيو يدير المستخدم:
 * - اشتراك قديم (بدون فروع) → منيو المنشأة كلها مثل قبل.
 * - اشتراك بالفروع → فرع واحد: مدير الفرع على فرعه بس، والمالك على أي فرع مشترك.
 */
export async function resolveMenuScope(db: SupabaseClient, orgId: string, access: Access, requestedBranch?: string | null): Promise<MenuScope> {
  const sub = await loadMenuSub(db, orgId)
  if (!sub) return { ok: false, status: 403, error: 'اشتراك المنيو الإلكتروني غير مفعّل' }
  const ids = menuBranchIds(sub)
  if (!ids) return { ok: true, mode: 'org', branchId: null, canManageOrg: true, branches: [] }

  let branches = await loadMenuBranches(db, orgId, ids)
  if (!branches.length) return { ok: false, status: 403, error: 'ما فيه فرع مشترك بالمنيو الإلكتروني' }

  if (access.role === 'manager') {
    const own = branches.find(b => b.id === access.branchId)
    if (!own) return { ok: false, status: 403, error: 'فرعك غير مشترك بالمنيو الإلكتروني — كلّم مالك المنشأة' }
    branches = [own]
    return { ok: true, mode: 'branch', branchId: own.id, canManageOrg: false, branches }
  }
  const picked = branches.find(b => b.id === requestedBranch) || branches[0]
  return { ok: true, mode: 'branch', branchId: picked.id, canManageOrg: true, branches }
}

/** يقدر يعدّل صنف تابع لهالفرع؟ (null = صنف لكل الفروع: للمالك بس) */
export function canEditItemBranch(scope: Extract<MenuScope, { ok: true }>, itemBranchId: string | null): boolean {
  if (scope.mode === 'org') return true
  if (!itemBranchId) return scope.canManageOrg
  return scope.branches.some(b => b.id === itemBranchId)
}

/** يعطي كل فرع ناقص رابط من اسمه (فريد داخل المنشأة) */
export async function ensureBranchSlugs(db: SupabaseClient, orgId: string, branches: MenuBranch[]): Promise<MenuBranch[]> {
  if (branches.every(b => b.shop_slug)) return branches
  const { data: all } = await db.from('branches').select('shop_slug').eq('org_id', orgId).not('shop_slug', 'is', null)
  const taken = new Set((all || []).map((r: any) => r.shop_slug))
  for (const b of branches) {
    if (b.shop_slug) continue
    const base = slugifyShop(b.name).length >= 2 ? slugifyShop(b.name) : 'branch'
    let s = base, n = 2
    while (taken.has(s)) s = `${base}-${n++}`
    const { error } = await db.from('branches').update({ shop_slug: s } as any).eq('id', b.id).eq('org_id', orgId).is('shop_slug', null)
    if (!error) { b.shop_slug = s; taken.add(s) }
  }
  return branches
}

export function safeDecode(v: string) {
  try { return decodeURIComponent(v) } catch { return v }
}

export type PublicMenuItem = { name: string; category: string; price: number | null; description: string | null; image_url: string | null; is_featured: boolean; sort_order: number; sold_out?: boolean }

async function loadItems(db: SupabaseClient, orgId: string, branchId: string | null): Promise<PublicMenuItem[]> {
  let prodQ = db.from('products').select('name,category,public_price,public_description,public_image_url,sort_order')
    .eq('org_id', orgId).eq('show_on_shop', true).eq('is_active', true)
  let itemsQ = db.from('shop_items').select('name,category,price,description,image_url,is_featured,is_available,sort_order').eq('org_id', orgId).eq('is_hidden', false)
  if (branchId) {
    prodQ = prodQ.eq('branch_id', branchId)
    itemsQ = itemsQ.or(`branch_id.eq.${branchId},branch_id.is.null`)
  }
  const [{ data: invProducts }, { data: shopItems }] = await Promise.all([prodQ, itemsQ])
  const all: PublicMenuItem[] = [
    ...(invProducts || []).map((p: any) => ({ name: p.name, category: p.category || 'المنتجات', price: p.public_price, description: p.public_description, image_url: p.public_image_url, is_featured: false, sort_order: p.sort_order || 0 })),
    ...(shopItems || []).map((it: any) => ({ name: it.name, category: it.category || 'منتجات المتجر', price: it.price, description: it.description, image_url: it.image_url, is_featured: !!it.is_featured, sort_order: it.sort_order || 0, sold_out: it.is_available === false })),
  ].sort((a, b) => a.sort_order - b.sort_order)
  // نفس الصنف بنفس السعر والقسم (مثلاً مفعّل بفرعين بالمنيو الموحد) يطلع مرة وحدة
  const seen = new Set<string>()
  return all.filter(it => {
    const k = `${it.category}|${String(it.name).trim().toLowerCase()}|${it.price ?? ''}`
    if (seen.has(k)) return false
    seen.add(k); return true
  })
}

export type PublicMenu =
  | { kind: 'menu'; org: any; branch: MenuBranch | null; branchCount: number; hours: any; products: PublicMenuItem[] }
  | { kind: 'pick'; org: any; branches: MenuBranch[]; missing?: boolean }

/** بيانات الصفحة العامة: منيو فرع، أو صفحة اختيار الفرع، أو null لو المنيو غير متاح */
export async function getPublicMenu(db: SupabaseClient, slugRaw: string, branchRaw?: string | null): Promise<PublicMenu | null> {
  const slug = safeDecode(slugRaw)
  const { data: org } = await db.from('organizations').select('id,name,logo_url,shop_tagline,shop_enabled,shop_color,shop_display_name,shop_links,shop_hours').eq('shop_slug', slug).maybeSingle()
  if (!org || !(org as any).shop_enabled) return null
  const orgId = (org as any).id

  // لازم اشتراك فعّال بإضافة المنيو — وإلا الصفحة العامة تختفي حتى لو مفعّلة داخلياً
  const sub = await loadMenuSub(db, orgId)
  if (!sub) return null

  const ids = menuBranchIds(sub)
  if (!ids) {
    return { kind: 'menu', org, branch: null, branchCount: 1, hours: (org as any).shop_hours, products: await loadItems(db, orgId, null) }
  }

  const branches = await ensureBranchSlugs(db, orgId, await loadMenuBranches(db, orgId, ids))
  if (!branches.length) return null
  const key = branchRaw ? safeDecode(branchRaw) : ''
  const branch = key ? branches.find(b => b.shop_slug === key || b.id === key) : null
  // رابط فرع انسحبت منه الإضافة (أو انحذف): ما نعرض منيو فرع ثاني مكانه — "غير متاح" + الفروع المتاحة
  if (key && !branch) return { kind: 'pick', org, branches, missing: true }
  const chosen = branch || (branches.length === 1 ? branches[0] : null)
  if (!chosen) return { kind: 'pick', org, branches }
  return {
    kind: 'menu', org, branch: chosen, branchCount: branches.length,
    hours: chosen.shop_hours || (org as any).shop_hours,
    products: await loadItems(db, orgId, chosen.id),
  }
}

/** أوقات الدوام من الطلب — null = يرث أوقات المنشأة */
export function cleanShopHours(h: any): { enabled: boolean; is24h: boolean; open: string; close: string } | null {
  if (!h || typeof h !== 'object') return null
  const t = (v: any, d: string) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d)
  return { enabled: !!h.enabled, is24h: h.is24h !== false, open: t(h.open, '09:00'), close: t(h.close, '22:00') }
}
