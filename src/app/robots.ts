import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard', '/storely-admin', '/api',
        '/reports', '/settings', '/suppliers', '/suppliers-join',
        '/inventory', '/purchases', '/notifications', '/staff-management',
        '/ai-tools', '/dispense', '/staff',
        '/reset-password', '/reset-password-wa',
        '/onboarding', '/pending', '/expired',
      ],
    },
    sitemap: 'https://storely.dev/sitemap.xml',
  }
}
