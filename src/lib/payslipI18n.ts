// نصوص كشف الراتب بلغات الموظفين — نفس اللغات المتاحة بباقي صفحات الموظف
export type PayslipLang = 'ar' | 'en' | 'ur' | 'hi' | 'tl' | 'bn' | 'fr'

export const PAYSLIP_LANGS: { code: PayslipLang; label: string; locale: string; rtl: boolean }[] = [
  { code: 'ar', label: 'العربية', locale: 'ar-SA', rtl: true },
  { code: 'en', label: 'English', locale: 'en-GB', rtl: false },
  { code: 'ur', label: 'اردو', locale: 'ur-PK', rtl: true },
  { code: 'hi', label: 'हिन्दी', locale: 'hi-IN', rtl: false },
  { code: 'tl', label: 'Tagalog', locale: 'fil-PH', rtl: false },
  { code: 'bn', label: 'বাংলা', locale: 'bn-BD', rtl: false },
  { code: 'fr', label: 'Français', locale: 'fr-FR', rtl: false },
]

type Dict = Record<string, string>

const ar: Dict = {
  extraDays: '+{n} يوم إضافي', 
  title: 'كشف الراتب', back: 'رجوع', prev: 'الشهر السابق', next: 'الشهر التالي', current: 'الشهر الحالي',
  netSoFar: 'صافي الراتب حتى الآن', net: 'صافي الراتب',
  earnings: 'المستحقات', basic: 'الراتب الأساسي', housing: 'بدل سكن', transport: 'بدل مواصلات', food: 'بدل طعام',
  overtime: 'الأوفر تايم', perHour: 'للساعة', totalEarnings: 'إجمالي المستحقات',
  deductions: 'الخصومات', late: 'غرامة تأخير', lateBy: 'تأخير {m}', manual: 'خصم من الإدارة', deficit: 'عجز إقفال الكاشير',
  lateBundle: 'غرامات تأخير', advance: 'سلفة', reason: 'السبب', totalDeductions: 'إجمالي الخصومات', noDeductions: 'ما عليك أي خصومات هذا الشهر',
  pending: 'بانتظار قرار الإدارة — ما انخصمت', pendingAdvance: 'طلب سلفة', pendingDeficit: 'عجز إقفال الكاشير',
  daysPresent: 'يوم حضور', lateStat: 'تأخير', times: 'مرة', overtimeStat: 'أوفر تايم', overtimeDays: 'أيام الأوفر تايم',
  noteOff: 'الأوفر تايم غير مفعّل في منشأتك.',
  noteFixed: 'الأوفر تايم يُحسب من وقت انصرافك بعد نهاية شفتك، بمبلغ {rate} لكل ساعة.',
  noteAuto: 'الأوفر تايم يُحسب من وقت انصرافك بعد نهاية شفتك: الراتب الأساسي ÷ 30 ÷ ساعات الشفت × المضاعف = {rate} للساعة.',
  noteCurrent: 'أرقام الشهر الحالي تتحدّث مع كل حضور وانصراف.',
  disabled: 'كشف الراتب غير مفعّل من الإدارة', loadError: 'تعذّر تحميل كشف الراتب', network: 'خطأ بالاتصال، حاول مرة ثانية',
  h: 'س', m: 'د', hour: 'ساعة', minute: 'دقيقة', language: 'اللغة',
}

const en: Dict = {
  extraDays: '+{n} extra day(s)', 
  title: 'Payslip', back: 'Back', prev: 'Previous month', next: 'Next month', current: 'This month',
  netSoFar: 'Net pay so far', net: 'Net pay',
  earnings: 'Earnings', basic: 'Basic salary', housing: 'Housing allowance', transport: 'Transport allowance', food: 'Food allowance',
  overtime: 'Overtime', perHour: 'per hour', totalEarnings: 'Total earnings',
  deductions: 'Deductions', late: 'Late penalty', lateBy: '{m} late', manual: 'Deduction by management', deficit: 'Cash register shortage',
  lateBundle: 'Late penalties', advance: 'Salary advance', reason: 'Reason', totalDeductions: 'Total deductions', noDeductions: 'No deductions this month',
  pending: 'Awaiting management decision — not deducted', pendingAdvance: 'Advance request', pendingDeficit: 'Cash register shortage',
  daysPresent: 'days present', lateStat: 'Late', times: 'times', overtimeStat: 'Overtime', overtimeDays: 'Overtime days',
  noteOff: 'Overtime is not enabled at your workplace.',
  noteFixed: 'Overtime counts from your check-out after your shift ends, at {rate} per hour.',
  noteAuto: 'Overtime counts from your check-out after your shift ends: basic salary ÷ 30 ÷ shift hours × multiplier = {rate} per hour.',
  noteCurrent: 'This month updates with every check-in and check-out.',
  disabled: 'The payslip is not enabled by management', loadError: 'Could not load the payslip', network: 'Connection error, please try again',
  h: 'h', m: 'm', hour: 'hour', minute: 'min', language: 'Language',
}

const ur: Dict = {
  extraDays: '+{n} اضافی دن', 
  title: 'تنخواہ کی پرچی', back: 'واپس', prev: 'پچھلا مہینہ', next: 'اگلا مہینہ', current: 'موجودہ مہینہ',
  netSoFar: 'اب تک کی خالص تنخواہ', net: 'خالص تنخواہ',
  earnings: 'آمدنی', basic: 'بنیادی تنخواہ', housing: 'رہائش الاؤنس', transport: 'ٹرانسپورٹ الاؤنس', food: 'کھانے کا الاؤنس',
  overtime: 'اوور ٹائم', perHour: 'فی گھنٹہ', totalEarnings: 'کل آمدنی',
  deductions: 'کٹوتیاں', late: 'تاخیر کا جرمانہ', lateBy: '{m} تاخیر', manual: 'انتظامیہ کی کٹوتی', deficit: 'کیش کاؤنٹر میں کمی',
  lateBundle: 'تاخیر کے جرمانے', advance: 'ایڈوانس', reason: 'وجہ', totalDeductions: 'کل کٹوتیاں', noDeductions: 'اس مہینے کوئی کٹوتی نہیں',
  pending: 'انتظامیہ کے فیصلے کا انتظار — کٹوتی نہیں ہوئی', pendingAdvance: 'ایڈوانس کی درخواست', pendingDeficit: 'کیش کاؤنٹر میں کمی',
  daysPresent: 'دن حاضری', lateStat: 'تاخیر', times: 'بار', overtimeStat: 'اوور ٹائم', overtimeDays: 'اوور ٹائم کے دن',
  noteOff: 'آپ کے ادارے میں اوور ٹائم فعال نہیں ہے۔',
  noteFixed: 'اوور ٹائم شفٹ ختم ہونے کے بعد آپ کی روانگی کے وقت سے شمار ہوتا ہے، {rate} فی گھنٹہ۔',
  noteAuto: 'اوور ٹائم شفٹ ختم ہونے کے بعد آپ کی روانگی سے شمار ہوتا ہے: بنیادی تنخواہ ÷ 30 ÷ شفٹ کے گھنٹے × ضرب = {rate} فی گھنٹہ۔',
  noteCurrent: 'موجودہ مہینے کے اعداد ہر حاضری اور روانگی کے ساتھ اپ ڈیٹ ہوتے ہیں۔',
  disabled: 'انتظامیہ نے تنخواہ کی پرچی فعال نہیں کی', loadError: 'تنخواہ کی پرچی لوڈ نہیں ہو سکی', network: 'کنکشن کی خرابی، دوبارہ کوشش کریں',
  h: 'گھ', m: 'م', hour: 'گھنٹہ', minute: 'منٹ', language: 'زبان',
}

const hi: Dict = {
  extraDays: '+{n} अतिरिक्त दिन', 
  title: 'वेतन पर्ची', back: 'वापस', prev: 'पिछला महीना', next: 'अगला महीना', current: 'इस महीने',
  netSoFar: 'अब तक का शुद्ध वेतन', net: 'शुद्ध वेतन',
  earnings: 'कमाई', basic: 'मूल वेतन', housing: 'आवास भत्ता', transport: 'यात्रा भत्ता', food: 'भोजन भत्ता',
  overtime: 'ओवरटाइम', perHour: 'प्रति घंटा', totalEarnings: 'कुल कमाई',
  deductions: 'कटौतियाँ', late: 'देरी का जुर्माना', lateBy: '{m} देरी', manual: 'प्रबंधन द्वारा कटौती', deficit: 'कैश काउंटर में कमी',
  lateBundle: 'देरी के जुर्माने', advance: 'अग्रिम', reason: 'कारण', totalDeductions: 'कुल कटौतियाँ', noDeductions: 'इस महीने कोई कटौती नहीं',
  pending: 'प्रबंधन के निर्णय की प्रतीक्षा — कटौती नहीं हुई', pendingAdvance: 'अग्रिम का अनुरोध', pendingDeficit: 'कैश काउंटर में कमी',
  daysPresent: 'दिन उपस्थित', lateStat: 'देरी', times: 'बार', overtimeStat: 'ओवरटाइम', overtimeDays: 'ओवरटाइम के दिन',
  noteOff: 'आपके कार्यस्थल पर ओवरटाइम चालू नहीं है।',
  noteFixed: 'ओवरटाइम शिफ्ट खत्म होने के बाद आपके चेक-आउट से गिना जाता है, {rate} प्रति घंटा।',
  noteAuto: 'ओवरटाइम शिफ्ट खत्म होने के बाद आपके चेक-आउट से गिना जाता है: मूल वेतन ÷ 30 ÷ शिफ्ट के घंटे × गुणक = {rate} प्रति घंटा।',
  noteCurrent: 'इस महीने के आंकड़े हर चेक-इन और चेक-आउट के साथ अपडेट होते हैं।',
  disabled: 'प्रबंधन ने वेतन पर्ची चालू नहीं की है', loadError: 'वेतन पर्ची लोड नहीं हो सकी', network: 'कनेक्शन में त्रुटि, फिर से कोशिश करें',
  h: 'घं', m: 'मि', hour: 'घंटा', minute: 'मिनट', language: 'भाषा',
}

const tl: Dict = {
  extraDays: '+{n} dagdag na araw', 
  title: 'Payslip', back: 'Bumalik', prev: 'Nakaraang buwan', next: 'Susunod na buwan', current: 'Ngayong buwan',
  netSoFar: 'Netong sahod hanggang ngayon', net: 'Netong sahod',
  earnings: 'Mga kita', basic: 'Batayang sahod', housing: 'Allowance sa pabahay', transport: 'Allowance sa transportasyon', food: 'Allowance sa pagkain',
  overtime: 'Overtime', perHour: 'kada oras', totalEarnings: 'Kabuuang kita',
  deductions: 'Mga kaltas', late: 'Multa sa pagkahuli', lateBy: 'Huli ng {m}', manual: 'Kaltas ng pamunuan', deficit: 'Kulang sa kaha',
  lateBundle: 'Mga multa sa pagkahuli', advance: 'Bale', reason: 'Dahilan', totalDeductions: 'Kabuuang kaltas', noDeductions: 'Walang kaltas ngayong buwan',
  pending: 'Hinihintay ang desisyon ng pamunuan — hindi pa kinakaltas', pendingAdvance: 'Hiling na bale', pendingDeficit: 'Kulang sa kaha',
  daysPresent: 'araw na pumasok', lateStat: 'Huli', times: 'beses', overtimeStat: 'Overtime', overtimeDays: 'Mga araw ng overtime',
  noteOff: 'Hindi naka-on ang overtime sa inyong trabaho.',
  noteFixed: 'Binibilang ang overtime mula sa iyong pag-out pagkatapos ng shift, {rate} kada oras.',
  noteAuto: 'Binibilang ang overtime mula sa iyong pag-out pagkatapos ng shift: batayang sahod ÷ 30 ÷ oras ng shift × multiplier = {rate} kada oras.',
  noteCurrent: 'Nag-a-update ang buwang ito sa bawat pag-in at pag-out.',
  disabled: 'Hindi pa naka-on ng pamunuan ang payslip', loadError: 'Hindi ma-load ang payslip', network: 'May problema sa koneksyon, subukan ulit',
  h: 'o', m: 'm', hour: 'oras', minute: 'minuto', language: 'Wika',
}

const bn: Dict = {
  extraDays: '+{n} অতিরিক্ত দিন', 
  title: 'বেতন স্লিপ', back: 'ফিরে যান', prev: 'আগের মাস', next: 'পরের মাস', current: 'এই মাস',
  netSoFar: 'এখন পর্যন্ত নিট বেতন', net: 'নিট বেতন',
  earnings: 'আয়', basic: 'মূল বেতন', housing: 'বাসা ভাতা', transport: 'যাতায়াত ভাতা', food: 'খাবার ভাতা',
  overtime: 'ওভারটাইম', perHour: 'প্রতি ঘণ্টা', totalEarnings: 'মোট আয়',
  deductions: 'কর্তন', late: 'দেরির জরিমানা', lateBy: '{m} দেরি', manual: 'ব্যবস্থাপনার কর্তন', deficit: 'ক্যাশ কাউন্টারে ঘাটতি',
  lateBundle: 'দেরির জরিমানা', advance: 'অগ্রিম', reason: 'কারণ', totalDeductions: 'মোট কর্তন', noDeductions: 'এই মাসে কোনো কর্তন নেই',
  pending: 'ব্যবস্থাপনার সিদ্ধান্তের অপেক্ষায় — কাটা হয়নি', pendingAdvance: 'অগ্রিমের অনুরোধ', pendingDeficit: 'ক্যাশ কাউন্টারে ঘাটতি',
  daysPresent: 'দিন উপস্থিত', lateStat: 'দেরি', times: 'বার', overtimeStat: 'ওভারটাইম', overtimeDays: 'ওভারটাইমের দিন',
  noteOff: 'আপনার কর্মস্থলে ওভারটাইম চালু নেই।',
  noteFixed: 'শিফট শেষ হওয়ার পর আপনার চেক-আউট থেকে ওভারটাইম গণনা হয়, প্রতি ঘণ্টা {rate}।',
  noteAuto: 'শিফট শেষ হওয়ার পর আপনার চেক-আউট থেকে ওভারটাইম গণনা হয়: মূল বেতন ÷ 30 ÷ শিফটের ঘণ্টা × গুণক = প্রতি ঘণ্টা {rate}।',
  noteCurrent: 'এই মাসের হিসাব প্রতিটি চেক-ইন ও চেক-আউটের সাথে আপডেট হয়।',
  disabled: 'ব্যবস্থাপনা বেতন স্লিপ চালু করেনি', loadError: 'বেতন স্লিপ লোড করা যায়নি', network: 'সংযোগে সমস্যা, আবার চেষ্টা করুন',
  h: 'ঘ', m: 'মি', hour: 'ঘণ্টা', minute: 'মিনিট', language: 'ভাষা',
}

const fr: Dict = {
  extraDays: '+{n} jour(s) en plus', 
  title: 'Bulletin de paie', back: 'Retour', prev: 'Mois précédent', next: 'Mois suivant', current: 'Ce mois-ci',
  netSoFar: 'Salaire net à ce jour', net: 'Salaire net',
  earnings: 'Gains', basic: 'Salaire de base', housing: 'Indemnité de logement', transport: 'Indemnité de transport', food: 'Indemnité de repas',
  overtime: 'Heures supplémentaires', perHour: 'par heure', totalEarnings: 'Total des gains',
  deductions: 'Retenues', late: 'Pénalité de retard', lateBy: '{m} de retard', manual: 'Retenue de la direction', deficit: 'Manque de caisse',
  lateBundle: 'Pénalités de retard', advance: 'Avance sur salaire', reason: 'Motif', totalDeductions: 'Total des retenues', noDeductions: 'Aucune retenue ce mois-ci',
  pending: 'En attente de la décision de la direction — non retenu', pendingAdvance: "Demande d'avance", pendingDeficit: 'Manque de caisse',
  daysPresent: 'jours de présence', lateStat: 'Retard', times: 'fois', overtimeStat: 'Heures sup.', overtimeDays: 'Jours avec heures supplémentaires',
  noteOff: "Les heures supplémentaires ne sont pas activées dans votre établissement.",
  noteFixed: 'Les heures supplémentaires comptent à partir de votre départ après la fin du service, à {rate} par heure.',
  noteAuto: 'Les heures supplémentaires comptent à partir de votre départ après la fin du service : salaire de base ÷ 30 ÷ heures du service × coefficient = {rate} par heure.',
  noteCurrent: 'Ce mois se met à jour à chaque arrivée et départ.',
  disabled: "Le bulletin de paie n'est pas activé par la direction", loadError: 'Impossible de charger le bulletin de paie', network: 'Erreur de connexion, réessayez',
  h: 'h', m: 'min', hour: 'heure', minute: 'minute', language: 'Langue',
}

const DICTS: Record<PayslipLang, Dict> = { ar, en, ur, hi, tl, bn, fr }

export function normalizeLang(v: string | null | undefined): PayslipLang {
  return (PAYSLIP_LANGS.find(l => l.code === v)?.code) || 'ar'
}

export function payslipT(lang: PayslipLang) {
  const d = DICTS[lang] || ar
  return (key: string, vars?: Record<string, string>) => {
    let s = d[key] ?? ar[key] ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v)
    return s
  }
}

export function payslipKeysComplete(): string[] {
  // يستخدمها الاختبار: أي مفتاح ناقص بأي لغة
  const missing: string[] = []
  for (const [code, d] of Object.entries(DICTS)) for (const k of Object.keys(ar)) if (!(k in d)) missing.push(`${code}.${k}`)
  return missing
}
