// أقسام تقرير المحاسب — ملف خفيف لحاله: صفحة الإعدادات تحتاج القائمة بس، وملف التصدير يجرّ مكتبة الإكسل (~260 كيلو)
export type AccSection = 'sales' | 'purchases' | 'vat' | 'payables' | 'payroll' | 'expenses' | 'cash_diff' | 'stock'
export const ACC_SECTIONS: { key: AccSection; label: string; hint: string }[] = [
  { key: 'sales', label: 'المبيعات', hint: 'من إقفالات الكاشير: كاش وشبكة' },
  { key: 'purchases', label: 'المشتريات', hint: 'كل فاتورة مع الضريبة وصورتها' },
  { key: 'vat', label: 'ضريبة القيمة المضافة', hint: 'ضريبة المبيعات ناقص ضريبة المشتريات' },
  { key: 'payables', label: 'الموردين الآجلين', hint: 'كم عليك لكل مورد' },
  { key: 'payroll', label: 'الرواتب', hint: 'بالتقرير الشهري فقط' },
  { key: 'expenses', label: 'المصروفات', hint: 'المسحوبات من درج الكاشير' },
  { key: 'cash_diff', label: 'العجز والزيادة', hint: 'فروقات إقفال الكاشير' },
  { key: 'stock', label: 'قيمة المخزون', hint: 'الكمية × متوسط التكلفة' },
]
