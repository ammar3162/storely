import { describe, expect, it } from 'vitest'
import { keyboardState } from './keyboardInset'

// آيفون المالك (2026-11-20): تطبيق الشاشة الرئيسية، الصفحة 793 والجزء الظاهر فوق الكيبورد 411
const PAGE = 793, VISIBLE = 411

describe('keyboardState', () => {
  it('بدون كيبورد', () => {
    expect(keyboardState({ innerHeight: PAGE, vvHeight: PAGE, vvOffsetTop: 0 })).toEqual({ open: false, kb: 0, top: 0, height: PAGE })
  })

  it('شريط المتصفح يطلع وينزل: مو كيبورد', () => {
    expect(keyboardState({ innerHeight: PAGE, vvHeight: PAGE - 60, vvOffsetTop: 0 }).open).toBe(false)
  })

  it('كيبورد والجزء الظاهر بأعلى الصفحة', () => {
    expect(keyboardState({ innerHeight: PAGE, vvHeight: VISIBLE, vvOffsetTop: 0 })).toEqual({ open: true, kb: PAGE - VISIBLE, top: 0, height: VISIBLE })
  })

  it('كيبورد والجزء الظاهر نازل لنص الصفحة', () => {
    expect(keyboardState({ innerHeight: PAGE, vvHeight: VISIBLE, vvOffsetTop: 200 })).toEqual({ open: true, kb: PAGE - VISIBLE - 200, top: 200, height: VISIBLE })
  })

  it('كيبورد والجزء الظاهر نازل لآخر الصفحة (خانة Soul تحت): مفتوح', () => {
    // كان يطلع مسكّر: الحساب القديم = 793 − 411 − 382 = 0
    expect(keyboardState({ innerHeight: PAGE, vvHeight: VISIBLE, vvOffsetTop: PAGE - VISIBLE })).toEqual({ open: true, kb: 0, top: PAGE - VISIBLE, height: VISIBLE })
  })
})
