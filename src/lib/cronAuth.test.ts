import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isCronRequest } from './cronAuth'

const req = (headers: Record<string, string> = {}) => new Request('https://x/api/job', { headers })

describe('isCronRequest', () => {
  const saved = { ...process.env }
  beforeEach(() => { process.env.CRON_SECRET = 'cron-secret'; process.env.ADMIN_PASSWORD = 'admin-key' })
  afterEach(() => { process.env = { ...saved } })

  it('accepts the Vercel cron bearer token', () => {
    expect(isCronRequest(req({ authorization: 'Bearer cron-secret' }))).toBe(true)
  })

  it('accepts the cron key in the manual header', () => {
    expect(isCronRequest(req({ 'x-cron-secret': 'cron-secret' }))).toBe(true)
  })

  it('no longer accepts the admin panel password', () => {
    expect(isCronRequest(req({ 'x-cron-secret': 'admin-key' }))).toBe(false)
  })

  it('rejects anonymous requests and wrong secrets', () => {
    expect(isCronRequest(req())).toBe(false)
    expect(isCronRequest(req({ authorization: 'Bearer nope' }))).toBe(false)
    expect(isCronRequest(req({ 'x-cron-secret': 'nope' }))).toBe(false)
  })

  it('fails closed when CRON_SECRET is not configured', () => {
    delete process.env.CRON_SECRET
    expect(isCronRequest(req())).toBe(false)
    expect(isCronRequest(req({ authorization: 'Bearer undefined' }))).toBe(false)
  })
})
