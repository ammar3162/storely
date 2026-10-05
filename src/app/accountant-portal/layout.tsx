import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'بوابة المحاسب — Storely',
  robots: { index: false, follow: false },
}

export default function AccountantPortalLayout({ children }: { children: React.ReactNode }) {
  return children
}
