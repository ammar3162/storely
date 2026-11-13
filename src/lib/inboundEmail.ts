// البريد الوارد (ردود العملاء على support@storely.dev) — تنظيف الرسالة قبل الحفظ
const OWN = /(@(storely\.dev|[\w-]+\.resend\.app|improvmx\.com)|^(mailer-daemon|postmaster)@.+)$/i

/** «اسم <email>» أو «email» → { email, name } بأحرف صغيرة للبريد */
export function parseFrom(header: unknown, fallback: unknown): { email: string; name: string | null } {
  const h = typeof header === 'string' ? header.trim() : ''
  const m = h.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  const email = (m ? m[2] : (h || String(fallback || ''))).trim().toLowerCase()
  const name = m && m[1].trim() ? m[1].trim().slice(0, 120) : null
  return { email: email.slice(0, 254), name }
}

/** رسائل من عناويننا نفسها أو من خدمات البريد (ارتداد، حلقة تحويل، رسالة اختبار ImprovMX) ما تنحفظ */
export const isOwnAddress = (email: string) => OWN.test(email.trim())

/** HTML → نص بسيط (لما الرسالة بدون نسخة نصية) */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h\d|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** نص الرد فقط: يشيل الرسالة الأصلية المقتبسة تحته (Gmail/Outlook/iPhone عربي وإنجليزي) */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const cut = lines.findIndex(l =>
    /^\s*On .{4,200}wrote:\s*$/i.test(l) || /^\s*في .{4,200}كتب.{0,40}:\s*$/.test(l) ||
    /^\s*-{2,}\s*(Original Message|الرسالة الأصلية)/i.test(l) || /^\s*(From|من):\s.+/.test(l) && /^\s*(Sent|Date|أُرسلت|التاريخ|بتاريخ):/i.test(lines[lines.indexOf(l) + 1] || ''))
  const kept = (cut > 0 ? lines.slice(0, cut) : lines).filter(l => !/^\s*>/.test(l))
  const out = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return (out || text.trim()).slice(0, 20000)
}
