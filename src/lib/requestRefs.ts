import type { SupabaseClient } from '@supabase/supabase-js'

// إشعارات المالك المربوطة بطلب (استئذان، سلفة، إجازة، عجز كاشير) — فيها أزرار موافقة/رفض.
// بعد القرار (من الإشعار أو من إدارة الموظفين) نعلّم الإشعار مقروء.
export type RefType = 'excuse_request' | 'advance_request' | 'leave_request' | 'cashier_deficit' | 'extra_day'

export async function markRefNotificationsRead(db: SupabaseClient, orgId: string, refType: RefType, refId: string) {
  await db.from('notifications').update({ read: true } as any).eq('org_id', orgId).eq('ref_type', refType).eq('ref_id', refId)
}
