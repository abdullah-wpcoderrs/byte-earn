import { SIGNUP_FEE_CURRENCY } from "@/lib/config/pricing";

type PaystackInitializePayload = {
  amountKobo: number;
  callbackUrl: string;
  email: string;
  profileId: string;
  reference: string;
};

type PaystackInitializeResponse = {
  data?: {
    access_code?: string;
    authorization_url?: string;
  };
  message?: string;
  status: boolean;
};

type PaystackVerifyResponse = {
  data?: {
    amount?: number;
    currency?: string;
    paid_at?: string;
    reference?: string;
    status?: string;
  };
  message?: string;
  status: boolean;
};

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function getPaystackSecretKey() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is required.");
  }

  return secretKey;
}

export async function initializePaystackTransaction(payload: PaystackInitializePayload) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: payload.amountKobo.toString(),
      callback_url: payload.callbackUrl,
      currency: SIGNUP_FEE_CURRENCY,
      email: payload.email,
      metadata: {
        payment_type: "signup_activation",
        profile_id: payload.profileId,
      },
      reference: payload.reference,
    }),
  });

  const result = (await response.json()) as PaystackInitializeResponse;

  if (!response.ok || !result.status || !result.data?.authorization_url) {
    throw new Error(result.message ?? "Unable to initialize Paystack transaction.");
  }

  return result.data;
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
    },
  });

  const result = (await response.json()) as PaystackVerifyResponse;

  if (!response.ok || !result.status) {
    throw new Error(result.message ?? "Unable to verify Paystack transaction.");
  }

  return result.data;
}
