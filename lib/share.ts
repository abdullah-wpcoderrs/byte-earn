export const SHARE_HASHTAGS = ["#ByteEarn", "#EarnFromContent", "#CreatorRewards", "#SocialEarning"];

function resolveAppUrl(appUrl?: string) {
  if (appUrl) {
    return appUrl;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

export function buildReferralUrl(referralCode: string, appUrl?: string) {
  const resolvedAppUrl = resolveAppUrl(appUrl).replace(/\/$/, "");
  const referralPath = `/ref/${encodeURIComponent(referralCode)}`;
  return resolvedAppUrl ? `${resolvedAppUrl}${referralPath}` : referralPath;
}

export function buildShareCaption(referralCode: string) {
  const referralUrl = buildReferralUrl(referralCode);

  return [
    "I am earning from posts, referrals, sponsored tasks, and watch-time on byte-earn.",
    "Join through my referral link:",
    referralUrl,
    SHARE_HASHTAGS.join(" "),
  ].join("\n\n");
}
