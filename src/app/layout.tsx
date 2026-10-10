import { ToastContainer } from '@/components/toast'
import { ConfirmDialogContainer } from '@/components/ConfirmDialog'
import PWAInstall from '@/components/PWAInstall'
import FeatureAnnouncement from '@/components/FeatureAnnouncement'
import PullToRefresh from '@/components/PullToRefresh'
import ApiBridge from '@/components/ApiBridge'
import SpeedInsightsRoute from '@/components/SpeedInsightsRoute'
import DigitNormalizer from '@/components/DigitNormalizer'
import { IN_APP_SCRIPT } from '@/lib/inApp'
import type { Metadata } from "next"
import Script from "next/script"
// الخط من موقعنا نفسه بدل Google (أسرع — بدون اتصالات خارجية تعطّل الرسم). الخط أوزانه لين 700 بس
import "@fontsource/ibm-plex-sans-arabic/400.css"
import "@fontsource/ibm-plex-sans-arabic/500.css"
import "@fontsource/ibm-plex-sans-arabic/600.css"
import "@fontsource/ibm-plex-sans-arabic/700.css"
import "./globals.css"

export const metadata: Metadata = {
  title: "Storely — نحوّل التعقيد إلى تحكّم",
  description: "الكاشير، المخزون، المشتريات، الفروع، الموظفين، والمحاسب — مترابطة في مكان واحد. للمطاعم والكافيهات والبقالات والصيدليات والمستودعات والمتاجر.",
  manifest: "/manifest.json",
  appleWebApp: { capable:true, statusBarStyle:"default", title:"Storely" },
  icons: {
    icon: [
      { url: '/storely-favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: "Storely — نحوّل التعقيد إلى تحكّم",
    description: "الكاشير، المخزون، المشتريات، الفروع، الموظفين، والمحاسب — مترابطة في مكان واحد. للمطاعم والكافيهات والبقالات والصيدليات والمستودعات والمتاجر.",
    url: "https://www.storely.dev",
    siteName: "Storely",
    images: [{ url: "https://www.storely.dev/icon-192.png", width: 192, height: 192, alt: "Storely" }],
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Storely — نحوّل التعقيد إلى تحكّم",
    description: "الكاشير، المخزون، المشتريات، الفروع، الموظفين، والمحاسب — مترابطة في مكان واحد. للمطاعم والكافيهات والبقالات والصيدليات والمستودعات والمتاجر.",
    images: ["https://www.storely.dev/icon-192.png"],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: IN_APP_SCRIPT}}/>
        <meta name="theme-color" content="#042f2e"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="Storely"/>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
        <style dangerouslySetInnerHTML={{__html:`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
          body { font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif !important; direction: rtl; }
          input, button, select, textarea { font-family: inherit !important; }
          html[data-in-app] .hide-in-app { display: none !important; }
          html:not([data-in-app]) .show-in-app { display: none !important; }
        `}}/>
      </head>
      <body>
        <ApiBridge/>
        <DigitNormalizer/>
        <ToastContainer/>
        <ConfirmDialogContainer/>
        <PWAInstall/>
        <FeatureAnnouncement/>
        <PullToRefresh/>
        {children}
        {/* Vercel Speed Insights: قياس سرعة الصفحات عند العملاء الحقيقيين (سكربت Vercel الرسمي — بدون مكتبة إضافية).
            يشتغل بس على المشروع اللي مفعّلة فيه الخدمة، وغيره يتجاهله */}
        <SpeedInsightsRoute/>
      </body>
    </html>
  )
}
