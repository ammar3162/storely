// كيبورد الجوال من visualViewport — حساب بدون DOM عشان نختبره (components/KeyboardInset يطبّقه على الصفحة)

export type ViewportProbe = {
  /** ارتفاع الصفحة (window.innerHeight) — الآيفون ما يصغّره لما يطلع الكيبورد */
  innerHeight: number
  /** ارتفاع الجزء الظاهر (visualViewport.height) — يقصر بقدر الكيبورد */
  vvHeight: number
  /** بداية الجزء الظاهر من أعلى الصفحة (visualViewport.offsetTop) */
  vvOffsetTop: number
}

export type KeyboardState = {
  open: boolean
  /** كم يغطي الكيبورد من أسفل الصفحة — للنوافذ اللي تنحسب من تحت (--kb) */
  kb: number
  /** بداية الجزء الظاهر وارتفاعه — النوافذ تنحط عليه بالضبط وقت الكيبورد (--vvt و --vvh) */
  top: number
  height: number
}

/** أقل من كذا = شريط المتصفح يطلع وينزل، مو كيبورد */
export const KEYBOARD_MIN = 80

export function keyboardState(p: ViewportProbe): KeyboardState {
  // نحكم من قِصَر الجزء الظاهر نفسه. الآيفون أحياناً ينزّل الجزء الظاهر لآخر الصفحة عشان تبان الخانة
  // (خانة Soul تحت)، وكنا نطرح هالنزول من الحساب فيطلع الكيبورد «مسكّر»: النافذة يطلع رأسها برا الشاشة
  // ويبان شريط التنقل فوق الكيبورد (صورة المالك 2026-11-20)
  const open = p.innerHeight - p.vvHeight > KEYBOARD_MIN
  const kb = Math.max(0, Math.round(p.innerHeight - p.vvHeight - p.vvOffsetTop))
  return { open, kb: open ? kb : 0, top: Math.round(p.vvOffsetTop), height: Math.round(p.vvHeight) }
}
