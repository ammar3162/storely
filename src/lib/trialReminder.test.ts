import { describe, it, expect } from 'vitest'
import { trialEndingMessage } from './trialReminder'
import { CUSTOM_MODULES } from './planPricing'

describe('trial ending WhatsApp message', () => {
  it('lists every feature with its current price and the branch discount, no old plans', () => {
    const t = trialEndingMessage('أحمد', 3)
    expect(t.startsWith('مرحباً أحمد\n')).toBe(true)
    expect(t).toContain('خلال 3 أيام')
    expect(t).toContain(`• المخزون والموردين: ${CUSTOM_MODULES.mod_inventory.first} ريال لكل فرع`)
    expect(t).toContain(`• إقفال الكاشير: ${CUSTOM_MODULES.cashier_closing.first} ريال لكل فرع`)
    expect(t).toContain(`• أدوات الذكاء الاصطناعي: ${CUSTOM_MODULES.ai_tools.first} ريال مرة واحدة للمنشأة`)
    expect(t).toContain('من الفرع الثالث يحصل كل فرع على خصم 20%')
    expect(t).not.toMatch(/الشاملة|المتقدمة|الأساسية/)
  })
  it('handles one day and a missing name', () => {
    const t = trialEndingMessage(null, 1)
    expect(t.startsWith('مرحباً\n')).toBe(true)
    expect(t).toContain('خلال يوم واحد')
  })
})
