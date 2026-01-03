import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@yunigreen/ui", "@yunigreen/api", "@yunigreen/types"],
}

export default nextConfig
