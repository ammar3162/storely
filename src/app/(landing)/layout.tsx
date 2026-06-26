import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Storely — نظام إدارة المخزون الذكي للمنشآت السعودية',
  description: 'منصة عربية احترافية لإدارة المخزون مع تنبيهات واتساب فورية، إدارة موظفين، وتقارير متكاملة. يبدأ من 149 ر.س شهرياً.',
  keywords: 'نظام مخزون, إدارة مخزون, برنامج مخزون سعودي, تتبع المخزون, واتساب مخزون, storely',
  openGraph: {
    title: 'Storely — نظام إدارة المخزون الذكي',
    description: 'تتبع مخزونك لحظة بلحظة واستقبل تنبيهات واتساب قبل النفاد',
    locale: 'ar_SA',
    type: 'website',
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
