import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'تقرير المحاسب — Storely',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return children
}
