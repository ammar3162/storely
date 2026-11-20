import { describe, it, expect } from 'vitest'
import { pickBubble, remember, parseBubbleLog, urgentKey, type BubbleLog } from './assistantBubble'
import type { Suggestion } from './assistantSuggestions'

const attendance: Suggestion = { id: 'attendance', icon: 'attendance', label: 'من داوم اليوم؟', count: 4, prompt: '' }
const stock: Suggestion = { id: 'stock', icon: 'stock', label: 'أصناف قاربت تنفد', count: 3, prompt: '' }
const subscription: Suggestion = { id: 'subscription', icon: 'subscription', urgent: true, label: 'اشتراكك ينتهي خلال 3 أيام', prompt: '' }
const EMPTY: BubbleLog = { keys: [] }

// زيارة: تطلع الفقاعة (لو فيه شي جديد) وتنسجل
function visit(log: BubbleLog, decisions: string[], sugs: Suggestion[], day: string) {
  const b = pickBubble(decisions, sugs, log, day)
  const keys = !b ? [] : b.type === 'decisions' ? b.keys : [urgentKey(b.id, day)]
  return { b, log: remember(log, keys) }
}

describe('Soul bubble: only for something new', () => {
  it('the same pending decision pops once, not on every visit (the owner’s complaint)', () => {
    let v = visit(EMPTY, ['deficit:c1'], [attendance, stock], '2026-11-19')
    expect(v.b).toEqual({ type: 'decisions', keys: ['deficit:c1'] })
    v = visit(v.log, ['deficit:c1'], [attendance, stock], '2026-11-19')
    expect(v.b).toBeNull()
    v = visit(v.log, ['deficit:c1'], [attendance, stock], '2026-11-20')   // اليوم الثاني بعد
    expect(v.b).toBeNull()
  })
  it('information never pops; it waits inside Soul', () => {
    expect(pickBubble([], [attendance, stock], EMPTY, '2026-11-19')).toBeNull()
  })
  it('several new decisions arrive together: one grouped bubble with just the new ones', () => {
    const log = remember(EMPTY, ['deficit:c1'])
    expect(pickBubble(['deficit:c1', 'leave:l1', 'advance:a1'], [], log, '2026-11-19')).toEqual({ type: 'decisions', keys: ['leave:l1', 'advance:a1'] })
  })
  it('urgent reminders (subscription ending) pop once a day, after any new decision', () => {
    let v = visit(EMPTY, [], [subscription, attendance], '2026-11-19')
    expect(v.b).toEqual({ type: 'urgent', id: 'subscription' })
    v = visit(v.log, [], [subscription, attendance], '2026-11-19')
    expect(v.b).toBeNull()
    v = visit(v.log, ['excuse:e1'], [subscription], '2026-11-20')
    expect(v.b).toEqual({ type: 'decisions', keys: ['excuse:e1'] })
    expect(visit(v.log, ['excuse:e1'], [subscription], '2026-11-20').b).toEqual({ type: 'urgent', id: 'subscription' })
  })
  it('opening Soul counts as seeing everything; asked reminders are skipped', () => {
    const log = remember(EMPTY, ['deficit:c1', urgentKey('subscription', '2026-11-19')])
    expect(pickBubble(['deficit:c1'], [subscription], log, '2026-11-19')).toBeNull()
    expect(pickBubble([], [subscription], EMPTY, '2026-11-19', ['subscription'])).toBeNull()
  })
  it('keeps the last 300 keys and survives a broken stored value', () => {
    let log = EMPTY
    for (let i = 0; i < 320; i++) log = remember(log, [`deficit:c${i}`])
    expect(log.keys.length).toBe(300)
    expect(log.keys[299]).toBe('deficit:c319')
    expect(parseBubbleLog('not json')).toEqual(EMPTY)
    expect(parseBubbleLog(JSON.stringify({ keys: ['a', 3] }))).toEqual({ keys: ['a'] })
  })
})
