import crypto from 'crypto'

/**
 * نظام "تذكرة موظف موقّعة" (Signed Staff Token)
 * ============================================
 * الموظفين يسجلون دخول بـ PIN (بدون حساب Supabase)، فما فيه "جلسة" رسمية
 * نتحقق منها. هذا التوكن يحل المشكلة: يحتوي بيانات الموظف (staff_id, org_id,
 * branch_id) موقّعة بمفتاح سري — أي تلاعب بالبيانات يُكتشف فوراً لأن التوقيع
 * ما يطابق.
 *
 * الشكل: base64(payload).signature
 */

const SECRET = process.env.STAFF_TOKEN_SECRET!
const EXPIRY_HOURS = 12 // الجلسة تنتهي بعد 12 ساعة، الموظف يسجل دخول من جديد

interface StaffPayload {
  staff_id: string
  org_id: string
  branch_id: string | null
  exp: number // وقت الانتهاء (timestamp)
}

function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('hex')
}

/**
 * يولّد توكن موقّع بعد نجاح تسجيل دخول الموظف بـ PIN.
 */
export function generateStaffToken(staff_id: string, org_id: string, branch_id: string | null): string {
  const payload: StaffPayload = {
    staff_id,
    org_id,
    branch_id,
    exp: Date.now() + EXPIRY_HOURS * 60 * 60 * 1000,
  }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = sign(payloadB64)
  return `${payloadB64}.${signature}`
}

/**
 * يتحقق من صحة التوكن ويرجّع بيانات الموظف الموثوقة منه (مو من الطلب).
 * يُستخدم بأول كل API خاص بالموظفين بدل الثقة بـ org_id من الـbody مباشرة.
 */
export function verifyStaffToken(token: string | null): { valid: boolean; data?: StaffPayload; error?: string } {
  if (!token) return { valid: false, error: 'لا يوجد توكن — يرجى تسجيل الدخول' }

  const parts = token.split('.')
  if (parts.length !== 2) return { valid: false, error: 'توكن غير صالح' }

  const [payloadB64, signature] = parts
  const expectedSignature = sign(payloadB64)

  // مقارنة آمنة تقاوم هجمات توقيت (timing attack)
  const sigBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, error: 'توكن غير صالح — تم التلاعب به' }
  }

  let payload: StaffPayload
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
  } catch {
    return { valid: false, error: 'توكن تالف' }
  }

  if (Date.now() > payload.exp) {
    return { valid: false, error: 'انتهت الجلسة — يرجى تسجيل الدخول من جديد' }
  }

  return { valid: true, data: payload }
}

/**
 * يستخرج التوكن من هيدر الطلب (Authorization: Bearer xxx)
 */
export function extractStaffToken(req: Request): string | null {
  const header = req.headers.get('authorization')
  if (!header || !header.startsWith('Bearer ')) return null
  return header.slice(7)
}
