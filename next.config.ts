import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  typescript: {
    // Type safety is enforced by `pnpm typecheck` in CI/build scripts.
    ignoreBuildErrors: false,
  },
  images: {
    // Local, self-hosted uploads only; remote images are not used.
    remotePatterns: [],
  },
};

export default config;
