import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/email'
import { brandEmail } from '@/lib/emailTemplates'
import { siteUrl } from '@/lib/accountantSend'

// رسائل المندوب (واتساب + إيميل) — أفضل جهد، ما توقف العملية لو فشلت
export async function notifyAgent(db: SupabaseClient, agentId: string, o: { title: string; lines: string[]; whatsapp: string }) {
  const { data: a } = await db.from('sales_agents').select('name,phone,email').eq('id', agentId).maybeSingle()
  if (!a) return
  const url = `${siteUrl()}/agents/wallet`
  await Promise.allSettled([
    sendWhatsAppMessage((a as any).phone, `${o.whatsapp}\n\nمحفظتك: ${url}`),
    sendEmail({ to: (a as any).email, subject: `${o.title} — Storely`, html: brandEmail({ title: o.title, greeting: `هلا ${(a as any).name}،`, paragraphs: o.lines,
      button: { label: 'افتح محفظتك', url } }) }),
  ])
}
