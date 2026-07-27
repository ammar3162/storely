// تحويل رمز الدولة (كود الاتصال الدولي) للعملة المناسبة تلقائياً
export const CURRENCY_BY_DIAL_CODE: Record<string, string> = {
  '+966': 'SAR', // السعودية
  '+971': 'AED', // الإمارات
  '+965': 'KWD', // الكويت
  '+973': 'BHD', // البحرين
  '+974': 'QAR', // قطر
  '+968': 'OMR', // عُمان
  '+20':  'EGP', // مصر
  '+962': 'JOD', // الأردن
  '+961': 'LBP', // لبنان
  '+964': 'IQD', // العراق
  '+963': 'SYP', // سوريا
  '+970': 'ILS', // فلسطين
  '+212': 'MAD', // المغرب
  '+216': 'TND', // تونس
  '+213': 'DZD', // الجزائر
  '+218': 'LYD', // ليبيا
  '+249': 'SDG', // السودان
  '+1':   'USD', // أمريكا/كندا
  '+44':  'GBP', // بريطانيا
}

export function currencyForDialCode(dialCode: string): string {
  return CURRENCY_BY_DIAL_CODE[dialCode] || 'USD' // افتراضي لأي دولة غير مدرجة
}
