import { describe, it, expect } from 'vitest'
import { daysAr, runOutText, orderWhenText, usageReason, leadReason, riyal, changePctVisible } from './aiPhrases'

describe('aiPhrases', () => {
  it('days in Arabic', () => {
    expect(daysAr(1)).toBe('يوم'); expect(daysAr(2)).toBe('يومين'); expect(daysAr(5)).toBe('5 أيام'); expect(daysAr(-5)).toBe('5 أيام'); expect(daysAr(14)).toBe('14 يوم')
  })
  it('run-out text', () => {
    expect(runOutText(0)).toBe('يخلص اليوم'); expect(runOutText(1)).toBe('يخلص بكرة'); expect(runOutText(6)).toBe('يخلص بعد 6 أيام'); expect(runOutText(null)).toBe('ما يخلص قريب')
  })
  it('order-when text (negative = late)', () => {
    expect(orderWhenText(-5)).toBe('متأخر 5 أيام — اطلب اليوم'); expect(orderWhenText(-4.8)).toBe('متأخر 5 أيام — اطلب اليوم')
    expect(orderWhenText(0)).toBe('اطلب اليوم'); expect(orderWhenText(1)).toBe('اطلب بكرة'); expect(orderWhenText(3)).toBe('اطلب بعد 3 أيام')
  })
  it('reasons', () => {
    expect(usageReason(3.33, 'كيس', 4)).toBe('لأنك تصرف تقريباً 3.3 كيس يومياً، وباقي 4 كيس')
    expect(leadReason(0.5, 'كرتون', 3)).toBe('المورد يحتاج 3 أيام عادةً، وأنت تصرف 0.5 كرتون يومياً')
  })
  it('riyal', () => {
    expect(riyal(1234.6)).toBe('1,235 ريال'); expect(riyal(0)).toBeNull(); expect(riyal(null)).toBeNull()
  })
  it('hides misleading month-over-month %', () => {
    expect(changePctVisible(62495, 3936)).toBe(false)   // ▲1281%
    expect(changePctVisible(107750, 106900)).toBe(true)
    expect(changePctVisible(100, 0)).toBe(false)
  })
})
