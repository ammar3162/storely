import crypto from 'crypto'

// نسخة قابلة للعرض من رمز PIN للموظف (أيقونة العين عند المالك).
// الدخول يتحقق من bcrypt في عمود pin؛ هذي النسخة للعرض فقط وتنفك في الخادم بعد التحقق من المالك.
// المفتاح من STAFF_PIN_KEY (مستقل عن توقيع دخول الموظفين)، وإلا من STAFF_TOKEN_SECRET.
// لو تغيّر المفتاح، الرموز المحفوظة ما تنعرض لين يتجدد الرمز — الدخول ما يتأثر.
function key() {
  const secret = process.env.STAFF_PIN_KEY || process.env.STAFF_TOKEN_SECRET
  if (!secret) throw new Error('STAFF_PIN_KEY missing')
  return Buffer.from(crypto.hkdfSync('sha256', secret, 'storely', 'staff-pin-v1', 32))
}

export function encryptPin(pin: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(String(pin), 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':')
}

// للحفظ: لو فشل التشفير ما نوقف إضافة الموظف أو تجديد الرمز — نحفظ بدون نسخة العرض ونسجّل السبب
export function encryptPinSafe(pin: string): string | null {
  try { return encryptPin(pin) } catch (e) { console.error('PIN_ENCRYPT_FAILED', e); return null }
}

export function decryptPin(enc: string | null | undefined): string | null {
  if (!enc) return null
  try {
    const [v, iv, tag, data] = enc.split(':')
    if (v !== 'v1') return null
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
