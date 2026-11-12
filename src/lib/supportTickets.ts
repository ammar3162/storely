// تذاكر الدعم الفني — تنظيف المدخلات (المحادثة مع المساعد) قبل الحفظ
export type TicketMsg = { role: 'user' | 'ai'; text: string }
export const TICKET_STATUS = { new: 'جديدة', open: 'تم الرد', resolved: 'محلولة' } as const

/** آخر 30 رسالة، كل رسالة 2000 حرف كحد أقصى، والأدوار المعروفة فقط */
export function cleanConversation(raw: unknown): TicketMsg[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((m: any) => m && (m.role === 'user' || m.role === 'ai') && typeof m.text === 'string' && m.text.trim())
    .slice(-30)
    .map((m: any) => ({ role: m.role, text: String(m.text).trim().slice(0, 2000) }))
}

/** موضوع التذكرة: نص العميل نفسه، أو آخر سؤال كتبه في المحادثة */
export function ticketSubject(subject: unknown, conversation: TicketMsg[]): string {
  const s = typeof subject === 'string' ? subject.trim() : ''
  const last = [...conversation].reverse().find(m => m.role === 'user')?.text || ''
  return (s || last).slice(0, 500)
}

/** الصفحة: مسار داخلي فقط (يمنع حفظ روابط خارجية) */
export const cleanPage = (p: unknown) => (typeof p === 'string' && /^\/[\w\-/?=&.%]*$/.test(p) ? p.slice(0, 200) : null)
