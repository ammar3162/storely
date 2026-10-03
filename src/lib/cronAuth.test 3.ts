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

  it('accepts the admin key header', () => {
    expect(isCronRequest(req({ 'x-cron-secret': 'admin-key' }))).toBe(true)
  })

  it('rejects anonymous requests and wrong secrets', () => {
    expect(isCronRequest(req())).toBe(false)
    expect(isCronRequest(req({ authorization: 'Bearer nope' }))).toBe(false)
    expect(isCronRequest(req({ 'x-cron-secret': 'nope' }))).toBe(false)
  })

  it('stays open when CRON_SECRET is not configured (so schedules keep running)', () => {
    delete process.env.CRON_SECRET
    expect(isCronRequest(req())).toBe(true)
  })
})
