// فحص سريع قبل المساعد: السؤال عن المنشأة/النظام/الاشتراك؟ — الأسئلة الخارجية (العمر، أسئلة عامة…)
// ترجع رد جاهز بدون ما نرسل بيانات المنشأة للنموذج، فما ينصرف توكن كامل (الفحص نفسه ~100 توكن)
export type Topic = 'business' | 'greeting' | 'other'

export const OFF_TOPIC_REPLY = 'أنا مساعد منشأتك في ستورلي، أجاوب بس عن بيانات منشأتك وطريقة استخدام النظام واشتراكك.\n\nجرّب تسألني مثلاً: «وش الأصناف اللي بتخلص هالأسبوع؟» أو «مين تأخر اليوم؟» أو «متى ينتهي اشتراكي؟»'
export const GREETING_REPLY = 'هلا والله! أنا مساعد منشأتك في ستورلي.\n\nأقدر أساعدك في المخزون والطلبات، والموظفين والحضور، وإقفالات الكاشير، والأرباح، واشتراكك، وطريقة استخدام النظام. وش تبي تعرف؟'

const PROMPT = `صنّف رسالة مستخدم نظام إدارة منشأة (مطعم/كوفي/محل) إلى كلمة وحدة:
business = أي سؤال عن منشأته أو بياناتها: المخزون، الأصناف، الصرف، المشتريات، الموردين، الطلبات، الموظفين، الحضور، الدوام، الرواتب، الكاشير، المبيعات، الأرباح، المصاريف، الفروع، التقارير، الاشتراك، الباقات، الفاتورة، الإضافات، أو طريقة استخدام النظام.
greeting = تحية أو شكر بس بدون سؤال.
other = أي شي ثاني: أسئلة عامة أو شخصية أو معلومات خارجية أو طلبات ما لها علاقة بالمنشأة.
رد بكلمة وحدة فقط: business أو greeting أو other.`

/** يرجع business لو الفحص فشل (ما نمنع المستخدم بسبب عطل) */
export async function classifyTopic(message: string): Promise<Topic> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, system: PROMPT, messages: [{ role: 'user', content: String(message).slice(0, 500) }] }),
    })
    if (!res.ok) return 'business'
    const j = await res.json() as any
    const t = String(j.content?.[0]?.text || '').trim().toLowerCase()
    return t.startsWith('other') ? 'other' : t.startsWith('greeting') ? 'greeting' : 'business'
  } catch {
    return 'business'
  }
}
