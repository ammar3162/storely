import { describe, it, expect, vi, afterEach } from 'vitest'
import { classifyTopic } from './assistantTopic'

const reply = (text: string, ok = true) => vi.fn(async () => ({ ok, json: async () => ({ content: [{ text }] }) })) as any
afterEach(() => { vi.unstubAllGlobals() })

describe('assistant topic gate', () => {
  it('maps the model answer to business / greeting / other', async () => {
    vi.stubGlobal('fetch', reply('other')); expect(await classifyTopic('كم عمرك؟')).toBe('other')
    vi.stubGlobal('fetch', reply('greeting')); expect(await classifyTopic('هلا')).toBe('greeting')
    vi.stubGlobal('fetch', reply('business')); expect(await classifyTopic('مين تأخر اليوم؟')).toBe('business')
  })
  it('never blocks the user when the check fails', async () => {
    vi.stubGlobal('fetch', reply('', false)); expect(await classifyTopic('سؤال')).toBe('business')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('net') })); expect(await classifyTopic('سؤال')).toBe('business')
  })
})
