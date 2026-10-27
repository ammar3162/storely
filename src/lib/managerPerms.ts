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

/**
 * حارس الـ API لمدير الفرع — نفس صلاحيات الصفحات، بس على مستوى الخادم.
 * read = GET، write = أي طريقة ثانية. 'owner' = للمالك فقط. مسار مو مذكور = مفتوح (مثل الإشعارات والرئيسية).
 * القراءة مفتوحة لكل صفحة تستخدم المسار (مثلاً الأصناف تظهر بالصرف والمشتريات)، والتعديل لصاحب الصفحة.
 */
type Rule = string[] | 'owner'
const OWNER: Rule = 'owner'
export const API_GUARDS: Record<string, { read?: Rule; write?: Rule }> = {
  // للمالك فقط
  '/api/accountant-access': { read: OWNER, write: OWNER },
  '/api/accountant-link': { read: OWNER, write: OWNER },
  '/api/accountant-requests': { read: OWNER, write: OWNER },
  '/api/period-locks': { read: OWNER, write: OWNER },
  '/api/backup': { read: OWNER, write: OWNER },
  '/api/branch-comparison': { read: OWNER, write: OWNER },
  '/api/branch-transfer': { read: OWNER, write: OWNER },
  '/api/delete-branch': { read: OWNER, write: OWNER },
  '/api/delete-account': { read: OWNER, write: OWNER },
  '/api/branch-managers': { read: OWNER, write: OWNER },
  '/api/branches/copy-products': { read: OWNER, write: OWNER },
  '/api/notify-low-stock': { write: OWNER },
  '/api/addons-market': { write: OWNER },
  // المخزون والصرف
  '/api/products': { write: ['inventory', 'ai_tools'] },
  '/api/products/import': { read: ['inventory'], write: ['inventory'] },
  '/api/sync-product-to-staff': { write: ['inventory', 'purchases'] },
  '/api/stock-movements': { write: ['dispense'] },
  '/api/stock-counts': { read: ['inventory', 'ai_tools'], write: ['inventory'] },
  '/api/notify-low-stock-instant': { write: ['dispense'] },
  '/api/notify-staff-dispense': { write: ['dispense'] },
  '/api/notify-waste': { write: ['dispense'] },
  // المشتريات
  '/api/purchases': { read: ['purchases', 'reports'], write: ['purchases', 'reports'] },
  '/api/purchases/bulk': { write: ['purchases'] },
  '/api/purchases/restore': { write: ['purchases', 'reports'] },
  '/api/ocr-invoice': { write: ['purchases'] },
  '/api/supplier-delivery-thanks': { write: ['purchases'] },
  // الموردين والسوق
  '/api/suppliers': { read: ['suppliers', 'purchases'], write: ['suppliers'] },
  '/api/suppliers/catalog': { read: ['suppliers'], write: ['suppliers'] },
  '/api/suppliers/link': { read: ['suppliers'], write: ['suppliers'] },
  '/api/add-supplier': { write: ['suppliers'] },
  '/api/notify-supplier': { write: ['suppliers'] },
  '/api/supplier-price-comparison': { read: ['suppliers'], write: ['suppliers'] },
  '/api/supplier-rating': { read: ['suppliers'], write: ['suppliers'] },
  '/api/supplier-timeline': { read: ['suppliers'], write: ['suppliers'] },
  '/api/marketplace': { read: ['marketplace'], write: ['marketplace'] },
  // الموظفون
  '/api/staff-members': { read: ['staff', 'hr'], write: ['staff'] },
  '/api/staff-members/assign': { write: ['staff'] },
  '/api/staff-members/regenerate-pin': { write: ['staff'] },
  '/api/staff-members/reveal-pin': { write: ['staff'] },
  '/api/staff-members/report': { read: ['staff'] },
  '/api/add-staff': { write: ['staff'] },
  // الحضور
  '/api/attendance-penalty': { read: ['attendance'], write: ['attendance'] },
  '/api/apply-late-penalties': { read: ['attendance'], write: ['attendance'] },
  '/api/late-penalty-rules': { read: ['attendance'], write: ['attendance'] },
  '/api/shifts': { read: ['attendance', 'staff', 'hr'], write: ['attendance'] },
  '/api/staff-shifts': { read: ['attendance'], write: ['attendance'] },
  '/api/attendance-report': { read: ['attendance', 'reports'] },
  '/api/attendance-permission-request': { read: ['hr', 'attendance'], write: ['hr', 'attendance'] },
  // الرواتب والإجازات
  '/api/staff-payroll-adjustments': { read: ['hr'], write: ['hr'] },
  '/api/staff-leave': { read: ['hr'], write: ['hr'] },
  '/api/staff-report': { read: ['hr'], write: ['hr'] },
  '/api/staff-salary': { read: ['hr'], write: ['hr'] },
  '/api/staff-tasks': { read: ['hr'], write: ['hr'] },
  '/api/extra-days': { read: ['hr'], write: OWNER },
  // التقارير والأرباح
  '/api/reports': { read: ['reports'] },
  '/api/cashier-closing': { read: ['reports'], write: ['reports'] },
  '/api/cashier-deficit-decision': { write: ['reports'] },
  '/api/staff-monthly-report': { read: ['reports', 'staff', 'hr'] },
  '/api/profitability': { read: ['profitability'], write: ['profitability'] },
  '/api/profitability/closed-months': { read: ['profitability'], write: ['profitability'] },
  '/api/fixed-expenses': { read: ['profitability'], write: ['profitability'] },
  '/api/monthly-fixed-expenses': { read: ['profitability'], write: ['profitability'] },
  '/api/delivery-income': { read: ['profitability'], write: ['profitability'] },
  // المنيو الإلكتروني
  '/api/shop-items': { read: ['online_store'], write: ['online_store'] },
  '/api/shop-product': { read: ['online_store'], write: ['online_store'] },
  '/api/shop-reorder': { read: ['online_store'], write: ['online_store'] },
  '/api/shop-settings': { read: ['online_store'], write: ['online_store'] },
  '/api/reservation-wa-qrcode': { read: ['online_store'], write: ['online_store'] },
  '/api/reservation-wa-status': { read: ['online_store'], write: ['online_store'] },
  // أدوات الذكاء
  '/api/purchase-suggestion': { read: ['ai_tools'], write: ['ai_tools'] },
  '/api/recipe-reconciliation': { read: ['ai_tools'], write: ['ai_tools'] },
  '/api/recipes': { read: ['ai_tools'], write: ['ai_tools'] },
  '/api/reorder-optimizer': { read: ['ai_tools'], write: ['ai_tools'] },
  '/api/seasonality': { read: ['ai_tools'], write: ['ai_tools'] },
  '/api/smart-insights': { read: ['ai_tools'], write: ['ai_tools'] },
  '/api/stock-forecast': { read: ['ai_tools'], write: ['ai_tools'] },
  '/api/waste-detection': { read: ['ai_tools'], write: ['ai_tools'] },
  '/api/waste-report': { read: ['ai_tools'], write: ['ai_tools'] },
  '/api/weekly-report-data': { read: ['ai_tools'], write: ['ai_tools'] },
}

/** هل يقدر مدير الفرع يستدعي هالمسار بهالطريقة؟ (المسار بالضبط — /api/backup/list يتبع /api/backup) */
export function managerApiAllowed(path: string, method: string, perms: Record<string, unknown> | null | undefined): boolean {
  let p = path.replace(/\/+$/, '')
  let guard = API_GUARDS[p]
  while (!guard && p.lastIndexOf('/') > 4) { p = p.slice(0, p.lastIndexOf('/')); guard = API_GUARDS[p] }
  const rule = guard && (method.toUpperCase() === 'GET' ? guard.read : guard.write)
  if (!rule) return true
  if (rule === 'owner') return false
  return rule.some(k => perms?.[k] === true)
}

/** مسارات مفتوحة لمدير الفرع عن قصد (الرئيسية، الإشعارات، الإعدادات المشتركة) — كل مسار منشأة لازم يكون هنا أو بـ API_GUARDS */
export const API_OPEN = [
  '/api/ai-assistant', '/api/branches', '/api/dashboard-summary', '/api/month-comparison', '/api/nav-counts',
  '/api/notifications', '/api/onboarding', '/api/org-settings', '/api/push-subscribe', '/api/smart-reorder-timing', '/api/vat-status',
]
