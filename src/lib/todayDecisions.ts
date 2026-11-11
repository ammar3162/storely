// «قرارات اليوم»: من نتايج الأدوات الموجودة (بدون ذكاء اصطناعي مدفوع) نطلع 3–5 أشياء يسويها المالك اليوم،
// مرتبة: اطلب الحين ← خسارة فلوس (هدر) ← زحمة اليوم/بكرة ← مخزون راكد.

import { mergeSmartOrder } from './smartOrder'
import { runOutText, daysAr, riyal } from './aiPhrases'
import { unitFor } from '@/lib/arabicCount'

export type Decision = {
  level: 'urgent' | 'warn' | 'info'
  title: string
  detail: string
  why?: string               // «لماذا؟»: سبب هذا القرار بالذات بأرقامه
  action: { label: string; href: string } | null
}

type Any = Record<string, any>
const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const hour12 = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'الصباح' : h < 17 ? 'الظهر' : 'المساء'}`

export function buildDecisions(input: {
  forecast?: Any[]; timing?: Any[]; buy?: Any[]; reorder?: Any[]
  season?: { byDay?: Any[]; peakHour?: Any | null } | null
  waste?: { report?: Any[]; totalEstimatedCost?: number | null; totalWasteEntries?: number } | null
  dead?: Any[]
  todayDow: number            // 0 = الأحد (بتوقيت السعودية)
  curr?: string
}, max = 5): Decision[] {
  const out: Decision[] = []

  // ١) اطلب الحين — الأصناف العاجلة من «الطلب الذكي»
  const { rows } = mergeSmartOrder(input)
  for (const r of rows.filter(r => r.urgent).slice(0, 3)) {
    const late = r.orderInDays != null && r.orderInDays <= -1
    const title = late ? `${r.name}: طلبه متأخر ${daysAr(r.orderInDays!)}` : `اطلب ${r.name} اليوم`
    const parts = [runOutText(r.daysLeft)]
    if (r.currentQty != null) parts.push(`المتبقي ${r.currentQty} ${unitFor(r.currentQty, r.unit)}`)
    if (r.suggestedQty) parts.push(`تحتاج ${r.suggestedQty} ${unitFor(r.suggestedQty, r.unit)}`)
    const rate = Math.round(r.dailyRate * 10) / 10
    const why = [
      rate > 0 ? `يُصرف منه نحو ${rate} ${unitFor(rate, r.unit)} يومياً` : null,
      r.leadDays != null && r.leadDays >= 1 ? `ويورّده المورد عادةً خلال ${daysAr(r.leadDays)}` : null,
      late ? `لذلك كان يجب طلبه قبل ${daysAr(r.orderInDays!)} ليصل قبل النفاد` : 'لذلك يجب طلبه اليوم ليصل قبل النفاد',
    ].filter(Boolean).join('، ') + '.'
    out.push({ level: 'urgent', title, detail: parts.join(' · '), why, action: r.supplierId
      ? { label: 'أرسل للمورد', href: `/suppliers?sid=${r.supplierId}` }   // يفتح كرت المورد وفيه «إرسال طلب توريد الآن»
      : { label: 'اربط بمورد', href: '/suppliers' } })
  }

  // ٢) خسارة فلوس: الهدر آخر 30 يوم
  const w = input.waste
  if (w && (w.totalWasteEntries ?? 0) > 0) {
    const top = [...(w.report || [])].sort((a, b) => (b.estimatedCost || 0) - (a.estimatedCost || 0) || b.totalQty - a.totalQty)[0]
    const money = riyal(w.totalEstimatedCost, input.curr)
    out.push({
      level: 'warn',
      title: money ? `خسرت ${money} بسبب الهدر خلال آخر 30 يوماً` : `${w.totalWasteEntries} عمليات هدر خلال آخر 30 يوماً`,
      why: `${w.totalWasteEntries} ${(w.totalWasteEntries ?? 0) >= 3 && (w.totalWasteEntries ?? 0) <= 10 ? 'عمليات' : 'عملية'} هدر مسجّلة خلال آخر 30 يوماً، محسوبة بمتوسط تكلفة كل صنف من فواتير الشراء.`,
      detail: top ? `معظمه من ${top.name}${top.topReason ? ` (${top.topReason})` : ''} — قلّل كمية طلبه أو راجع طريقة التخزين` : 'راجع أسباب الهدر',
      action: { label: 'التفاصيل', href: '#waste' },
    })
  }

  // ٣) زحمة اليوم أو بكرة (لو يوم الذروة واضح: أعلى من المتوسط بـ 15%+)
  const days = (input.season?.byDay || []).filter(d => d.total > 0)
  if (days.length >= 3) {
    const peak = days[0], avg = days.reduce((s, d) => s + d.total, 0) / days.length
    const peakIdx = DAY_NAMES.indexOf(peak.day)
    if (peakIdx >= 0 && peak.total >= avg * 1.15) {
      const h = input.season?.peakHour?.hour
      const when = typeof h === 'number' ? ` قبل ${hour12(h)}` : ''
      const why = `خلال آخر 90 يوماً، الصرف يوم ${peak.day} أعلى من متوسط أيامك بنسبة ${Math.round((peak.total / avg - 1) * 100)}%.`
      if (peakIdx === input.todayDow) out.push({ level: 'warn', title: 'اليوم هو الأكثر ازدحاماً لديك', detail: `تأكد من جاهزية الأصناف الأساسية${when}`, why, action: null })
      else if (peakIdx === (input.todayDow + 1) % 7) out.push({ level: 'warn', title: `غداً (${peak.day}) هو الأكثر ازدحاماً لديك`, detail: `جهّز مخزونك من اليوم${when}`, why, action: null })
    }
  }

  // ٤) مخزون راكد — لا تطلبه
  for (const d of (input.dead || []).filter(x => x.dispensed === 0 && x.wasteQty > 0).slice(0, 1)) {
    const money = riyal(d.estimatedValue, input.curr)
    out.push({ level: 'info', title: `${d.name} لم يُصرف منه شيء منذ شهر`, detail: `لديك ${d.wasteQty} ${unitFor(d.wasteQty, d.unit)}${money ? ` (${money})` : ''} — لا تطلبه الآن`, why: 'لم يُسجّل له أي صرف خلال آخر 30 يوماً، ولا يزال في المخزون.', action: null })
  }

  return out.slice(0, max)
}
