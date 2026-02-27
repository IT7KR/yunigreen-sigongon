const nextBaseConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  turbopack: {},
  output: "standalone",
  transpilePackages: ["@sigongon/ui", "@sigongon/features"],
};

export default nextBaseConfig;
