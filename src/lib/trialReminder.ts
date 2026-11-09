// رسالة واتساب قبل نهاية التجربة (2026-11-08): الأسعار الحالية لكل ميزة من lib/planPricing — بدون باقات ثابتة
import { CUSTOM_MODULES, CUSTOM_MODULE_ORDER, BRANCH_DISCOUNT, BRANCH_DISCOUNT_FROM } from '@/lib/planPricing'
import { FEATURE_NAMES } from '@/lib/featurePresets'

const ORDINAL: Record<number, string> = { 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 5: 'الخامس' }

export function trialEndingMessage(name: string | null | undefined, daysLeft: number): string {
  const days = daysLeft === 1 ? 'يوم واحد' : daysLeft === 2 ? 'يومين' : `${daysLeft} أيام`
  const lines = CUSTOM_MODULE_ORDER.map(slug => {
    const m = CUSTOM_MODULES[slug]
    return `• ${FEATURE_NAMES[slug].ar}: ${m.first} ريال${m.perBranch ? ' لكل فرع' : ' مرة واحدة للمنشأة'}`
  })
  const pct = Math.round(BRANCH_DISCOUNT * 100)
  return [
    `مرحباً ${name || ''}`.trim(),
    '',
    `تنتهي تجربتك المجانية في Storely خلال ${days}، وقد جرّبت خلالها جميع المزايا.`,
    '',
    'تدفع شهرياً مقابل المزايا التي تختارها فقط:',
    ...lines,
    '',
    `من الفرع ${ORDINAL[BRANCH_DISCOUNT_FROM] || BRANCH_DISCOUNT_FROM} يحصل كل فرع على خصم ${pct}%، والاشتراك السنوي يوفّر 20%.`,
    '',
    'أرسل لنا المزايا التي تريدها وسنفعّلها لك، أو عدّلها بنفسك من صفحة الإضافات:',
    'storely.dev',
  ].join('\n')
}
