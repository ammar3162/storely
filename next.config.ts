import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // رقم النسخة — صفحات الموظف تقارنه بالسيرفر وتحدّث نفسها لما ننشر نسخة جديدة
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  outputFileTracingIncludes: {
    '/api/admin/send-invoice': ['./node_modules/@sparticuz/chromium/bin/**'],
  },
  // حماية المتصفح: ما أحد يقدر يضمّن الموقع داخل موقع ثاني (خداع النقر)، والمتصفح ما يخمّن نوع الملفات،
  // والروابط الخارجية ما تشوف المسار الكامل، والاتصال دايماً مشفّر
  async headers() {
    return [{
      // الخطوط ما تتغير (لو تغيّرت نغيّر اسم الملف) — تنحفظ في المتصفح سنة
      source: '/fonts/:file*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    }, {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()' },
      ],
    }];
  },
};

export default withSentryConfig(nextConfig, {
  org: "ammar3162",
  project: "storely",
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
