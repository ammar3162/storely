import { ToastContainer } from '@/components/toast'
import PWAInstall from '@/components/PWAInstall'
import FeatureAnnouncement from '@/components/FeatureAnnouncement'
import PullToRefresh from '@/components/PullToRefresh'
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Storely — نظام إدارة المخزون",
  description: "نظام إدارة المخزون الاحترافي",
  manifest: "/manifest.json",
  appleWebApp: { capable:true, statusBarStyle:"default", title:"Storely" },
  icons: {
    icon: [
      { url: '/storely-icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="theme-color" content="#0d2818"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
        <style dangerouslySetInnerHTML={{__html:`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
          body { font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif !important; direction: rtl; }
          input, button, select, textarea { font-family: inherit !important; }
        `}}/>
      </head>
      <body>
        <ToastContainer/>
        <PWAInstall/>
        <FeatureAnnouncement/>
        <PullToRefresh/>
        {children}
      </body>
    </html>
  )
}
