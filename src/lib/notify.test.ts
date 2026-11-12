import { describe, it, expect, vi } from 'vitest'
vi.mock('next/server', () => ({ after: (fn: () => unknown) => { void fn() } }))
const sent: any[] = []
vi.mock('@/lib/push', () => ({ sendPushToOrg: vi.fn(async (...a: any[]) => { sent.push(a); return { sent: 1 } }) }))
import { notifyInsert } from './notify'

const fakeDb = (error: any = null) => ({ inserted: [] as any[], from() { const self = this; return { insert: async (r: any) => { self.inserted.push(r); return { error } } } } })

describe('notifyInsert — كل إشعار بالجرس يوصل كإشعار جوال', () => {
  it('saves then pushes each org row, riyal sign as ر.س', async () => {
    sent.length = 0
    const db = fakeDb()
    const res = await notifyInsert(db, [{ org_id: 'o1', title: 'عجز 50 ⃁', message: 'خالد' }, { org_id: 'o2', title: 'طلب إجازة', message: 'سارة' }], { url: '/reports' })
    await new Promise(r => setTimeout(r, 0))
    expect(res.error).toBeNull()
    expect(db.inserted).toHaveLength(1)
    expect(sent).toEqual([['o1', 'عجز 50 ر.س', 'خالد', '/reports'], ['o2', 'طلب إجازة', 'سارة', '/reports']])
  })
  it('no push when the insert failed or push:false', async () => {
    sent.length = 0
    await notifyInsert(fakeDb({ message: 'x' }), { org_id: 'o1', title: 't' })
    await notifyInsert(fakeDb(), { org_id: 'o1', title: 't' }, { push: false })
    await new Promise(r => setTimeout(r, 0))
    expect(sent).toHaveLength(0)
  })
})
