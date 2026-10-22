import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => { process.env.MARKETING_SECRET = 'test-secret' })

describe('marketing emails', async () => {
  const m = await import('./marketing')

  it('signs unsubscribe links per email and rejects tampering', () => {
    const t = m.unsubToken('Owner@Shop.com')
    expect(m.verifyUnsubToken('owner@shop.com', t)).toBe(true)
    expect(m.verifyUnsubToken('other@shop.com', t)).toBe(false)
    expect(m.verifyUnsubToken('owner@shop.com', t.slice(0, -1) + 'x')).toBe(false)
    expect(m.verifyUnsubToken('owner@shop.com', '')).toBe(false)
    expect(m.unsubUrl('https://www.storely.dev', 'a+b@x.com')).toContain('e=a%2Bb%40x.com')
  })

  it('puts owners in the right segment', () => {
    const now = new Date('2026-10-22T00:00:00Z')
    const future = '2026-12-01T00:00:00Z', past = '2026-09-01T00:00:00Z'
    expect(m.inSegment({ subscription_type: 'paid', subscription_ends_at: future }, 'paid', now)).toBe(true)
    expect(m.inSegment({ subscription_type: 'paid', subscription_ends_at: past }, 'paid', now)).toBe(false)
    expect(m.inSegment({ subscription_type: 'trial', subscription_ends_at: future }, 'trial', now)).toBe(true)
    expect(m.inSegment({ subscription_type: 'trial', subscription_ends_at: past }, 'expired', now)).toBe(true)
    expect(m.inSegment({ subscription_type: 'paid', subscription_ends_at: future }, 'expired', now)).toBe(false)
    expect(m.inSegment({ status: 'suspended', subscription_type: 'paid', subscription_ends_at: future }, 'all', now)).toBe(false)
  })

  it('validates content and only allows https buttons', () => {
    const ok = { subject: 'س', title: 'ع', body: 'ن' }
    expect(m.validateContent(ok)).toBeNull()
    expect(m.validateContent({ ...ok, subject: '' })).not.toBeNull()
    expect(m.validateContent({ ...ok, button_label: 'افتح', button_url: 'http://x.com' })).not.toBeNull()
    expect(m.validateContent({ ...ok, button_label: 'افتح', button_url: 'javascript:alert(1)' })).not.toBeNull()
    expect(m.validateContent({ ...ok, button_label: 'افتح' })).not.toBeNull()
    expect(m.validateContent({ ...ok, button_label: 'افتح', button_url: 'https://www.storely.dev/x' })).toBeNull()
  })

  it('personalizes, escapes HTML and always includes the unsubscribe link', () => {
    const html = m.campaignHtml({ subject: 's', title: 'هلا {الاسم}', body: 'منشأة {المنشأة}\n<script>x</script>' }, { name: 'سارة', orgName: '' }, 'https://www.storely.dev/unsubscribe?e=a&t=b')
    expect(html).toContain('هلا سارة')
    expect(html).toContain('منشأة منشأتك')
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('إلغاء الاشتراك بالإعلانات')
    expect(html).toContain('unsubscribe?e=a&amp;t=b')
  })
})
