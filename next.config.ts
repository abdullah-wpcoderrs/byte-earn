import type { NextConfig } from "next";

const extraDevOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  // The app lives in this directory; pin the tracing root here so the
  // stray lockfile in the parent home folder does not get treated as the
  // workspace root (silences the multi-lockfile startup warning).
  outputFileTracingRoot: __dirname,
  allowedDevOrigins: ["localhost", "127.0.0.1", "0.0.0.0", ...extraDevOrigins],
  experimental: {
    serverActions: {
      bodySizeLimit: "125mb",
    },
  },
};

export default nextConfig;
