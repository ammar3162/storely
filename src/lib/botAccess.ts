// صلاحيات بوت واتساب — نفس قواعد لوحة التحكم:
// اشتراك المنشأة شغّال، الميزة مفعّلة، ومدير الفرع ما يوصل إلا لفرعه وبصلاحياته.
// (كان البوت يكتفي بأن الحساب «active»: المنتهي اشتراكه يكمل، والمدير يختار أي فرع ويصرف بدون صلاحية)
import { managerMay } from '@/lib/managerPerms'

export type BotUser = { id: string; org_id: string; role?: string | null; branch_id?: string | null; permissions?: Record<string, unknown> | null }
export type BotAction = 'stock' | 'purchases' | 'dispense'

/** صلاحيات المدير اللي تكفي لكل عملية (يكفي وحدة) — المالك مسموح دايماً */
const ACTION_PERMS: Record<BotAction, string[]> = {
  stock: ['inventory', 'dispense', 'reports'],
  purchases: ['purchases', 'reports'],
  dispense: ['dispense'],
}
export const ACTION_FEATURE: Record<BotAction, 'inventory' | 'purchases'> = { stock: 'inventory', purchases: 'purchases', dispense: 'inventory' }

export const botMayAct = (user: BotUser, action: BotAction) => managerMay(user, ...ACTION_PERMS[action])

/** الفرع اللي يشتغل عليه البوت: المدير = فرعه دايماً (حتى لو اختار غيره)، المالك = اللي اختاره (أو كل الفروع) */
export const botBranch = (user: BotUser, selected: string | null) => (user.role === 'manager' ? user.branch_id || null : selected)

export const managerWithoutBranch = (user: BotUser) => user.role === 'manager' && !user.branch_id

export const BOT_NO_PERMISSION = 'ليست لديك صلاحية على هذا الطلب. تواصل مع مالك المنشأة لإضافتها.\n\nاكتب 0 للقائمة'
export const BOT_NO_BRANCH = 'لم يُحدَّد فرع لحسابك بعد. تواصل مع مالك المنشأة.'

export function botBlockedText(reason: 'expired' | 'suspended' | null): string {
  return reason === 'suspended'
    ? 'حساب منشأتك موقوف حالياً، لذلك لا يمكن استخدام خدمة واتساب.\n\nللتواصل مع الدعم اكتب 4'
    : 'انتهى اشتراك منشأتك. جدّد الاشتراك من storely.dev لمتابعة استخدام خدمة واتساب.\n\nللتواصل مع الدعم اكتب 4'
}
