import { describe, it, expect } from 'vitest'
import { signupErrorAr } from './authErrors'

describe('signup errors in Arabic', () => {
  it('maps Supabase messages', () => {
    expect(signupErrorAr('email rate limit exceeded')).toContain('حد التسجيل')
    expect(signupErrorAr('User already registered')).toContain('مسجّل مسبقاً')
    expect(signupErrorAr('Password should be at least 8 characters')).toContain('ضعيفة')
    expect(signupErrorAr('something new')).toBe('تعذّر إنشاء الحساب — حاول مرة ثانية')
  })
})
