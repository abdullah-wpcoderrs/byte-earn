import "server-only";

import { headers } from "next/headers";

function getConfiguredAppOrigin() {
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return undefined;
  }

  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
  } catch {
    return undefined;
  }
}

function getAllowedHosts() {
  return new Set(
    (process.env.ALLOWED_APP_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

function normalizeForwardedHost(host: string) {
  return host.split(",")[0]?.trim().toLowerCase();
}

export async function getRequestOrigin() {
  const configuredOrigin = getConfiguredAppOrigin();
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const requestHeaders = await headers();
  const host = normalizeForwardedHost(requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "");

  if (!host || !getAllowedHosts().has(host)) {
    return undefined;
  }

  return `https://${host}`;
}
