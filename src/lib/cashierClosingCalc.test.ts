import { describe, it, expect } from 'vitest'
import { computeClosing } from './cashierClosingCalc'

describe('cashier closing calc', () => {
  it('matches the closing rules', () => {
    const c = computeClosing({ total_sales: 4820, mada_amount: 2150, visa_amount: 640, mastercard_amount: 210, cash_amount: 1780, purchases: [{ amount: 50, reason: 'ثلج' }, { amount: 0, reason: 'x' }] })!
    expect(c.network_amount).toBe(3000); expect(c.expected_cash).toBe(1820); expect(c.difference).toBe(-40); expect(c.status).toBe('deficit')
    expect(c.purchases).toEqual([{ amount: 50, reason: 'ثلج' }]); expect(c.total_purchases).toBe(50)
  })
  it('balanced and surplus', () => {
    expect(computeClosing({ total_sales: 100, mada_amount: 40, cash_amount: 60 })!.status).toBe('balanced')
    expect(computeClosing({ total_sales: 100, mada_amount: 40, cash_amount: 75 })!.status).toBe('surplus')
  })
  it('rejects bad amounts', () => {
    expect(computeClosing({ total_sales: -5, cash_amount: 1 })).toBeNull()
    expect(computeClosing({ total_sales: 'abc', cash_amount: 1 })).toBeNull()
  })
  it('delivery apps are deducted from expected cash like the network', () => {
    const c = computeClosing({ total_sales: 5000, mada_amount: 2000, cash_amount: 1800, delivery: [{ name: 'هنقرستيشن', amount: 700 }, { name: 'جاهز', amount: 500 }, { name: 'كيتا', amount: 0 }] })!
    expect(c.delivery_amount).toBe(1200); expect(c.expected_cash).toBe(1800); expect(c.status).toBe('balanced')
    expect(c.delivery).toEqual([{ name: 'هنقرستيشن', amount: 700 }, { name: 'جاهز', amount: 500 }])
    expect(computeClosing({ total_sales: 100, cash_amount: 100 })!.delivery_amount).toBe(0)
    expect(computeClosing({ total_sales: 100, cash_amount: 1, delivery: [{ name: 'جاهز', amount: -5 }] })).toBeNull()
  })
})
