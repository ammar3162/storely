import type { SupabaseClient } from '@supabase/supabase-js'

// إشعار للموظف (جرس صفحته) لما يتسجّل عليه خصم أو ينلغى — بلغته المفضّلة
type Lang = 'ar' | 'en' | 'ur' | 'hi' | 'tl' | 'bn' | 'fr'
export type DeductionNotice =
  | { kind: 'manual'; amount: number; reason?: string | null }
  | { kind: 'late'; amount: number; minutes: number }
  | { kind: 'deficit'; amount: number; date: string }
  | { kind: 'late_waived'; amount: number; date: string }
  | { kind: 'late_restored'; amount: number; date: string }

const T: Record<Lang, Record<DeductionNotice['kind'], [string, string]> & { more: string; cur: string; reason: string; min: string }> = {
  ar: { manual: ['خصم على راتبك', 'انخصم {a} من راتبك{r}.'], late: ['خصم تأخير', 'تأخرت {m} — انخصم {a} من راتبك.'], deficit: ['خصم عجز الكاشير', 'انخصم {a} من راتبك بسبب عجز إقفال {d}.'], late_waived: ['انلغى خصم تأخير', 'ألغت الإدارة خصم التأخير ({a}) ليوم {d}.'], late_restored: ['رجع خصم تأخير', 'رجّعت الإدارة خصم التأخير ({a}) ليوم {d}.'], more: 'التفاصيل في كشف الراتب.', cur: 'ر.س', reason: ' — السبب: ', min: 'دقيقة' },
  en: { manual: ['Salary deduction', '{a} was deducted from your salary{r}.'], late: ['Late deduction', 'You were {m} late — {a} deducted.'], deficit: ['Cash shortage deduction', '{a} deducted for the cash shortage on {d}.'], late_waived: ['Late deduction cancelled', 'Management cancelled the late deduction ({a}) for {d}.'], late_restored: ['Late deduction restored', 'Management restored the late deduction ({a}) for {d}.'], more: 'See your payslip for details.', cur: 'SAR', reason: ' — reason: ', min: 'min' },
  ur: { manual: ['تنخواہ سے کٹوتی', 'آپ کی تنخواہ سے {a} کاٹے گئے{r}۔'], late: ['تاخیر کی کٹوتی', 'آپ {m} لیٹ آئے — {a} کٹوتی۔'], deficit: ['کیش کی کمی کی کٹوتی', '{d} کو کیش کی کمی پر {a} کٹوتی۔'], late_waived: ['تاخیر کی کٹوتی منسوخ', 'انتظامیہ نے {d} کی تاخیر کی کٹوتی ({a}) منسوخ کر دی۔'], late_restored: ['تاخیر کی کٹوتی بحال', 'انتظامیہ نے {d} کی تاخیر کی کٹوتی ({a}) بحال کر دی۔'], more: 'تفصیل تنخواہ کی پرچی میں۔', cur: 'ریال', reason: ' — وجہ: ', min: 'منٹ' },
  hi: { manual: ['वेतन से कटौती', 'आपके वेतन से {a} काटे गए{r}।'], late: ['देरी की कटौती', 'आप {m} देर से आए — {a} कटौती।'], deficit: ['कैश कमी की कटौती', '{d} की कैश कमी के लिए {a} कटौती।'], late_waived: ['देरी की कटौती रद्द', 'प्रबंधन ने {d} की देरी की कटौती ({a}) रद्द की।'], late_restored: ['देरी की कटौती बहाल', 'प्रबंधन ने {d} की देरी की कटौती ({a}) बहाल की।'], more: 'विवरण वेतन पर्ची में।', cur: 'रियाल', reason: ' — कारण: ', min: 'मिनट' },
  tl: { manual: ['Kaltas sa sahod', 'Kinaltasan ka ng {a}{r}.'], late: ['Kaltas sa pagkahuli', 'Nahuli ka ng {m} — {a} ang kinaltas.'], deficit: ['Kaltas sa kulang sa kaha', 'Kinaltasan ng {a} dahil sa kulang sa kaha noong {d}.'], late_waived: ['Kinansela ang kaltas', 'Kinansela ng pamunuan ang kaltas sa pagkahuli ({a}) noong {d}.'], late_restored: ['Ibinalik ang kaltas', 'Ibinalik ng pamunuan ang kaltas sa pagkahuli ({a}) noong {d}.'], more: 'Tingnan ang payslip.', cur: 'SAR', reason: ' — dahilan: ', min: 'min' },
  bn: { manual: ['বেতন থেকে কর্তন', 'আপনার বেতন থেকে {a} কাটা হয়েছে{r}।'], late: ['দেরির কর্তন', 'আপনি {m} দেরি করেছেন — {a} কাটা হয়েছে।'], deficit: ['ক্যাশ ঘাটতির কর্তন', '{d} তারিখের ক্যাশ ঘাটতির জন্য {a} কাটা হয়েছে।'], late_waived: ['দেরির কর্তন বাতিল', 'ব্যবস্থাপনা {d} তারিখের দেরির কর্তন ({a}) বাতিল করেছে।'], late_restored: ['দেরির কর্তন ফেরত', 'ব্যবস্থাপনা {d} তারিখের দেরির কর্তন ({a}) ফিরিয়ে দিয়েছে।'], more: 'বিস্তারিত বেতন স্লিপে।', cur: 'রিয়াল', reason: ' — কারণ: ', min: 'মিনিট' },
  fr: { manual: ['Retenue sur salaire', '{a} retenus sur votre salaire{r}.'], late: ['Retenue pour retard', 'Retard de {m} — {a} retenus.'], deficit: ['Retenue pour manque de caisse', '{a} retenus pour le manque de caisse du {d}.'], late_waived: ['Retenue de retard annulée', 'La direction a annulé la retenue de retard ({a}) du {d}.'], late_restored: ['Retenue de retard rétablie', 'La direction a rétabli la retenue de retard ({a}) du {d}.'], more: 'Détails dans votre bulletin de paie.', cur: 'SAR', reason: ' — motif : ', min: 'min' },
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })

export function deductionNoticeText(lang: string | null | undefined, n: DeductionNotice) {
  const d = T[(lang as Lang)] || T.ar
  const [title, tpl] = d[n.kind]
  const msg = tpl
    .replace('{a}', `${fmt(n.amount)} ${d.cur}`)
    .replace('{r}', n.kind === 'manual' && n.reason ? `${d.reason}${n.reason}` : '')
    .replace('{m}', n.kind === 'late' ? `${n.minutes} ${d.min}` : '')
    .replace('{d}', 'date' in n ? n.date : '')
  return { title, message: `${msg} ${d.more}` }
}

export async function notifyStaffDeduction(db: SupabaseClient, orgId: string, staffId: string, n: DeductionNotice) {
  try {
    const { data: st } = await db.from('staff_members').select('preferred_lang,name').eq('id', staffId).eq('org_id', orgId).maybeSingle()
    if (!st) return
    const { title, message } = deductionNoticeText((st as any).preferred_lang, n)
    await db.from('staff_notifications').insert({
      org_id: orgId, staff_id: staffId, staff_name: (st as any).name,
      type: n.kind === 'late_waived' ? 'success' : 'warning', title, message,
    } as any)
  } catch { /* الإشعار تكميلي — ما يوقف العملية */ }
}
