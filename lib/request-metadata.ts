import "server-only";

function cleanHeader(value: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function firstForwardedIp(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function getTrustedClientIp(requestHeaders: Headers) {
  // Prefer proxy-provided headers; x-forwarded-for is only a final fallback.
  return (
    cleanHeader(requestHeaders.get("cf-connecting-ip")) ??
    cleanHeader(requestHeaders.get("true-client-ip")) ??
    cleanHeader(requestHeaders.get("x-real-ip")) ??
    firstForwardedIp(requestHeaders.get("x-forwarded-for"))
  );
}

export function getTrustedCountryCode(requestHeaders: Headers) {
  // Cloudflare and Vercel are the expected production country sources.
  const country =
    cleanHeader(requestHeaders.get("cf-ipcountry")) ??
    cleanHeader(requestHeaders.get("x-vercel-ip-country")) ??
    cleanHeader(requestHeaders.get("x-country-code"));

  return country?.toUpperCase() ?? null;
}
