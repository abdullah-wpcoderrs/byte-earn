export const CREDITS_PER_USD_HALF = 100;
export const USD_HALF_VALUE = 0.5;
export const NAIRA_PER_USD = 1000;

export function creditsToUsd(credits: number) {
  return (credits / CREDITS_PER_USD_HALF) * USD_HALF_VALUE;
}

export function creditsToNaira(credits: number) {
  return creditsToUsd(credits) * NAIRA_PER_USD;
}

export function usdToCredits(usd: number) {
  return (usd / USD_HALF_VALUE) * CREDITS_PER_USD_HALF;
}

export function nairaToCredits(naira: number) {
  return usdToCredits(naira / NAIRA_PER_USD);
}

export function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}
