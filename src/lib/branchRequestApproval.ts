// موافقة الأدمن على طلب فرع بخدماته («باقتك المخصصة»): ينشئ الفرع + يزيد حد الفروع + يضيف الفرع لكل خدمة اختارها العميل.
// كلها أو ولا شي: لو تعذّرت خطوة نرجّع الاشتراكات لحالها قبل الموافقة ونحذف الفرع الجديد.
import type { SupabaseClient } from '@supabase/supabase-js'
import { activateAddon } from '@/lib/addonActivation'
import { targetForRequest } from '@/lib/addonRequests'
import { getBranchLimit, syncBranchesToLimit } from '@/lib/branchLimit'
import { syncStaffToLimit } from '@/lib/staffCapacity'
import { clearFeatureCache } from '@/lib/featureRoutes'
import { maxSelfServeBranches, planKeyOf } from '@/lib/planPricing'
import { PER_BRANCH_SERVICES, cleanBranchName, cleanBranchLocation } from '@/lib/branchServices'

type Req = { id: string; org_id: string; addon_id: string; details: any }
export type BranchApproval =
  | { ok: true; branchId: string; branchName: string; services: string[]; proratedAmount: number; proratedDays: number }
  | { ok: false; status: number; error: string }

const live = (s: any) => !!s && s.status === 'active' && (!s.expires_at || new Date(s.expires_at).getTime() > Date.now())

export async function approveBranchRequest(db: SupabaseClient, r: Req): Promise<BranchApproval> {
  const d = r.details || {}
  const name = cleanBranchName(d.branch_name)
  if (name.length < 2) return { ok: false, status: 400, error: 'اسم الفرع في الطلب ناقص' }
  const slugs: string[] = Array.isArray(d.services) ? [...new Set<string>(d.services.filter((s: unknown) => typeof s === 'string' && PER_BRANCH_SERVICES.includes(s as string)))] : []

  // الحد: لو المنشأة وصلت أقصى فروع باقتها بعد ما طلبت (فعّلت فرع موقوف مثلاً) نوقف قبل أي تغيير
  const [{ data: org }, limit, { data: addons }] = await Promise.all([
    db.from('organizations').select('plan,max_branches').eq('id', r.org_id).single(),
    getBranchLimit(db, r.org_id),
    slugs.length ? db.from('marketplace_addons').select('id,slug,name').in('slug', slugs) : Promise.resolve({ data: [] as any[] }),
  ])
  const maxTotal = maxSelfServeBranches(planKeyOf((org as any)?.plan, (org as any)?.max_branches), limit.base)
  if (limit.total + 1 > maxTotal) return { ok: false, status: 409, error: `المنشأة وصلت أقصى عدد فروع في باقتها (${maxTotal})` }
  const rows = (addons || []) as any[]
  if (rows.length !== slugs.length) return { ok: false, status: 500, error: 'خدمة في الطلب غير متاحة' }

  // لقطة الاشتراكات قبل التغيير — للرجوع لو تعذّرت خطوة
  const ids = [r.addon_id, ...rows.map(a => a.id)]
  const { data: beforeRows } = await db.from('org_addon_subscriptions').select('*').eq('org_id', r.org_id).in('addon_id', ids)
  const before = (beforeRows || []) as any[]

  const { data: br, error: bErr } = await db.from('branches')
    .insert({ org_id: r.org_id, name, location: cleanBranchLocation(d.location), is_active: true } as any).select('id').single()
  if (bErr || !br) return { ok: false, status: 500, error: 'تعذّر إنشاء الفرع' }
  const branchId = (br as any).id as string

  const undo = async () => {
    for (const id of ids) {
      const old = before.find(s => s.addon_id === id)
      if (old) await db.from('org_addon_subscriptions').upsert(old, { onConflict: 'org_id,addon_id' })
      else await db.from('org_addon_subscriptions').delete().eq('org_id', r.org_id).eq('addon_id', id)
    }
    await db.from('branches').delete().eq('id', branchId).eq('org_id', r.org_id)
    clearFeatureCache(r.org_id)
    await syncBranchesToLimit(db, r.org_id).catch(() => null)
    await syncStaffToLimit(db, r.org_id).catch(() => null)
  }

  try {
    // 1) مكان الفرع: حد الفروع يزيد واحد (الفرع نفسه بدون رسوم بالباقة المخصصة)
    const slotSub = before.find(s => s.addon_id === r.addon_id) || null
    const slot = await activateAddon(db, { orgId: r.org_id, addonId: r.addon_id, quantity: targetForRequest('extra_branch', slotSub, { quantity: 1 }).quantity })
    if (!slot.ok) { await undo(); return { ok: false, status: slot.status, error: slot.error } }
    let amount = slot.proratedAmount, days = slot.proratedDays

    // 2) الخدمات: المشتركة لكل الفروع تزيد كميتها، المحددة لفروع ينضاف لها الفرع، والجديدة تبدأ بالفرع الجديد
    for (const a of rows) {
      const s = before.find(x => x.addon_id === a.id)
      const res = !live(s)
        ? await activateAddon(db, { orgId: r.org_id, addonId: a.id, branchIds: [branchId] })
        : !s.branch_ids || !s.branch_ids.length
          ? await activateAddon(db, { orgId: r.org_id, addonId: a.id, allBranches: true, quantity: Math.max(1, Number(s.quantity) || 1) + 1 })
          : await activateAddon(db, { orgId: r.org_id, addonId: a.id, branchIds: [...s.branch_ids, branchId] })
      if (!res.ok) { await undo(); return { ok: false, status: res.status, error: `تعذّر تفعيل «${a.name}» للفرع الجديد، وما تغيّر شي` } }
      amount += res.proratedAmount; days = Math.max(days, res.proratedDays)
    }
    return { ok: true, branchId, branchName: name, services: rows.map(a => a.name), proratedAmount: Math.round(amount), proratedDays: days }
  } catch {
    await undo()
    return { ok: false, status: 500, error: 'تعذّرت الموافقة، وما تغيّر شي' }
  }
}
