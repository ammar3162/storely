import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // رقم النسخة — صفحات الموظف تقارنه بالسيرفر وتحدّث نفسها لما ننشر نسخة جديدة
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
    // صفحات اللوحة قوالب ثابتة (الأرقام تجيها من /api)، فالصفحة المجهّزة مسبقاً تبقى صالحة 30 دقيقة بدل 5:
    // التنقل من الشريط السفلي يبقى فوري حتى لو بقى العميل في صفحة وحدة أكثر من 5 دقائق (قسناه: بعد 5 دقائق رجع 1.4 ثانية)،
    // وفحص الجلسة اللي يسأل قاعدة سيدني يتكرر أقل. البيانات نفسها ما تتأثر — كل صفحة تجيب أرقامها من جديد
    staleTimes: { static: 1800 },
  },
  // ما نستخدم next/image — نقفل خدمة تحسين الصور (/_next/image) كلها: أقل باب للهجمات (ثغرة SVG في 16.4.0)
  images: { unoptimized: true },
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
