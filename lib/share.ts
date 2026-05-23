export const SHARE_HASHTAGS = ["#ByteEarn", "#EarnFromContent", "#CreatorRewards", "#SocialEarning"];

export function buildReferralUrl(referralCode: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://appdomain.com";
  return `${appUrl.replace(/\/$/, "")}/ref/${encodeURIComponent(referralCode)}`;
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
