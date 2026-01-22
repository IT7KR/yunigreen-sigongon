import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@yunigreen/ui", "@yunigreen/api", "@yunigreen/types"],
  typescript: {
    ignoreBuildErrors: false,
  },
  turbopack: {},
}

export default nextConfig
