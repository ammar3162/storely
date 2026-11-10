// هل المنشأة شغّالة؟ — كل الإرسال التلقائي (واتساب، طلبات الموردين، تقارير المحاسب) يمر من هنا.
// الحساب الموقوف، أو اللي انتهى اشتراكه، أو بدون مالك (انحذف) = ما يوصله شي، ولا لموردينه أو محاسبه.
export async function isSubscriptionActive(supabase: any, orgId: string): Promise<boolean> {
  try {
    const { data: owner } = await supabase
      .from('profiles')
      .select('status,subscription_ends_at')
      .eq('org_id', orgId)
      .eq('role', 'owner')
      .maybeSingle()

    if (!owner) return false // منشأة بدون مالك = محذوفة أو ناقصة
    if (owner.status === 'suspended') return false
    if (!owner.subscription_ends_at) return true // حسابات قديمة بدون تاريخ انتهاء
    return new Date(owner.subscription_ends_at) > new Date()
  } catch {
    return true // عند خطأ مؤقت بالتحقق ما نوقف تنبيهات منشأة شغّالة
  }
}

// ---------- اشتراك المنشأة لكل حساباتها (المالك والمدراء) ----------
// المدير يتبع اشتراك المالك: التاريخ اللي يقفل المالك يقفله هو بعد — مو تاريخ حسابه هو.
export type OrgSubState = { blocked: boolean; reason: 'expired' | 'suspended' | null; endsAt: string | null; type: string | null }
type OwnerRow = { status?: string | null; subscription_type?: string | null; subscription_ends_at?: string | null } | null

/** حالة اشتراك المنشأة من ملف المالك (دالة صافية) — بدون مالك = ما نقفل (ما نعرف، والإرسال التلقائي له فحصه) */
export function subStateFromOwner(owner: OwnerRow, now = Date.now()): OrgSubState {
  if (!owner) return { blocked: false, reason: null, endsAt: null, type: null }
  const endsAt = owner.subscription_ends_at || null, type = owner.subscription_type || null
  if (owner.status === 'suspended' || owner.status === 'deleted') return { blocked: true, reason: 'suspended', endsAt, type }
  if (endsAt && new Date(endsAt).getTime() < now) return { blocked: true, reason: 'expired', endsAt, type }
  return { blocked: false, reason: null, endsAt, type }
}

const SUB_TTL_MS = 30_000
const subCache = new Map<string, { at: number; v: OrgSubState }>()

/** حالة اشتراك المنشأة (من ملف المالك بمفتاح الخدمة) — محفوظة 30 ثانية. عند خطأ القراءة ما نقفل أحد */
/** بعد التجديد: ننسى الحالة المحفوظة للمنشأة عشان تنفتح على طول (في نفس الخادم) */
export function forgetOrgSubState(orgId: string) { subCache.delete(orgId) }

export async function orgSubscriptionState(orgId: string, db?: any): Promise<OrgSubState> {
  const hit = subCache.get(orgId)
  if (hit && Date.now() - hit.at < SUB_TTL_MS) return hit.v
  try {
    const client = db || (await import('@supabase/supabase-js')).createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await client.from('profiles').select('status,subscription_type,subscription_ends_at').eq('org_id', orgId).eq('role', 'owner').maybeSingle()
    if (error) return { blocked: false, reason: null, endsAt: null, type: null }
    const v = subStateFromOwner(data as OwnerRow)
    subCache.set(orgId, { at: Date.now(), v })
    return v
  } catch {
    return { blocked: false, reason: null, endsAt: null, type: null }
  }
}
