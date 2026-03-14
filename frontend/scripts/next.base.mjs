const nextBaseConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  turbopack: {
    resolveAlias: {
      "@sigongcore/ui": "./packages/ui/src/index.ts",
      "@sigongcore/features": "./packages/features/src/index.ts",
      "@sigongcore/platform": "./packages/platform/src/index.ts",
      "@sigongcore/api": "./packages/api/src/index.ts",
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@sigongcore/ui": new URL("../packages/ui/src/index.ts", import.meta.url).pathname,
      "@sigongcore/features": new URL("../packages/features/src/index.ts", import.meta.url).pathname,
      "@sigongcore/platform": new URL("../packages/platform/src/index.ts", import.meta.url).pathname,
      "@sigongcore/api": new URL("../packages/api/src/index.ts", import.meta.url).pathname,
    };
    return config;
  },
  output: "standalone",
  transpilePackages: ["@sigongcore/ui", "@sigongcore/features", "@sigongcore/platform", "@sigongcore/api"],
};

export default nextBaseConfig;
