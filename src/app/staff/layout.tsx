import type { Metadata } from 'next'

export function generateMetadata(): Metadata {
  return {
    title: 'Storely — موظف',
    manifest: '/staff-manifest.json',
    appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Storely Staff' },
    other: {
      'mobile-web-app-capable': 'yes',
    },
  }
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return children
}
