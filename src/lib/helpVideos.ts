// فيديوهات الشرح لكل صفحة — يوتيوب بس (رابط غير مُدرج)، والإدارة هي اللي تضيفها

/** الصفحات اللي ينحط لها فيديو (المفتاح = بداية رابط الصفحة) */
export const HELP_PAGES: { key: string; label: string; group: 'المالك' | 'الموظف' }[] = [
  { key: '/dashboard', label: 'الرئيسية', group: 'المالك' },
  { key: '/inventory', label: 'المخزون', group: 'المالك' },
  { key: '/dispense', label: 'الصرف', group: 'المالك' },
  { key: '/purchases', label: 'المشتريات', group: 'المالك' },
  { key: '/transfer-stock', label: 'النقل بين الفروع', group: 'المالك' },
  { key: '/suppliers', label: 'الموردين', group: 'المالك' },
  { key: '/staff-management', label: 'الموظفون', group: 'المالك' },
  { key: '/hr-management', label: 'إدارة الموظفين والرواتب', group: 'المالك' },
  { key: '/attendance', label: 'الحضور والانصراف', group: 'المالك' },
  { key: '/branch-managers', label: 'مديرو الفروع', group: 'المالك' },
  { key: '/branches', label: 'إدارة الفروع', group: 'المالك' },
  { key: '/branch-compare', label: 'مقارنة الفروع', group: 'المالك' },
  { key: '/reports', label: 'التقارير', group: 'المالك' },
  { key: '/profitability', label: 'الربحية', group: 'المالك' },
  { key: '/ai-tools', label: 'أدوات الذكاء', group: 'المالك' },
  { key: '/online-store', label: 'المنيو الإلكتروني', group: 'المالك' },
  { key: '/notifications', label: 'الإشعارات', group: 'المالك' },
  { key: '/settings', label: 'الإعدادات', group: 'المالك' },
  { key: '/staff', label: 'صفحة الموظف الرئيسية', group: 'الموظف' },
  { key: '/staff/dispense', label: 'الصرف (الموظف)', group: 'الموظف' },
  { key: '/staff/purchases', label: 'المشتريات وتصوير الفاتورة (الموظف)', group: 'الموظف' },
  { key: '/staff/cashier-closing', label: 'إقفال الكاشير', group: 'الموظف' },
  { key: '/staff/salary', label: 'كشف الراتب (الموظف)', group: 'الموظف' },
  { key: '/staff/leave', label: 'الإجازات والطلبات (الموظف)', group: 'الموظف' },
  { key: '/staff/tasks', label: 'المهام (الموظف)', group: 'الموظف' },
]
export const HELP_PAGE_KEYS = new Set(HELP_PAGES.map(p => p.key))

/** المفتاح لصفحة معيّنة: أطول بداية مطابقة (/staff/purchases قبل /staff) */
export function helpKeyFor(pathname: string | null | undefined) {
  if (!pathname) return null
  let best: string | null = null
  for (const k of HELP_PAGE_KEYS) if ((pathname === k || pathname.startsWith(k + '/')) && (!best || k.length > best.length)) best = k
  return best
}

/** يطلّع رقم فيديو يوتيوب من أي رابط يوتيوب — وأي رابط ثاني يرجع null */
export function youtubeId(input: unknown): string | null {
  const s = String(input ?? '').trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s
  let u: URL
  try { u = new URL(s) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.replace(/^(www\.|m\.)/, '')
  let id: string | null = null
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0]
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v')
    else { const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/); id = m ? m[2] : null }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
}
