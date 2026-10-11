import bcrypt from 'bcryptjs'
import type { SupabaseClient } from '@supabase/supabase-js'

// رمز الحماية للمالك: يطلبه تعديل/حذف إقفال الكاشير. مشفّر bcrypt، ويتقفل ١٥ دقيقة بعد ٥ محاولات غلط
export const PIN_MAX_FAILS = 5
export const PIN_LOCK_MINUTES = 15
export const isValidPinFormat = (p: unknown) => /^\d{4,6}$/.test(String(p ?? ''))

export async function ownerPinIsSet(db: SupabaseClient, orgId: string) {
  const { data } = await db.from('organizations').select('owner_pin_hash').eq('id', orgId).maybeSingle()
  return !!(data as any)?.owner_pin_hash
}

/** يحفظ رمز جديد. لو فيه رمز قبل، لازم الرمز الحالي صحيح */
export async function setOwnerPin(db: SupabaseClient, orgId: string, pin: string, currentPin?: string): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!isValidPinFormat(pin)) return { ok: false, error: 'الرمز من ٤ إلى ٦ أرقام', status: 400 }
  if (/^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) return { ok: false, error: 'اختر رمز أصعب من ' + pin, status: 400 }
  if (await ownerPinIsSet(db, orgId)) {
    const v = await verifyOwnerPin(db, orgId, currentPin)
    if (!v.ok) return v
  }
  await db.from('organizations').update({ owner_pin_hash: await bcrypt.hash(pin, 10), owner_pin_failed: 0, owner_pin_locked_until: null } as any).eq('id', orgId)
  return { ok: true }
}

export async function verifyOwnerPin(db: SupabaseClient, orgId: string, pin: unknown): Promise<{ ok: true } | { ok: false; error: string; status: number; notSet?: boolean }> {
  const { data } = await db.from('organizations').select('owner_pin_hash,owner_pin_failed,owner_pin_locked_until').eq('id', orgId).maybeSingle()
  const o = data as any
  if (!o?.owner_pin_hash) return { ok: false, error: 'اختر رمز الحماية أول', status: 428, notSet: true }
  if (o.owner_pin_locked_until && Date.parse(o.owner_pin_locked_until) > Date.now()) {
    const mins = Math.ceil((Date.parse(o.owner_pin_locked_until) - Date.now()) / 60000)
    return { ok: false, error: `محاولات كثيرة — جرّب بعد ${mins} دقيقة`, status: 429 }
  }
  const good = isValidPinFormat(pin) && await bcrypt.compare(String(pin), o.owner_pin_hash)
  if (!good) {
    const fails = Number(o.owner_pin_failed || 0) + 1
    const lock = fails >= PIN_MAX_FAILS
    await db.from('organizations').update({ owner_pin_failed: lock ? 0 : fails, owner_pin_locked_until: lock ? new Date(Date.now() + PIN_LOCK_MINUTES * 60e3).toISOString() : null } as any).eq('id', orgId)
    return { ok: false, error: lock ? `الرمز غلط — انقفل ${PIN_LOCK_MINUTES} دقيقة` : `الرمز غلط (باقي ${PIN_MAX_FAILS - fails} محاولات)`, status: 403 }
  }
  if (o.owner_pin_failed) await db.from('organizations').update({ owner_pin_failed: 0 } as any).eq('id', orgId)
  return { ok: true }
}
