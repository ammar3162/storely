import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: '.' },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
};

export default nextConfig;
