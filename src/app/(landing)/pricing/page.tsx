// صفحة الأسعار المستقلة (مثل فودكس ورواء وقيود) — تنبني مرة وتنخدم من الكاش
import type { Metadata } from 'next'
import PricingPageClient from './PricingPageClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'الأسعار | Storely',
  description: 'باقات Storely: الأساسية والتشغيل والكاملة، أو ابنِ باقتك بالمزايا اللي تحتاجها. جرّب كل المزايا مجاناً 14 يوماً.',
  alternates: { canonical: 'https://storely.dev/pricing' },
}

export default function Page() {
  return <PricingPageClient />
}
