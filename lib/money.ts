export const CREDITS_PER_USD_HALF = 100;
export const USD_HALF_VALUE = 0.5;
export const NAIRA_PER_USD = 1000;

export type ConversionRate = {
  creditsPerUnit: number;
  ngnPerUsd: number;
  usdPerUnit: number;
};

export const defaultConversionRate: ConversionRate = {
  creditsPerUnit: CREDITS_PER_USD_HALF,
  ngnPerUsd: NAIRA_PER_USD,
  usdPerUnit: USD_HALF_VALUE,
};

function validRate(rate?: ConversionRate) {
  if (!rate) return defaultConversionRate;

  return {
    creditsPerUnit: rate.creditsPerUnit > 0 ? rate.creditsPerUnit : defaultConversionRate.creditsPerUnit,
    ngnPerUsd: rate.ngnPerUsd > 0 ? rate.ngnPerUsd : defaultConversionRate.ngnPerUsd,
    usdPerUnit: rate.usdPerUnit > 0 ? rate.usdPerUnit : defaultConversionRate.usdPerUnit,
  };
}

export function getUsdPerCredit(rate?: ConversionRate) {
  const selected = validRate(rate);
  return selected.usdPerUnit / selected.creditsPerUnit;
}

export function getNgnPerCredit(rate?: ConversionRate) {
  const selected = validRate(rate);
  return getUsdPerCredit(selected) * selected.ngnPerUsd;
}

export function creditsToUsd(credits: number, rate?: ConversionRate) {
  return credits * getUsdPerCredit(rate);
}

export function creditsToNaira(credits: number, rate?: ConversionRate) {
  return credits * getNgnPerCredit(rate);
}

export function usdToCredits(usd: number, rate?: ConversionRate) {
  return usd / getUsdPerCredit(rate);
}

export function nairaToCredits(naira: number, rate?: ConversionRate) {
  return naira / getNgnPerCredit(rate);
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
