import AutoTranslate from '@/components/AutoTranslate'

// الترجمة التلقائية للإنجليزية (إذا اختارها المستخدم) لصفحات الدخول والإعداد
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><AutoTranslate/>{children}</>
}
