const nextBaseConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  turbopack: {
    resolveAlias: {
      "@sigongcore/ui": "./packages/ui/src/index.ts",
      "@sigongcore/features": "./packages/features/src/index.ts",
      "@sigongcore/platform": "./packages/platform/src/index.ts",
    },
  },
  output: "standalone",
  transpilePackages: ["@sigongcore/ui", "@sigongcore/features", "@sigongcore/platform"],
};

export default nextBaseConfig;
