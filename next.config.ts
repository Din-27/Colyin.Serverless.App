import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["dockerode", "ssh2"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
