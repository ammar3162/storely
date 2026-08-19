import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Storely — نصمّم مستقبل الإدارة الذكية لكل منشأة تطمح للنمو',
  description: 'من المخزون والمشتريات، لصفحة عرض منتجاتك والحجوزات الإلكترونية، وإدارة الموظفين والفروع — كل شي بمكان واحد. يبدأ من 149 ر.س شهرياً.',
  keywords: 'نظام مخزون, إدارة مخزون, منيو إلكتروني, حجز طاولات, إدارة أعمال, واتساب مخزون, storely',
  openGraph: {
    title: 'Storely — نصمّم مستقبل الإدارة الذكية لكل منشأة تطمح للنمو',
    description: 'من المخزون والمشتريات، لصفحة عرض منتجاتك والحجوزات الإلكترونية، وإدارة الموظفين والفروع — كل شي بمكان واحد',
    locale: 'ar_SA',
    type: 'website',
    url: 'https://storely.dev',
    siteName: 'Storely',
    images: [{ url: 'https://storely.dev/storely-logo.png', width: 512, height: 512, alt: 'Storely' }],
  },
  twitter: {
    card: 'summary',
    title: 'Storely — نصمّم مستقبل الإدارة الذكية لكل منشأة تطمح للنمو',
    description: 'من المخزون والمشتريات، لصفحة عرض منتجاتك والحجوزات الإلكترونية، وإدارة الموظفين والفروع — كل شي بمكان واحد',
    images: ['https://storely.dev/storely-logo.png'],
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
