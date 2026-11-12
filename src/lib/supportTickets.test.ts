import { describe, it, expect } from 'vitest'
import { cleanConversation, ticketSubject, cleanPage } from './supportTickets'

describe('support tickets — input cleaning', () => {
  it('keeps only user/ai messages, trims, caps at 30', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? 'ai' : 'user', text: ` س${i} ` }))
    const c = cleanConversation([...many, { role: 'system', text: 'x' }, { role: 'user', text: '' }, null])
    expect(c).toHaveLength(30)
    expect(c[0]).toEqual({ role: 'user', text: 'س10' })
    expect(cleanConversation('nope')).toEqual([])
  })
  it('subject falls back to the last user question', () => {
    const conv = [{ role: 'user' as const, text: 'كيف أسوي جرد؟' }, { role: 'ai' as const, text: '...' }]
    expect(ticketSubject('', conv)).toBe('كيف أسوي جرد؟')
    expect(ticketSubject('  مشكلة في الإقفال ', conv)).toBe('مشكلة في الإقفال')
  })
  it('page must be an internal path', () => {
    expect(cleanPage('/inventory')).toBe('/inventory')
    expect(cleanPage('https://evil.test')).toBeNull()
    expect(cleanPage(5)).toBeNull()
  })
})
