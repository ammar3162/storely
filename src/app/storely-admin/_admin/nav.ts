// قائمة لوحة الإدارة — مصدر واحد للقائمة الجانبية وأيقونة عنوان كل صفحة
import type { ComponentType } from 'react'
import { PlayCircle, LayoutDashboard, Users, TrendingUp, Inbox, Handshake, Megaphone, Activity, ShieldAlert, Settings } from 'lucide-react'

export type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number }>; perm?: string | string[] }

// perm: صلاحية مطلوبة (أو أي وحدة من القائمة). بدون perm = للمشرف الكامل فقط
export const NAV: { title: string; items: NavItem[] }[] = [
  { title: 'الرئيسية', items: [
    { href: '/storely-admin', label: 'نظرة عامة', icon: LayoutDashboard, perm: ['manage_users', 'view_analytics', 'view_metrics'] },
    { href: '/storely-admin/customers', label: 'العملاء', icon: Users, perm: 'manage_users' },
    { href: '/storely-admin/revenue', label: 'الإيراد والتكاليف', icon: TrendingUp, perm: 'view_metrics' },
  ] },
  { title: 'المتابعة', items: [
    { href: '/storely-admin/requests', label: 'صندوق الطلبات', icon: Inbox, perm: ['manage_users', 'manage_suppliers'] },
    { href: '/storely-admin/growth', label: 'السفراء والشركاء', icon: Handshake, perm: 'manage_users' },
  ] },
  { title: 'التواصل والمحتوى', items: [
    { href: '/storely-admin/communication', label: 'مركز التواصل', icon: Megaphone, perm: 'send_marketing' },
    { href: '/storely-admin/content', label: 'المحتوى والدعم', icon: PlayCircle, perm: 'manage_users' },
  ] },
  { title: 'النظام والإعدادات', items: [
    { href: '/storely-admin/system', label: 'حالة النظام', icon: Activity, perm: 'manage_backups' },
    { href: '/storely-admin/security', label: 'الأمان والسجلات', icon: ShieldAlert },
    { href: '/storely-admin/settings', label: 'الإعدادات', icon: Settings, perm: 'manage_packages' },
  ] },
]

/** عنصر القائمة للمسار الحالي (لأيقونة العنوان والمسار في الشريط العلوي) */
export function navItemFor(pathname: string) {
  const all = NAV.flatMap(g => g.items.map(i => ({ ...i, group: g.title })))
  return all.filter(i => i.href === '/storely-admin' ? pathname === i.href : pathname.startsWith(i.href)).sort((a, b) => b.href.length - a.href.length)[0] || null
}
