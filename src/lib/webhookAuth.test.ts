import { describe, it, expect } from 'vitest'
import { validWasenderWebhook } from './webhookAuth'

describe('WhatsApp webhook only accepts Wasender', () => {
  it('rejects every request when the secret is not configured (no more «accept all»)', () => {
    expect(validWasenderWebhook('anything', undefined)).toBe(false)
    expect(validWasenderWebhook('', '')).toBe(false)
  })
  it('accepts only the exact secret', () => {
    expect(validWasenderWebhook('s3cret-value', 's3cret-value')).toBe(true)
    expect(validWasenderWebhook('s3cret-valuX', 's3cret-value')).toBe(false)
    expect(validWasenderWebhook(null, 's3cret-value')).toBe(false)
  })
})
