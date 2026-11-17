// محاولات رموز التحقق (المحاسب، السفراء، الجهاز): نحجز المحاولة قبل ما نقارن الرمز —
// تحديث مشروط (attempts = القيمة اللي قريناها) فالطلبات المتزامنة ما تقدر تخمّن أكثر من الحد بنفس العدّ.
import type { SupabaseClient } from '@supabase/supabase-js'

/** يحجز محاولة: true لو نجح، false لو طلب ثاني سبقه (نرفض هالمحاولة) */
export async function claimAttempt(db: SupabaseClient, table: string, id: string, current: number): Promise<boolean> {
  const { data, error } = await (db as any).from(table).update({ attempts: current + 1 }).eq('id', id).eq('attempts', current).is('used_at', null).select('id')
  return !error && Array.isArray(data) && data.length === 1
}

/** يستهلك الرمز مرة وحدة فقط (طلبين بنفس الرمز الصحيح → واحد ينجح) */
export async function consumeCode(db: SupabaseClient, table: string, id: string): Promise<boolean> {
  const { data, error } = await (db as any).from(table).update({ used_at: new Date().toISOString() }).eq('id', id).is('used_at', null).select('id')
  return !error && Array.isArray(data) && data.length === 1
}

export const RACE_ERROR = 'محاولة متزامنة — أعد المحاولة بعد لحظة'
