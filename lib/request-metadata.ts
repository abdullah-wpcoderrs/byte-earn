import "server-only";

function cleanHeader(value: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function firstForwardedIp(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function configuredTrustedHeader(requestHeaders: Headers, envName: string) {
  const headerName = process.env[envName]?.trim().toLowerCase();
  return headerName ? cleanHeader(requestHeaders.get(headerName)) : null;
}

export function getTrustedClientIp(requestHeaders: Headers) {
  const configuredIp = configuredTrustedHeader(requestHeaders, "TRUSTED_CLIENT_IP_HEADER");
  if (configuredIp) return configuredIp;

  if (process.env.NODE_ENV === "production") {
    return (
      cleanHeader(requestHeaders.get("cf-connecting-ip")) ??
      cleanHeader(requestHeaders.get("true-client-ip")) ??
      firstForwardedIp(requestHeaders.get("x-vercel-forwarded-for"))
    );
  }

  return (
    cleanHeader(requestHeaders.get("cf-connecting-ip")) ??
    cleanHeader(requestHeaders.get("true-client-ip")) ??
    cleanHeader(requestHeaders.get("x-real-ip")) ??
    firstForwardedIp(requestHeaders.get("x-forwarded-for"))
  );
}

export function getTrustedCountryCode(requestHeaders: Headers) {
  const configuredCountry = configuredTrustedHeader(requestHeaders, "TRUSTED_COUNTRY_HEADER");
  const country = configuredCountry ??
    cleanHeader(requestHeaders.get("cf-ipcountry")) ??
    cleanHeader(requestHeaders.get("x-vercel-ip-country"));

  return country?.toUpperCase() ?? null;
}
