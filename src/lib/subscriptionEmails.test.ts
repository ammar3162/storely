import { describe, it, expect } from 'vitest'
import { subscriptionEndingEmail, subscriptionEndedEmail } from './emailTemplates'

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
describe('subscription emails (inbox-friendly)', () => {
  it('3-day reminder: clear subject, one renew link, plain text, no emoji', () => {
    const e = subscriptionEndingEmail({ name: 'عمار', daysLeft: 3, endsAt: '2026-11-13T00:00:00Z', isTrial: false })
    expect(e.subject).toBe('ينتهي اشتراكك في Storely خلال 3 أيام')
    expect(e.text).toContain('https://www.storely.dev/renew')
    expect(EMOJI.test(e.subject + e.text)).toBe(false)
    expect((e.html.match(/href="https:\/\/www\.storely\.dev\/renew"/g) || []).length).toBeGreaterThanOrEqual(1)
    expect(e.html).not.toContain('wa.me')   // بدون زر واتساب (minimal)
  })
  it('trial wording and day forms', () => {
    expect(subscriptionEndingEmail({ daysLeft: 1, endsAt: '2026-11-11', isTrial: true }).subject).toBe('تنتهي تجربتك المجانية في Storely خلال يوم واحد')
    expect(subscriptionEndingEmail({ daysLeft: 2, endsAt: '2026-11-12', isTrial: false }).subject).toContain('يومين')
  })
  it('expired email: positive renewal call, no mention of data', () => {
    const e = subscriptionEndedEmail({ name: null, isTrial: false })
    expect(e.subject).toBe('انتهى اشتراكك في Storely')
    expect(e.text).toContain('يُعاد تفعيل حسابك فوراً')
    for (const m of [e, subscriptionEndingEmail({ daysLeft: 3, endsAt: '2026-11-13', isTrial: false }), subscriptionEndingEmail({ daysLeft: 3, endsAt: '2026-11-13', isTrial: true }), subscriptionEndedEmail({ isTrial: true })])
      expect(m.text + m.html).not.toMatch(/بيانات/)
  })
})

describe('manual renewal reminder', () => {
  it('has its own subject, renew link and no data wording', async () => {
    const { subscriptionReminderEmail } = await import('./emailTemplates')
    const { reminderWhatsappText } = await import('./subscriptionNotice')
    const e = subscriptionReminderEmail({ name: 'عمار', isTrial: false })
    expect(e.subject).toBe('تذكير: جدّد اشتراكك في Storely')
    expect(e.text).toContain('https://www.storely.dev/renew')
    expect(e.text + e.html).not.toMatch(/بيانات/)
    expect(reminderWhatsappText('عمار', true)).toContain('تجربتك المجانية')
    expect(reminderWhatsappText(null, false).startsWith('مرحباً،')).toBe(true)
  })
})
