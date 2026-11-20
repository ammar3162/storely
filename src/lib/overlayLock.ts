// متى نثبّت الصفحة اللي ورا النوافذ؟ (طلب المالك 2026-11-19: «إذا فتحنا سول أو أي قائمة، الصفحة الخلفية المفروض تكون ثابتة»)
// القاعدة: فيه طبقة ظاهرة تغطي الشاشة وتستقبل اللمس (نافذة، قائمة سفلية، غطاء قائمة منسدلة)،
// أو عنصر معلَّم بـ data-scroll-lock — قيمته "narrow" = بالجوال فقط (Soul: بالكمبيوتر نافذة صغيرة بالزاوية والصفحة تبقى تتحرك).
// الطبقات المكتوبة مباشرة بـ position:fixed + inset:0 هي نفس العلامة اللي يعتمد عليها KeyboardInset في globals.css.

export const OVERLAY_SELECTOR = [
  '[data-scroll-lock]',
  '.sh-overlay', '.br-overlay', '.storely-overlay', '.storely-drawer', '.adm-mob-menu', '.ap-veil.open', '.lp-mob-menu', '.fixed.inset-0',
  '[style*="position: fixed"][style*="inset: 0px"]', '[style*="position:fixed"][style*="inset:0"]',
].join(',')

/** عرض الجوال: نفس حد الزر العائم ونافذة Soul (أقل من 768) */
export const NARROW_QUERY = '(max-width: 767px)'

export type OverlayProbe = {
  /** قيمة data-scroll-lock: null = غير معلَّم */
  mark: string | null
  /** له مساحة على الشاشة (مو display:none) */
  rendered: boolean
  position: string
  visibility: string
  pointerEvents: string
  rect: { left: number; right: number; top: number; bottom: number }
  vw: number
  vh: number
  narrow: boolean
}

export function locksPage(p: OverlayProbe): boolean {
  if (!p.rendered || p.visibility === 'hidden' || p.pointerEvents === 'none') return false
  if (p.mark !== null) return p.mark !== 'narrow' || p.narrow
  if (p.position !== 'fixed') return false
  // يغطي عرض الشاشة ونص ارتفاعها على الأقل. السماحية 10% عشان حركة الظهور (تكبير بسيط)،
  // ونص الارتفاع لأن النوافذ تقصر لارتفاع الجزء الظاهر وقت الكيبورد
  const w = p.rect.right - p.rect.left, h = p.rect.bottom - p.rect.top
  return w >= p.vw * 0.9 && p.rect.left <= p.vw * 0.1 && h >= p.vh * 0.5
}
