// صلاحيات مدير الفرع — مصدر واحد للقائمة الجانبية، وحماية الصفحات (proxy)، والـ API، وصفحة مديري الفروع
export type ManagerPerm = { key: string; label: string; hint: string; group: string; pages: string[] }

export const MANAGER_PERMS: ManagerPerm[] = [
  { key: 'inventory', label: 'المخزون', hint: 'الأصناف والكميات وإضافة صنف', group: 'المخزون والمشتريات', pages: ['/inventory'] },
  { key: 'dispense', label: 'الصرف', hint: 'صرف وهدر من المخزون', group: 'المخزون والمشتريات', pages: ['/dispense'] },
  { key: 'purchases', label: 'المشتريات', hint: 'تسجيل فواتير الشراء', group: 'المخزون والمشتريات', pages: ['/purchases'] },
  { key: 'suppliers', label: 'الموردين', hint: 'قائمة الموردين وطلباتهم', group: 'المخزون والمشتريات', pages: ['/suppliers'] },
  { key: 'marketplace', label: 'موردون معتمدون', hint: 'طلب تسعير من موردين ستورلي', group: 'المخزون والمشتريات', pages: ['/marketplace'] },
  { key: 'staff', label: 'الموظفون', hint: 'إضافة موظفي الفرع وصلاحياتهم', group: 'الفريق', pages: ['/staff-management'] },
  { key: 'attendance', label: 'الحضور والانصراف', hint: 'الحضور والتأخير والورديات', group: 'الفريق', pages: ['/attendance'] },
  { key: 'hr', label: 'الرواتب والإجازات', hint: 'الرواتب والسلف والإجازات والخصومات', group: 'الفريق', pages: ['/hr-management'] },
  { key: 'reports', label: 'التقارير', hint: 'تقارير الصرف والمشتريات والكاشير', group: 'التقارير والأرباح', pages: ['/reports'] },
  { key: 'profitability', label: 'الربحية', hint: 'المصاريف وصافي الربح', group: 'التقارير والأرباح', pages: ['/profitability'] },
  { key: 'online_store', label: 'المنيو الإلكتروني', hint: 'المنيو وطلبات العملاء', group: 'أخرى', pages: ['/online-store'] },
  { key: 'ai_tools', label: 'أدوات الذكاء', hint: 'التوقعات واقتراحات الطلب', group: 'أخرى', pages: ['/ai-tools'] },
]
export const MANAGER_PERM_KEYS = MANAGER_PERMS.map(p => p.key)

// صفحات المالك فقط — مدير الفرع ما يشوفها أبداً
export const OWNER_ONLY_PAGES = ['/settings', '/branches', '/branch-compare', '/branch-managers', '/transfer-stock', '/addons-market']

const under = (path: string, page: string) => path === page || path.startsWith(page + '/')

/** هل يقدر مدير الفرع يفتح هالصفحة؟ (الرئيسية والإشعارات متاحة دايماً) */
export function managerPageAllowed(path: string, perms: Record<string, unknown> | null | undefined): boolean {
  if (OWNER_ONLY_PAGES.some(p => under(path, p))) return false
  const perm = MANAGER_PERMS.find(p => p.pages.some(pg => under(path, pg)))
  return perm ? perms?.[perm.key] === true : true
}
/** الصفحات اللي تحتاج فحص (للـ proxy) */
export const GUARDED_PAGES = [...OWNER_ONLY_PAGES, ...MANAGER_PERMS.flatMap(p => p.pages)]

/** نحفظ المفاتيح المعروفة فقط، وكلها true/false */
export function cleanManagerPerms(raw: unknown): Record<string, boolean> {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return Object.fromEntries(MANAGER_PERM_KEYS.map(k => [k, o[k] === true]))
}

/** للـ API: المالك مسموح دايماً؛ المدير لازم عنده وحدة من الصلاحيات */
export const managerMay = (access: { role?: string | null; permissions?: Record<string, unknown> | null }, ...keys: string[]) =>
  access.role !== 'manager' || keys.some(k => access.permissions?.[k] === true)
