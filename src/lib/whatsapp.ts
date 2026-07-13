/**
 * أدوات مشتركة لإرسال رسائل واتساب بشكل موثوق:
 * - تأخير تلقائي بين كل رسالة والتانية (يحترم حدود إرسال Wasender API)
 * - إعادة محاولة تلقائية (retry) عند فشل الإرسال المؤقت (مثل rate-limit أو تعليق شبكة)
 */

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface SendResult {
  ok: boolean
  status?: number
  data?: any
}

/**
 * يرسل رسالة واتساب وحدة، مع إعادة محاولة تلقائية (حتى مرتين إضافيتين)
 * لو فشل الإرسال بسبب مؤقت (rate limit، تعليق شبكة، خطأ سيرفر 5xx).
 */
export async function sendWhatsAppMessage(phone: string, text: string, retries = 2): Promise<SendResult> {
  const apiKey  = process.env.WASENDER_API_KEY!
  const session = process.env.WASENDER_SESSION_ID!

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://www.wasenderapi.com/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Session-Id': session,
        },
        body: JSON.stringify({ to: phone, text }),
      })

      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        return { ok: true, status: res.status, data }
      }

      // خطأ 429 (rate limit) أو 5xx (خطأ سيرفر مؤقت) — يستاهل إعادة محاولة
      const shouldRetry = (res.status === 429 || res.status >= 500) && attempt < retries
      if (shouldRetry) {
        await delay(1200 * (attempt + 1)) // تأخير متصاعد: 1.2s ثم 2.4s
        continue
      }

      const data = await res.json().catch(() => ({}))
      return { ok: false, status: res.status, data }
    } catch (err: any) {
      if (attempt < retries) {
        await delay(1200 * (attempt + 1))
        continue
      }
      return { ok: false, data: { error: err.message } }
    }
  }
  return { ok: false, data: { error: 'exhausted retries' } }
}

/**
 * يرسل رسائل متعددة بالتسلسل مع تأخير آمن بين كل رسالة (افتراضياً 600ms)
 * — يحمي من تجاوز حدود إرسال Wasender API عند الإرسال الجماعي (broadcast).
 * يرجع مصفوفة نتائج بنفس ترتيب المدخلات.
 */
export async function sendWhatsAppBulk<T>(
  items: T[],
  getPhoneAndText: (item: T) => { phone: string; text: string } | null,
  delayMs = 600
): Promise<{ item: T; result: SendResult | null }[]> {
  const results: { item: T; result: SendResult | null }[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const target = getPhoneAndText(item)
    if (!target) { results.push({ item, result: null }); continue }
    const result = await sendWhatsAppMessage(target.phone, target.text)
    results.push({ item, result })
    if (i < items.length - 1) await delay(delayMs)
  }
  return results
}

export function formatPhone(raw: string): string {
  const clean = (raw || '').replace(/\s/g, '')
  if (clean.startsWith('+')) return clean.slice(1)
  if (clean.startsWith('00')) return clean.slice(2)
  if (clean.startsWith('966')) return clean
  if (clean.startsWith('05')) return '966' + clean.slice(1)
  if (clean.startsWith('5')) return '966' + clean
  return clean
}
