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
  it('a short reply to the assistant\'s question is checked together with that question', async () => {
    const f = reply('business'); vi.stubGlobal('fetch', f)
    expect(await classifyTopic('1', 'السؤال فيه احتمالين: 1) أكثر موظف صرف 2) أكثر صنف')).toBe('business')
    const sent = JSON.parse(f.mock.calls[0][1].body).messages[0].content
    expect(sent).toContain('رد المساعد السابق')
    expect(sent).toContain('رسالة المستخدم: 1')
  })
  it('never blocks the user when the check fails', async () => {
    vi.stubGlobal('fetch', reply('', false)); expect(await classifyTopic('سؤال')).toBe('business')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('net') })); expect(await classifyTopic('سؤال')).toBe('business')
  })
})
