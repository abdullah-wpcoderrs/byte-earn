export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
export const ACCOUNT_NUMBER_PATTERN = /^[0-9]{10}$/;

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "wallet",
  "feed",
  "tasks",
  "profile",
  "ref",
  "auth",
  "api",
  "notifications",
  "onboarding",
  "activate",
  "settings",
  "login",
  "logout",
  "signup",
  "register",
  "support",
  "help",
  "info",
  "contact",
]);

export type PayoutDetails = {
  accountName: string;
  accountNumber: string;
  bankName: string;
};

export type ValidationResult<TCode extends string, TValue> =
  | { ok: true; value: TValue }
  | { ok: false; code: TCode };

function normalizePayoutText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(
  value: string,
): ValidationResult<"invalid_username" | "reserved_username", string> {
  const normalized = normalizeUsername(value);

  if (!USERNAME_PATTERN.test(normalized)) {
    return { ok: false, code: "invalid_username" };
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    return { ok: false, code: "reserved_username" };
  }

  return { ok: true, value: normalized };
}

export function validatePayoutDetails(
  details: PayoutDetails,
): ValidationResult<"invalid_account_name" | "invalid_account_number" | "invalid_bank_name", PayoutDetails> {
  const bankName = normalizePayoutText(details.bankName);
  const accountNumber = details.accountNumber.trim();
  const accountName = normalizePayoutText(details.accountName);

  if (bankName.length < 2 || bankName.length > 100) {
    return { ok: false, code: "invalid_bank_name" };
  }

  if (!ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
    return { ok: false, code: "invalid_account_number" };
  }

  if (accountName.length < 2 || accountName.length > 100) {
    return { ok: false, code: "invalid_account_name" };
  }

  return {
    ok: true,
    value: {
      accountName,
      accountNumber,
      bankName,
    },
  };
}
