export function isPaystackActivationEnabled() {
  return process.env.PAYSTACK_ACTIVATION_ENABLED === "true";
}
