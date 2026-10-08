import type { SupabaseClient } from '@supabase/supabase-js'
import { formatPhone } from '@/lib/whatsapp'

// رقم واتساب المالك للتنبيهات: الرقم اللي حدده بإعدادات المنشأة (يقدر يغيّره)،
// ولو ما حدد نرجع لجوال التسجيل — وبصيغة دولية (بدون + وبمفتاح الدولة)
export function pickOwnerWhatsapp(orgWhatsapp: string | null | undefined, profilePhone: string | null | undefined): string | null {
  const raw = (orgWhatsapp || '').trim() || (profilePhone || '').trim()
  if (!raw) return null
  const p = formatPhone(raw).replace(/\D/g, '')
  return p.length >= 9 ? p : null
}

export async function ownerWhatsapp(db: SupabaseClient, orgId: string): Promise<string | null> {
  const [{ data: org }, { data: owner }] = await Promise.all([
    db.from('organizations').select('whatsapp_number').eq('id', orgId).maybeSingle(),
    db.from('profiles').select('phone').eq('org_id', orgId).eq('role', 'owner').maybeSingle(),
  ])
  return pickOwnerWhatsapp((org as any)?.whatsapp_number, (owner as any)?.phone)
}
