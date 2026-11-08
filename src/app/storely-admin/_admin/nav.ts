// قائمة لوحة الإدارة — مصدر واحد للقائمة الجانبية وأيقونة عنوان كل صفحة
import type { ComponentType } from 'react'
import { PlayCircle, Wallet, Mail, PackagePlus, Tags,
  LayoutDashboard, Users, TrendingUp, Inbox, Truck, Handshake, Bell, Megaphone,
  Activity, MessageCircle, HardDrive, ScrollText, FileCheck, ShieldAlert,
  Package, UserCog, Settings, MessageCircleQuestion, HeartPulse, Sparkles,
} from 'lucide-react'

export type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number }>; perm?: string | string[] }

// perm: صلاحية مطلوبة (أو أي وحدة من القائمة). بدون perm = للمشرف الكامل فقط
export const NAV: { title: string; items: NavItem[] }[] = [
  { title: 'الرئيسية', items: [
    { href: '/storely-admin', label: 'نظرة عامة', icon: LayoutDashboard, perm: ['manage_users', 'view_analytics', 'view_metrics'] },
    { href: '/storely-admin/customers', label: 'العملاء', icon: Users, perm: 'manage_users' },
    { href: '/storely-admin/account-health', label: 'صحة الحسابات', icon: HeartPulse, perm: 'manage_users' },
    { href: '/storely-admin/metrics', label: 'مقاييس الإيراد', icon: TrendingUp, perm: 'view_metrics' },
    { href: '/storely-admin/ai-usage', label: 'تكلفة الذكاء الاصطناعي', icon: Sparkles, perm: 'view_metrics' },
  ] },
  { title: 'المبيعات والشراكات', items: [
    { href: '/storely-admin/addon-requests', label: 'طلبات الإضافات والترقية', icon: PackagePlus, perm: 'manage_users' },
    { href: '/storely-admin/pricing-switches', label: 'اختيارات الأسعار الجديدة', icon: Tags, perm: 'manage_users' },
    { href: '/storely-admin/demo-requests', label: 'طلبات العرض', icon: Inbox },
    { href: '/storely-admin/supplier-applications', label: 'طلبات الموردين', icon: Truck, perm: 'manage_suppliers' },
    { href: '/storely-admin/partners', label: 'الشركاء', icon: Handshake },
    { href: '/storely-admin/agents', label: 'السفراء', icon: Wallet, perm: 'manage_users' },
  ] },
  { title: 'التواصل', items: [
    { href: '/storely-admin/notifications', label: 'إشعارات العملاء', icon: Bell },
    { href: '/storely-admin/marquee-messages', label: 'الشريط الإخباري', icon: Megaphone },
    { href: '/storely-admin/email-campaigns', label: 'إعلانات الإيميل', icon: Mail, perm: 'send_marketing' },
    { href: '/storely-admin/help-videos', label: 'فيديوهات الشرح', icon: PlayCircle, perm: 'manage_users' },
    { href: '/storely-admin/assistant-questions', label: 'أسئلة المساعد الذكي', icon: MessageCircleQuestion, perm: 'manage_users' },
  ] },
  { title: 'النظام', items: [
    { href: '/storely-admin/health', label: 'صحة النظام', icon: Activity },
    { href: '/storely-admin/notification-health', label: 'صحة واتساب', icon: MessageCircle },
    { href: '/storely-admin/backups', label: 'النسخ الاحتياطية', icon: HardDrive, perm: 'manage_backups' },
  ] },
  { title: 'الأمان', items: [
    { href: '/storely-admin/audit-log', label: 'سجل التدقيق', icon: ScrollText },
    { href: '/storely-admin/consent-logs', label: 'سجلات الموافقة', icon: FileCheck },
    { href: '/storely-admin/duplicate-registrations', label: 'تسجيلات مشبوهة', icon: ShieldAlert },
  ] },
  { title: 'الإعدادات', items: [
    { href: '/storely-admin/packages', label: 'الباقات والأسعار', icon: Package, perm: 'manage_packages' },
    { href: '/storely-admin/admins', label: 'المشرفون', icon: UserCog },
    { href: '/storely-admin/settings', label: 'إعدادات المنصة', icon: Settings },
  ] },
]

/** عنصر القائمة للمسار الحالي (لأيقونة العنوان والمسار في الشريط العلوي) */
export function navItemFor(pathname: string) {
  const all = NAV.flatMap(g => g.items.map(i => ({ ...i, group: g.title })))
  return all.filter(i => i.href === '/storely-admin' ? pathname === i.href : pathname.startsWith(i.href)).sort((a, b) => b.href.length - a.href.length)[0] || null
}
