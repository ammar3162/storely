import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Storely | نظام إدارة التشغيل للمطاعم والكافيهات — مخزون وكاشير وموظفين',
  description: 'أدر مطعمك أو محلك من مكان واحد: المخزون، الكاشير، المشتريات، رواتب الموظفين، والربط مع محاسبك والفواتير الضريبية.',
  keywords: 'نظام إدارة تشغيل, برنامج مطاعم, برنامج كاشير, نظام مخزون, إدارة مخزون, برنامج محاسبة مطاعم, رواتب الموظفين, فاتورة ضريبية, منيو إلكتروني, storely',
  openGraph: {
    title: 'Storely | نظام إدارة التشغيل للمطاعم والكافيهات — مخزون وكاشير وموظفين',
    description: 'أدر مطعمك أو محلك من مكان واحد: المخزون، الكاشير، المشتريات، رواتب الموظفين، والربط مع محاسبك والفواتير الضريبية.',
    locale: 'ar_SA',
    type: 'website',
    url: 'https://storely.dev',
    siteName: 'Storely',
    images: [{ url: 'https://storely.dev/storely-logo.png', width: 512, height: 512, alt: 'Storely' }],
  },
  twitter: {
    card: 'summary',
    title: 'Storely | نظام إدارة التشغيل للمطاعم والكافيهات — مخزون وكاشير وموظفين',
    description: 'أدر مطعمك أو محلك من مكان واحد: المخزون، الكاشير، المشتريات، رواتب الموظفين، والربط مع محاسبك والفواتير الضريبية.',
    images: ['https://storely.dev/storely-logo.png'],
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
