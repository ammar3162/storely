import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Storely | نظام واحد يربط كل أعمال منشأتك',
  description: 'الكاشير، المخزون، المشتريات، الفروع، الموظفين، والمحاسب — مترابطة في مكان واحد. للمطاعم والكافيهات والبقالات والصيدليات والمستودعات والمتاجر.',
  keywords: 'نظام يربط كل أعمال المنشأة, نظام إدارة فروع, نظام إدارة تشغيل, برنامج مطاعم, برنامج كاشير, نظام مخزون, إدارة مخزون, برنامج محاسبة مطاعم, رواتب الموظفين, فاتورة ضريبية, منيو إلكتروني, storely',
  openGraph: {
    title: 'Storely | نظام واحد يربط كل أعمال منشأتك',
    description: 'الكاشير، المخزون، المشتريات، الفروع، الموظفين، والمحاسب — مترابطة في مكان واحد. للمطاعم والكافيهات والبقالات والصيدليات والمستودعات والمتاجر.',
    locale: 'ar_SA',
    type: 'website',
    url: 'https://storely.dev',
    siteName: 'Storely',
    images: [{ url: 'https://storely.dev/storely-logo.png', width: 512, height: 512, alt: 'Storely' }],
  },
  twitter: {
    card: 'summary',
    title: 'Storely | نظام واحد يربط كل أعمال منشأتك',
    description: 'الكاشير، المخزون، المشتريات، الفروع، الموظفين، والمحاسب — مترابطة في مكان واحد. للمطاعم والكافيهات والبقالات والصيدليات والمستودعات والمتاجر.',
    images: ['https://storely.dev/storely-logo.png'],
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
