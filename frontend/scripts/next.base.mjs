const nextBaseConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  turbopack: {},
  output: "standalone",
  transpilePackages: ["@sigongcore/ui", "@sigongcore/features"],
};

export default nextBaseConfig;
