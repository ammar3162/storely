import { describe, it, expect } from 'vitest'
import { timeoutFor, withTimeout, fetchExternal, EXTERNAL_TIMEOUT_MS } from './fetchExternal'

describe('external call timeouts', () => {
  it('AI gets longer than messaging', () => {
    expect(timeoutFor('https://api.anthropic.com/v1/messages')).toBe(EXTERNAL_TIMEOUT_MS.ai)
    expect(timeoutFor('https://www.wasenderapi.com/api/send-message')).toBe(EXTERNAL_TIMEOUT_MS.messaging)
    expect(timeoutFor('https://graph.facebook.com/v21.0/x/messages')).toBe(EXTERNAL_TIMEOUT_MS.messaging)
  })
  it('withTimeout passes the result through when in time', async () => {
    expect(await withTimeout(Promise.resolve(7), 50, 'x')).toBe(7)
  })
  it('withTimeout rejects a hanging call', async () => {
    await expect(withTimeout(new Promise(() => {}), 20, 'Resend')).rejects.toThrow(/Resend/)
  })
  it('fetchExternal aborts a hanging request', async () => {
    const orig = globalThis.fetch
    globalThis.fetch = ((_u: string, init: RequestInit) => new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(init.signal?.reason)))) as typeof fetch
    try { await expect(fetchExternal('https://www.wasenderapi.com/x', {}, 20)).rejects.toBeTruthy() } finally { globalThis.fetch = orig }
  })
})
