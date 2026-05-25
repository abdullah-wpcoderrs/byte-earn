import type { NextConfig } from "next";

const extraDevOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "0.0.0.0", ...extraDevOrigins],
};

export default nextConfig;
