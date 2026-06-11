import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
