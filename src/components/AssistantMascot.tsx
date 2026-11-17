// شخصية المساعد «Soul» (اختارها المالك وسمّاها 2026-11-17): غيمة رمادية بعيون وشنب وياقة وكرفتة، تمسك قائمة مهام وترفع إصبعها — بدل أيقونة الروبوت.
// صورة ثلاثية الأبعاد بخلفية شفافة (public/assistant)، وتنعرض بثلاث هيئات:
//   body: الشخصية كاملة (زر المساعد العائم)
//   face: الوجه والياقة داخل دائرة (رأس الشات والإشعار)، عشان تنقرأ بالمقاسات الصغيرة
//   hero: الشخصية مع علامات الانتباه جنب إصبعها (أول المحادثة)؛ العلامات مرسومة بالكود فتاخذ لون النص بالوضعين الفاتح والداكن
// الحركة (طلب المالك 2026-11-18): تتنفس بهدوء وترمش، وتنط ثلاث مرات لما يكون فيه شي عاجل.
// الرمشة طبقة صغيرة فوق العيون (body-blink / face-blink بنفس القص بالضبط)، وكل الحركة تتوقف لمن مفعّل «تقليل الحركة».

const BODY_W = 290, BODY_H = 270           // مقاس body.webp
const HERO_W = BODY_W + 18                 // مساحة إضافية يمين الصورة للعلامات
// علامات «!» بإحداثيات body.webp (مأخوذة من رسمة المالك نفسها)
const MARKS = [
  { x1: 269.2, y1: 70.5, x2: 273.1, y2: 55.2, w: 8.3 },
  { x1: 281.9, y1: 76.8, x2: 293.5, y2: 65.4, w: 8.3 },
  { x1: 288.8, y1: 88.2, x2: 302.3, y2: 84.6, w: 7.9 },
]

/** ستايل الحركة — يندمج مرة وحدة في صفحة المساعد */
export const MASCOT_CSS = `
.ai-m{position:relative;display:block;flex-shrink:0}
.ai-m-in{position:relative;display:block;width:100%;height:100%}
.ai-m-in img{display:block;width:100%;height:100%}
.ai-m-blink{position:absolute;inset:0;opacity:0;pointer-events:none}
@keyframes aiMBreathe{0%,100%{transform:none}50%{transform:translateY(-2.5%) scale(1.02,1.03)}}
@keyframes aiMBlink{0%{opacity:0}46%{opacity:1}47.8%{opacity:0}90%{opacity:1}91.8%{opacity:0}93.8%{opacity:1}95.6%{opacity:0}100%{opacity:0}}
@keyframes aiMHop{0%,40%,100%{transform:none}10%{transform:translateY(-16%) rotate(-5deg)}20%{transform:translateY(0) scale(1.07,.9)}28%{transform:translateY(-5%) rotate(2deg)}34%{transform:translateY(0) scale(1.02,.98)}}
@keyframes aiMPop{0%{opacity:0;transform:translateY(12px) scale(.7)}60%{opacity:1;transform:translateY(-3px) scale(1.04)}100%{opacity:1;transform:none}}
@keyframes aiMark{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}
.ai-m-breathe{transform-origin:50% 100%;animation:aiMBreathe 3.8s ease-in-out infinite}
.ai-m-blink.on{animation:aiMBlink 9s steps(1,end) 1.2s infinite}
.ai-m-hop{transform-origin:50% 100%;animation:aiMHop 2.2s ease-in-out .6s 3}
.ai-m-pop{transform-origin:50% 100%;animation:aiMPop .5s cubic-bezier(.22,1,.36,1) both}
.ai-mark{transform-box:fill-box;transform-origin:0% 50%;animation:aiMark .4s cubic-bezier(.34,1.56,.64,1) both}
@media (prefers-reduced-motion:reduce){.ai-m-breathe,.ai-m-blink.on,.ai-m-hop,.ai-m-pop,.ai-mark{animation:none!important}}
`

type Props = {
  variant?: 'body' | 'face' | 'hero'
  /** الطول بالبكسل (وللوجه: قطر الدائرة) */
  size?: number
  /** none: ثابتة · idle: تتنفس وترمش · alert: نفس idle وتنط ثلاث مرات (فيه شي عاجل) */
  motion?: 'none' | 'idle' | 'alert'
}

/* eslint-disable @next/next/no-img-element */
export default function AssistantMascot({ variant = 'body', size = 40, motion = 'none' }: Props) {
  const live = motion !== 'none'

  if (variant === 'face') return (
    <span aria-hidden className="ai-m" style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: '#C9CAD3' }}>
      <span className="ai-m-in">
        <img src="/assistant/face.webp" width={size} height={size} alt="" draggable={false} />
        {live && <img src="/assistant/face-blink.webp" className="ai-m-blink on" width={size} height={size} alt="" draggable={false} />}
      </span>
    </span>
  )

  const w = Math.round(size * BODY_W / BODY_H)
  const layers = (
    <>
      <img src="/assistant/body.webp" width={w} height={size} alt="" draggable={false} />
      {(live || variant === 'hero') && <img src="/assistant/body-blink.webp" className="ai-m-blink on" width={w} height={size} alt="" draggable={false} />}
    </>
  )

  if (variant === 'body') return (
    <span aria-hidden className={`ai-m${motion === 'alert' ? ' ai-m-hop' : ''}`} style={{ width: w, height: size }}>
      <span className={`ai-m-in${live ? ' ai-m-breathe' : ''}`}>{layers}</span>
    </span>
  )

  // hero: تطلع بقفزة صغيرة، ثم تتنفس وترمش، والعلامات تطلع جنب إصبعها
  return (
    <span aria-hidden className="ai-m ai-m-pop" style={{ width: Math.round(size * HERO_W / BODY_H), height: size }}>
      <span className="ai-m-in ai-m-breathe">
        <span style={{ position: 'absolute', left: 0, top: 0, width: w, height: size }}>{layers}</span>
        <svg viewBox={`0 0 ${HERO_W} ${BODY_H}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }} fill="none" stroke="currentColor" strokeLinecap="round">
          {MARKS.map((m, i) => <line key={i} className="ai-mark" style={{ animationDelay: `${0.45 + i * 0.07}s` }} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} strokeWidth={m.w} />)}
        </svg>
      </span>
    </span>
  )
}
