import { ToastContainer } from '@/components/toast'
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Storely — نظام إدارة المخزون",
  description: "نظام إدارة المخزون الاحترافي",
  manifest: "/manifest.json",
  appleWebApp: { capable:true, statusBarStyle:"default", title:"Storely" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
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
        {children}
      </body>
    </html>
  )
}
