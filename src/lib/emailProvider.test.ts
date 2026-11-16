import { describe, it, expect } from 'vitest'
import { sesConfigured } from './email'

describe('email provider switch', () => {
  it('uses SES only when explicitly enabled and fully configured', () => {
    const full = { EMAIL_PROVIDER: 'ses', SES_ACCESS_KEY_ID: 'x', SES_SECRET_ACCESS_KEY: 'y', SES_REGION: 'me-central-1' } as any
    expect(sesConfigured(full)).toBe(true)
    expect(sesConfigured({ ...full, EMAIL_PROVIDER: undefined })).toBe(false)
    expect(sesConfigured({ ...full, SES_SECRET_ACCESS_KEY: '' })).toBe(false)
    expect(sesConfigured({} as any)).toBe(false)
  })
})
