import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { SESSION_ENDED } from './staffAuth'

// حارس الجلسة بالواجهة يتعرّف على انتهاء الجلسة من النص — لازم يطابق نص السيرفر
describe('staff session message', () => {
  it('guard and server use the same text', () => {
    const guard = readFileSync('src/components/StaffSessionGuard.tsx', 'utf8')
    expect(guard).toContain(`const SESSION_ENDED = '${SESSION_ENDED}'`)
  })
})
