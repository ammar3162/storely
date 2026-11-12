'use client'
// تجميع صفحات الإدارة: كل صفحة في القائمة = مجموعة أقسام في تبويبات. الروابط القديمة تحوّل للتبويب (انظر OLD_ROUTES)
import Hub, { type HubTab } from './Hub'
import Customers from './sections/customers'
import AccountHealth from './sections/account-health'
import Metrics from './sections/metrics'
import AiUsage from './sections/ai-usage'
import Renewals from './sections/renewals'
import AddonRequests from './sections/addon-requests'
import PricingSwitches from './sections/pricing-switches'
import DemoRequests from './sections/demo-requests'
import SupplierApplications from './sections/supplier-applications'
import Support from './sections/support'
import Agents from './sections/agents'
import Partners from './sections/partners'
import Notifications from './sections/notifications'
import Marquee from './sections/marquee-messages'
import EmailCampaigns from './sections/email-campaigns'
import HelpVideos from './sections/help-videos'
import AssistantQuestions from './sections/assistant-questions'
import Health from './sections/health'
import WhatsappHealth from './sections/notification-health'
import Backups from './sections/backups'
import AuditLog from './sections/audit-log'
import Duplicates from './sections/duplicate-registrations'
import ConsentLogs from './sections/consent-logs'
import Settings from './sections/settings'
import Packages from './sections/packages'
import Admins from './sections/admins'

export const HUBS: Record<string, { title: string; subtitle: string; tabs: HubTab[] }> = {
  customers: { title: 'العملاء', subtitle: 'كل المنشآت المسجّلة، ومن يستخدم النظام فعلاً ومن يحتاج متابعة', tabs: [
    { key: 'list', label: 'العملاء', perm: 'manage_users', Comp: Customers },
    { key: 'health', label: 'صحة الحسابات', perm: 'manage_users', Comp: AccountHealth },
  ] },
  revenue: { title: 'الإيراد والتكاليف', subtitle: 'الإيراد الشهري والاشتراكات، وتكلفة الذكاء الاصطناعي الفعلية', tabs: [
    { key: 'metrics', label: 'مقاييس الإيراد', perm: 'view_metrics', Comp: Metrics },
    { key: 'ai', label: 'تكلفة الذكاء الاصطناعي', perm: 'view_metrics', Comp: AiUsage },
  ] },
  requests: { title: 'صندوق الطلبات', subtitle: 'كل طلبات العملاء والموردين في مكان واحد: الدعم الفني، والتجديد، والإضافات — التبويب عليه عدد الطلبات الجديدة', tabs: [
    { key: 'support', label: 'الدعم الفني', perm: 'manage_users', Comp: Support, count: 'support' },
    { key: 'renewals', label: 'التجديد', perm: 'manage_users', Comp: Renewals, count: 'renewals' },
    { key: 'addons', label: 'الإضافات والترقية', perm: 'manage_users', Comp: AddonRequests, count: 'addons' },
    { key: 'switches', label: 'تغيير الباقة', perm: 'manage_users', Comp: PricingSwitches },
    { key: 'demos', label: 'طلبات العرض', Comp: DemoRequests, count: 'demos' },
    { key: 'suppliers', label: 'طلبات الموردين', perm: 'manage_suppliers', Comp: SupplierApplications },
  ] },
  growth: { title: 'السفراء والشركاء', subtitle: 'سفراء ستورلي ومستحقاتهم، وشعارات الشركاء في الموقع', tabs: [
    { key: 'agents', label: 'السفراء', perm: 'manage_users', Comp: Agents },
    { key: 'partners', label: 'الشركاء', Comp: Partners },
  ] },
  communication: { title: 'مركز التواصل', subtitle: 'كل ما يصل العملاء منك: إشعارات وبانرات داخل النظام، والشريط الإخباري، وإعلانات الإيميل', tabs: [
    { key: 'notifications', label: 'إشعارات وبانرات', Comp: Notifications },
    { key: 'marquee', label: 'الشريط الإخباري', Comp: Marquee },
    { key: 'email', label: 'إعلانات الإيميل', perm: 'send_marketing', Comp: EmailCampaigns },
  ] },
  content: { title: 'المحتوى والدعم', subtitle: 'فيديوهات الشرح لكل صفحة، وما يسأل عنه العملاء المساعد الذكي', tabs: [
    { key: 'videos', label: 'فيديوهات الشرح', perm: 'manage_users', Comp: HelpVideos },
    { key: 'questions', label: 'أسئلة المساعد الذكي', perm: 'manage_users', Comp: AssistantQuestions },
  ] },
  system: { title: 'حالة النظام', subtitle: 'صحة الخوادم والمهام المجدولة، ورسائل واتساب، والنسخ الاحتياطية', tabs: [
    { key: 'health', label: 'صحة النظام', Comp: Health },
    { key: 'whatsapp', label: 'صحة واتساب', Comp: WhatsappHealth },
    { key: 'backups', label: 'النسخ الاحتياطية', perm: 'manage_backups', Comp: Backups },
  ] },
  security: { title: 'الأمان والسجلات', subtitle: 'سجل عمليات المشرفين، والتسجيلات المشبوهة، وسجلات موافقة العملاء', tabs: [
    { key: 'audit', label: 'سجل التدقيق', Comp: AuditLog },
    { key: 'duplicates', label: 'تسجيلات مشبوهة', Comp: Duplicates },
    { key: 'consent', label: 'سجلات الموافقة', Comp: ConsentLogs },
  ] },
  settings: { title: 'الإعدادات', subtitle: 'إعدادات المنصة، والباقات والأسعار، وحسابات المشرفين', tabs: [
    { key: 'platform', label: 'إعدادات المنصة', Comp: Settings },
    { key: 'packages', label: 'الباقات والأسعار', perm: 'manage_packages', Comp: Packages },
    { key: 'admins', label: 'المشرفون', Comp: Admins },
  ] },
}

export function HubPage({ id }: { id: keyof typeof HUBS }) { return <Hub {...HUBS[id]} /> }
