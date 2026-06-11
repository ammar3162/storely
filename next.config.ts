import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
};

export default nextConfig;
