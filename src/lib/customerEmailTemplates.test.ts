import { describe, it, expect } from 'vitest'
import { customerEmailTemplates, isEmailButton, EMAIL_BUTTONS } from './customerEmailTemplates'
import { customerMessageEmail } from './emailTemplates'

// الآن: 18 نوفمبر 2026 الساعة 10 صباحاً بتوقيت السعودية
const NOW = Date.parse('2026-11-18T07:00:00Z')
const endOfDay = (d: string) => `${d}T20:59:59Z`        // 23:59 بتوقيت السعودية

describe('customer email templates', () => {
  it('trial ending soon: the reminder is suggested first, with the activate button', () => {
    const t = customerEmailTemplates({ subscription_type: 'trial', subscription_ends_at: endOfDay('2026-11-20'), plan: 'essential' }, NOW)
    expect(t.map(x => x.id)).toEqual(['trial-ending', 'welcome', 'follow-up'])
    expect(t[0].suggested).toBe(true)
    expect(t[0].subject).toBe('تنتهي تجربتك المجانية في Storely خلال يومين')
    expect(t[0].body).toContain('20 نوفمبر 2026')
    expect(t[0].body.startsWith('مرحباً {الاسم}،')).toBe(true)
    expect(t[0].body).toContain('{المنشأة}')
    expect(t[0].button).toBe('activate')
  })

  it('days count by the Saudi calendar day: today and tomorrow', () => {
    const today = customerEmailTemplates({ subscription_type: 'trial', subscription_ends_at: endOfDay('2026-11-18'), plan: 'essential' }, NOW)[0]
    expect(today.subject).toBe('تنتهي تجربتك المجانية في Storely اليوم')
    expect(today.body).toContain('تنتهي اليوم')
    // بعد منتصف الليل بتوقيت السعودية (21:30 UTC = 00:30) ينتهي «اليوم» نفسه
    const lateNight = customerEmailTemplates({ subscription_type: 'paid', subscription_ends_at: endOfDay('2026-11-19'), plan: 'ops' }, Date.parse('2026-11-18T21:30:00Z'))[0]
    expect(lateNight.subject).toBe('ينتهي اشتراكك في Storely اليوم')
    const tomorrow = customerEmailTemplates({ subscription_type: 'paid', subscription_ends_at: endOfDay('2026-11-19'), plan: 'ops' }, NOW)[0]
    expect(tomorrow.subject).toBe('ينتهي اشتراكك في Storely غداً')
  })

  it('paid with time left: renewal (suggested only within 14 days), confirmation and follow-up', () => {
    const soon = customerEmailTemplates({ subscription_type: 'paid', subscription_ends_at: endOfDay('2026-11-28'), plan: 'full' }, NOW)
    expect(soon.map(x => x.id)).toEqual(['renewal', 'confirmed', 'follow-up'])
    expect(soon[0]).toMatchObject({ suggested: true, button: 'renew', subject: 'ينتهي اشتراكك في Storely خلال 10 أيام' })
    expect(soon[0].body).toContain('في باقة «الكاملة»')
    const later = customerEmailTemplates({ subscription_type: 'paid', subscription_ends_at: endOfDay('2027-02-18'), plan: 'full' }, NOW)
    expect(later.some(x => x.suggested)).toBe(false)
    expect(later[0].subject).toBe('ينتهي اشتراكك في Storely خلال 92 يوماً')
  })

  it('plan names: custom plan and enterprise', () => {
    const custom = customerEmailTemplates({ subscription_type: 'paid', subscription_ends_at: endOfDay('2026-12-18'), plan: 'custom' }, NOW)
    expect(custom.find(x => x.id === 'confirmed')!.body).toContain('في باقتك المخصصة')
    const ent = customerEmailTemplates({ subscription_type: 'paid', subscription_ends_at: endOfDay('2026-12-18'), plan: 'advanced', max_branches: 12 }, NOW)
    expect(ent.find(x => x.id === 'renewal')!.body).toContain('في باقة «المؤسسات»')
  })

  it('ended: the ended message comes first and no reminder for a date that passed', () => {
    const paid = customerEmailTemplates({ subscription_type: 'paid', subscription_ends_at: endOfDay('2026-11-10'), plan: 'essential' }, NOW)
    expect(paid.map(x => x.id)).toEqual(['ended', 'follow-up'])
    expect(paid[0]).toMatchObject({ name: 'انتهاء الاشتراك', subject: 'انتهى اشتراكك في Storely', button: 'renew', suggested: true })
    expect(paid[0].body).toContain('انتهى يوم 10 نوفمبر 2026')
    const trial = customerEmailTemplates({ subscription_type: 'trial', subscription_ends_at: endOfDay('2026-11-10'), plan: 'essential' }, NOW)
    expect(trial[0]).toMatchObject({ name: 'انتهاء التجربة', subject: 'انتهت تجربتك المجانية في Storely', button: 'activate' })
  })

  it('no end date: only the messages that need no date', () => {
    expect(customerEmailTemplates({ subscription_type: 'trial', subscription_ends_at: null, plan: 'essential' }, NOW).map(x => x.id)).toEqual(['welcome', 'follow-up'])
    expect(customerEmailTemplates({ subscription_type: 'paid', subscription_ends_at: null, plan: 'essential' }, NOW).map(x => x.id)).toEqual(['follow-up'])
  })

  it('messages are formal: no exclamation marks or emoji', () => {
    const all = [
      ...customerEmailTemplates({ subscription_type: 'trial', subscription_ends_at: endOfDay('2026-11-20'), plan: 'essential' }, NOW),
      ...customerEmailTemplates({ subscription_type: 'paid', subscription_ends_at: endOfDay('2026-11-28'), plan: 'full' }, NOW),
      ...customerEmailTemplates({ subscription_type: 'paid', subscription_ends_at: endOfDay('2026-11-10'), plan: 'full' }, NOW),
    ]
    for (const t of all) expect(`${t.subject}\n${t.body}`).not.toMatch(/[!\u{1F300}-\u{1FAFF}☀-➿]/u)
  })
})

describe('email buttons', () => {
  it('only the allowed buttons are accepted', () => {
    expect(isEmailButton('renew')).toBe(true)
    expect(isEmailButton('login')).toBe(true)
    expect(isEmailButton('https://evil.example')).toBe(false)
    expect(isEmailButton('toString')).toBe(false)
    expect(isEmailButton(undefined)).toBe(false)
  })

  it('the email shows the button with the Storely link, and none when not chosen', () => {
    const withBtn = customerMessageEmail({ subject: 'ينتهي اشتراكك', paragraphs: ['مرحباً'], button: EMAIL_BUTTONS.renew })
    expect(withBtn).toContain('https://www.storely.dev/renew')
    expect(withBtn).toContain('تجديد الاشتراك')
    const plain = customerMessageEmail({ subject: 'متابعة', paragraphs: ['مرحباً'] })
    expect(plain).not.toContain('/renew')
    expect(plain).toContain('يمكنك الرد على هذا البريد مباشرة')
  })
})
