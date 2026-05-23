export const SIGNUP_FEE_KOBO = 500000;
export const SIGNUP_FEE_CURRENCY = "NGN";

export function signupFeeNaira() {
  return SIGNUP_FEE_KOBO / 100;
}
