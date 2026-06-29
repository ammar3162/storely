import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Storely — موظف',
  manifest: '/staff-manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Storely Staff' },
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
