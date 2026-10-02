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
};

export default withSentryConfig(nextConfig, {
  org: "ammar3162",
  project: "storely",
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
