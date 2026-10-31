import { describe, it, expect } from 'vitest'
import { buildDecisions } from './todayDecisions'

// أشكال ردود الـ APIs الحقيقية (من حساب تجريبي)
const base = {
  forecast: [{ name: 'دجاج', unit: 'كيس', currentQty: 4, dailyRate: 3, daysLeft: 1, status: 'critical' }, { name: 'باستا', unit: 'كرتون', currentQty: 4, dailyRate: 0.5, daysLeft: 6 }],
  timing: [{ id: 'p', name: 'باستا', unit: 'كرتون', currentQty: 4, avgLeadTimeDays: 3, suggestedOrderInDays: -5, urgency: 'now' }],
  buy: [{ name: 'دجاج', unit: 'كيس', currentQty: 4, weeklyNeed: 22, suggestedQty: 54, urgency: 'urgent' }],
  season: { byDay: [{ day: 'السبت', total: 528 }, { day: 'الخميس', total: 408 }, { day: 'الجمعة', total: 383 }, { day: 'الأحد', total: 300 }], peakHour: { hour: 11 } },
  waste: { report: [{ name: 'دجاج', totalQty: 5, estimatedCost: 300, topReason: 'منتهي الصلاحية' }, { name: 'خبز', totalQty: 3, estimatedCost: 120 }], totalEstimatedCost: 420, totalWasteEntries: 7 },
  dead: [{ name: 'فلاتر كافاك 02', unit: 'وحدة', dispensed: 0, wasteQty: 10, estimatedValue: 450 }],
  curr: 'ريال',
}

describe('buildDecisions', () => {
  it('orders first, then money lost, peak day, slow stock', () => {
    const d = buildDecisions({ ...base, todayDow: 5 })   // الجمعة → بكرة السبت الذروة
    expect(d.map(x => x.level)).toEqual(['urgent', 'urgent', 'warn', 'warn', 'info'])
    expect(d[0].title).toBe('باستا: طلبه متأخر 5 أيام')
    expect(d[1]).toMatchObject({ title: 'اطلب دجاج اليوم', detail: 'يخلص بكرة · باقي 4 كيس · تحتاج 54 كيس', action: { href: '/purchase-suggestion' } })
    expect(d[2]).toMatchObject({ title: 'خسرت 420 ريال هدر آخر 30 يوم', detail: 'أغلبه دجاج (منتهي الصلاحية) — قلّل كمية طلبه أو راجع التخزين' })
    expect(d[3]).toMatchObject({ title: 'بكرة (السبت) أكثر يوم زحمة عندك', detail: 'جهّز مخزونك من اليوم قبل 11 الصباح' })
    expect(d[4].title).toBe('فلاتر كافاك 02 ما انصرف منه شي من شهر')
  })
  it('peak today, and no peak note on ordinary days', () => {
    expect(buildDecisions({ ...base, todayDow: 6 }).some(x => x.title === 'اليوم أكثر يوم زحمة عندك')).toBe(true)
    expect(buildDecisions({ ...base, todayDow: 2 }).some(x => x.title.includes('زحمة'))).toBe(false)
  })
  it('caps at 5 and handles a fresh account', () => {
    expect(buildDecisions({ ...base, todayDow: 5 }, 3)).toHaveLength(3)
    expect(buildDecisions({ todayDow: 0 })).toEqual([])
  })
  it('waste without known cost shows the count', () => {
    const d = buildDecisions({ waste: { report: [{ name: 'خبز', totalQty: 3, estimatedCost: null }], totalEstimatedCost: 0, totalWasteEntries: 3 }, todayDow: 0 })
    expect(d[0].title).toBe('3 عمليات هدر آخر 30 يوم')
  })
})
