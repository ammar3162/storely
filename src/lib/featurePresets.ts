// اختيارات جاهزة لصفحة الأسعار والتسجيل (2026-11-08): تعلّم المزايا بس — ما هي باقات مستقلة،
// والسعر دايم مجموع المزايا المختارة (customMonthly).
export const FEATURE_NAMES: Record<string, { ar: string; en: string }> = {
  mod_inventory: { ar: 'المخزون والموردين', en: 'Inventory & suppliers' },
  mod_purchases: { ar: 'المشتريات والفواتير', en: 'Purchases & invoices' },
  cashier_closing: { ar: 'إقفال الكاشير', en: 'Cashier closing' },
  hr_full: { ar: 'الحضور والرواتب', en: 'Attendance & payroll' },
  ai_tools: { ar: 'أدوات الذكاء الاصطناعي', en: 'AI tools' },
}

export const FEATURE_PRESETS: { key: string; ar: string; en: string; descAr: string; descEn: string; mods: string[]; popular?: boolean }[] = [
  { key: 'stock', ar: 'المخزون والمشتريات', en: 'Stock & purchases', descAr: 'لضبط المخزون والموردين والفواتير', descEn: 'Stock, suppliers and invoices', mods: ['mod_inventory', 'mod_purchases'] },
  { key: 'daily', ar: 'التشغيل اليومي', en: 'Daily operations', descAr: 'المخزون وإقفال الكاشير والحضور', descEn: 'Stock, cashier closing and attendance', mods: ['mod_inventory', 'cashier_closing', 'hr_full'], popular: true },
  { key: 'all', ar: 'كل المزايا', en: 'Everything', descAr: 'كل شيء في Storely', descEn: 'All of Storely', mods: ['mod_inventory', 'mod_purchases', 'cashier_closing', 'hr_full', 'ai_tools'] },
]
export const DEFAULT_PRESET = FEATURE_PRESETS[1]
