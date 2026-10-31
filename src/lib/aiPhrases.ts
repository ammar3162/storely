// عبارات أدوات الذكاء بلغة العميل: «يخلص بكرة» بدال «1 يوم»، «متأخر 5 أيام» بدال «−5»، وسطر «ليش» لكل توصية.

const r1 = (n: number) => Math.round(n * 10) / 10

/** «يوم / يومين / 3 أيام / 11 يوم» */
export function daysAr(n: number): string {
  const d = Math.round(Math.abs(n))
  if (d === 1) return 'يوم'
  if (d === 2) return 'يومين'
  if (d >= 3 && d <= 10) return `${d} أيام`
  return `${d} يوم`
}

/** متى يخلص الصنف */
export function runOutText(daysLeft: number | null | undefined): string {
  if (daysLeft == null || !Number.isFinite(daysLeft)) return 'ما يخلص قريب'
  if (daysLeft <= 0) return 'يخلص اليوم'
  if (Math.round(daysLeft) === 1) return 'يخلص بكرة'
  return `يخلص بعد ${daysAr(daysLeft)}`
}

/** متى تطلب (السالب = متأخر) */
export function orderWhenText(days: number | null | undefined): string {
  if (days == null || !Number.isFinite(days)) return 'ما يحتاج طلب الحين'
  if (days <= -1) return `متأخر ${daysAr(days)} — اطلب اليوم`
  if (days < 1) return 'اطلب اليوم'
  if (Math.round(days) === 1) return 'اطلب بكرة'
  return `اطلب بعد ${daysAr(days)}`
}

/** سطر «ليش»: معدل الصرف وكم باقي */
export function usageReason(dailyRate: number, unit: string, currentQty?: number | null): string {
  const rate = r1(Number(dailyRate) || 0)
  const left = currentQty == null ? '' : `، وباقي ${r1(Number(currentQty))} ${unit}`
  return rate > 0 ? `لأنك تصرف تقريباً ${rate} ${unit} يومياً${left}` : `ما فيه صرف كافي لحساب المعدل${left}`
}

/** سطر «ليش» لتوقيت الطلب: مدة التوريد مقابل الصرف */
export function leadReason(dailyRate: number, unit: string, leadDays: number): string {
  return `المورد يحتاج ${daysAr(leadDays)} عادةً، وأنت تصرف ${r1(Number(dailyRate) || 0)} ${unit} يومياً`
}

/** مبلغ بالريال (بدون كسور) */
export function riyal(amount: number | null | undefined, curr = 'ريال'): string | null {
  if (amount == null || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return null
  return `${Math.round(Number(amount)).toLocaleString('en-US')} ${curr}`
}

/** نسبة التغيّر عن الشهر السابق تنعرض بس لو المقارنة منطقية (الشهر السابق مو صغير جداً) */
export function changePctVisible(current: number, previous: number): boolean {
  const cur = Math.abs(Number(current) || 0), prev = Math.abs(Number(previous) || 0)
  if (prev <= 0) return false
  if (prev < cur * 0.2) return false          // الشهر السابق أقل من خُمس الحالي → النسبة تضلل (مثل ▲1281%)
  return Math.abs((cur - prev) / prev) <= 3    // أكثر من 300% غالباً بيانات ناقصة
}
