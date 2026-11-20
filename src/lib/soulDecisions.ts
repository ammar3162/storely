// أنواع قرارات Soul ودوال خفيفة يستخدمها العميل والخادم (بدون أي استيراد للخادم)
export type DecisionKind = 'deficit' | 'excuse' | 'leave' | 'advance' | 'extra_day' | 'payable' | 'stock'
/** ترتيب البطاقات: اللي يمس الموظفين أول، ثم الفواتير والتوريد */
export const DECISION_ORDER: DecisionKind[] = ['deficit', 'excuse', 'leave', 'advance', 'extra_day', 'payable', 'stock']

export type Decision = {
  key: string                 // `${kind}:${refId}` — للفقاعة ورابط الإشعار
  kind: DecisionKind
  refId: string
  title: string
  meta?: string
  lines?: { label: string; value: string }[]
  at: string                  // وقت وصول الطلب
  old?: boolean               // عجز أقدم من أسبوع (يتجمّع تحت «عجوزات أقدم»)
  staff?: string
  amountText?: string         // المبلغ مع رمز العملة (لرسالة التأكيد)
  workDate?: string           // اليوم الإضافي
  suggested?: number          // اليوم الإضافي: أجر يوم مقترح (الراتب ÷ 30)
  ids?: string[]              // فاتورة المورد: كل سطورها (تنعلّم مدفوعة كلها)
}


/** العدد مع المعدود: 1 «قرار واحد»، 2 «قراران»، 3–10 «3 قرارات»، 11+ «11 قراراً» */
export function countAr(n: number, [one, two, few, many]: [string, string, string, string]) {
  if (n === 1) return one
  if (n === 2) return two
  const tail = n % 100
  return `${n} ${tail >= 3 && tail <= 10 ? few : many}`
}
/** رابط يفتح Soul على قرار (إشعار الجوال ورسائل الواتساب) — kind:id أو 1 لكل القرارات */
export const SOUL_REF_KIND: Record<string, DecisionKind> = {
  cashier_deficit: 'deficit', excuse_request: 'excuse', leave_request: 'leave', advance_request: 'advance', extra_day: 'extra_day',
}
export const soulPath = (kind?: DecisionKind, id?: string | null) => `/dashboard?soul=${kind && id ? `${kind}:${id}` : '1'}`
