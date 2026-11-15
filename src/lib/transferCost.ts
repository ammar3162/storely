// تكلفة الصنف بالفرع المستلم بعد نقل مخزون — متوسط مرجّح (مثل الشراء)
//  - الفرع المستلم ما عنده تكلفة أو كميته صفر/سالبة → تكلفة المصدر
//  - المصدر بدون تكلفة → تبقى تكلفة المستلم كما هي (null = لا تغيير)
const r4 = (n: number) => Math.round(n * 10000) / 10000

export function transferAvgCost(destQty: number, destAvg: number, inQty: number, srcAvg: number): number | null {
  const src = Number(srcAvg) || 0
  const dAvg = Number(destAvg) || 0
  const dQty = Math.max(0, Number(destQty) || 0)
  if (!src) return null
  if (!dAvg || !dQty) return r4(src)
  return r4((dQty * dAvg + inQty * src) / (dQty + inQty))
}
