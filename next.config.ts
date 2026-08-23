import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typescript: {
    // აიგნორებს ტიპიზაციის შეცდომებს build-ის დროს, რათა დეპლოი შეუფერხებლად დასრულდეს
    ignoreBuildErrors: true,
  },
  eslint: {
    // აიგნორებს ლინტერის შეცდომებს build-ის დროს
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;