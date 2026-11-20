import { describe, it, expect } from 'vitest'
import { locksPage, OVERLAY_SELECTOR, type OverlayProbe } from './overlayLock'

const phone = { vw: 375, vh: 812, narrow: true }
const desk = { vw: 1440, vh: 900, narrow: false }
const full = (v: { vw: number; vh: number }) => ({ left: 0, right: v.vw, top: 0, bottom: v.vh })
const probe = (o: Partial<OverlayProbe>): OverlayProbe => ({
  mark: null, rendered: true, position: 'fixed', visibility: 'visible', pointerEvents: 'auto', rect: full(phone), ...phone, ...o,
})

describe('Background page stays still while a window or menu is open', () => {
  it('a visible full-screen layer (sheet, dialog, menu catcher) locks the page', () => {
    expect(locksPage(probe({}))).toBe(true)
    // أول إطار من حركة الظهور: أصغر شوي من الشاشة
    expect(locksPage(probe({ rect: { left: 7, right: 368, top: 16, bottom: 796 } }))).toBe(true)
    // وقت الكيبورد: النافذة بارتفاع الجزء الظاهر بس
    expect(locksPage(probe({ rect: { left: 0, right: 375, top: 0, bottom: 470 } }))).toBe(true)
  })
  it('hidden, click-through or partial layers never lock it', () => {
    expect(locksPage(probe({ rendered: false }))).toBe(false)
    expect(locksPage(probe({ visibility: 'hidden' }))).toBe(false)
    expect(locksPage(probe({ pointerEvents: 'none' }))).toBe(false)
    expect(locksPage(probe({ position: 'static' }))).toBe(false)
    // شريط ثابت فوق الصفحة أو قائمة جانبية
    expect(locksPage(probe({ rect: { left: 0, right: 375, top: 0, bottom: 56 } }))).toBe(false)
    expect(locksPage(probe({ ...desk, rect: { left: 1192, right: 1440, top: 0, bottom: 900 } }))).toBe(false)
  })
  it('Soul (data-scroll-lock="narrow") locks on phones only; other marks always', () => {
    const soul = { mark: 'narrow', rect: { left: 12, right: 363, top: 150, bottom: 726 } }
    expect(locksPage(probe(soul))).toBe(true)
    expect(locksPage(probe({ ...soul, ...desk }))).toBe(false)
    expect(locksPage(probe({ mark: '', ...desk, rect: { left: 24, right: 424, top: 300, bottom: 880 } }))).toBe(true)
    expect(locksPage(probe({ ...soul, rendered: false }))).toBe(false)
  })
  it('covers the overlay styles used across the system', () => {
    for (const s of ['.sh-overlay', '.storely-overlay', '.storely-drawer', '.ap-veil.open', '.fixed.inset-0', '[data-scroll-lock]', '[style*="position: fixed"][style*="inset: 0px"]'])
      expect(OVERLAY_SELECTOR.split(',')).toContain(s)
  })
})
