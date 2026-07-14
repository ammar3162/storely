/**
 * تنظيف مدخلات المستخدم النصية قبل حفظها بقاعدة البيانات.
 * يحمي من: نصوص طويلة جداً (إغراق التخزين)، رموز تحكم خفية (Unicode)،
 * ومسافات زائدة — بدون ما يمس المحتوى العربي/الإنجليزي الطبيعي.
 */
export function sanitizeText(input: unknown, maxLength = 500): string {
  if (input === null || input === undefined) return ''
  let text = String(input)

  // إزالة رموز التحكم غير المرئية (بما فيها rtl/ltr override المستخدمة أحياناً بهجمات التصيّد البصري)
  // نستثني newline (\n = \u000A) و tab (\u0009) لأنها مستخدمة طبيعياً بالنصوص متعددة الأسطر
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')

  text = text.trim()

  if (text.length > maxLength) text = text.slice(0, maxLength)

  return text
}

/** نسخة مختصرة للحقول القصيرة (أسماء، عناوين) */
export function sanitizeShortText(input: unknown, maxLength = 150): string {
  return sanitizeText(input, maxLength)
}

/** نسخة للنصوص الطويلة (أوصاف، ملاحظات) */
export function sanitizeLongText(input: unknown, maxLength = 2000): string {
  return sanitizeText(input, maxLength)
}
