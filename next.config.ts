import type { NextConfig } from "next";

/** Sous GitHub Pages projet : /mcu-roadmap — en local : "" */
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  (process.env.GITHUB_ACTIONS === "true" ? "/mcu-roadmap" : "");

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
