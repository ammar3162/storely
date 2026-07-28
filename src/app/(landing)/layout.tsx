import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Storely — نظام إدارة المخزون الذكي',
  description: 'منصة عربية احترافية لإدارة المخزون مع تنبيهات واتساب فورية، إدارة موظفين، وتقارير متكاملة لكل المنشآت. يبدأ من 149 ر.س شهرياً.',
  keywords: 'نظام مخزون, إدارة مخزون, برنامج مخزون, تتبع المخزون, واتساب مخزون, storely',
  openGraph: {
    title: 'Storely — نظام إدارة المخزون الذكي',
    description: 'تتبع مخزونك لحظة بلحظة واستقبل تنبيهات واتساب قبل النفاد',
    locale: 'ar_SA',
    type: 'website',
    url: 'https://storely.dev',
    siteName: 'Storely',
    images: [{ url: 'https://storely.dev/storely-logo.png', width: 512, height: 512, alt: 'Storely' }],
  },
  twitter: {
    card: 'summary',
    title: 'Storely — نظام إدارة المخزون الذكي',
    description: 'تتبع مخزونك لحظة بلحظة واستقبل تنبيهات واتساب قبل النفاد',
    images: ['https://storely.dev/storely-logo.png'],
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
