import { ENV } from "./env";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface ApiOptions {
  auth?: boolean;
  commerce?: boolean;
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const { getIdToken } = await import("@/lib/firebase");
    const fresh = await getIdToken();
    if (fresh) {
      localStorage.setItem("naar_id_token", fresh);
      return fresh;
    }
  } catch {
    // Firebase may not be ready or user signed out
  }
  return localStorage.getItem("naar_id_token");
}

export async function apiClient<T = unknown>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  auth = false,
  commerce = true
): Promise<T> {
  const baseUrl =
    path.startsWith("/api/") ? "" : commerce ? ENV.API_URL_COMMERCIAL : ENV.API_URL_SOCIAL;
  const url = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = await getAuthToken();
    const cleanToken = token?.replace(/^Bearer\s+/i, "").trim();
    if (cleanToken) {
      headers["Authorization"] = cleanToken;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.error || `Request failed: ${res.status}`);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function generateOtp(phoneWithCountryCode: string): Promise<{ status: string }> {
  return apiClient(
    "GET",
    `/api/auth/generateOtp?phoneNumber=${phoneWithCountryCode}`,
    undefined,
    false,
    true
  );
}

export async function verifyOtp(
  phoneWithCountryCode: string,
  otp: string
): Promise<{ status: string; token: string }> {
  return apiClient(
    "GET",
    `/api/auth/verifyOtp?phoneNumber=${phoneWithCountryCode}&otp=${otp}`,
    undefined,
    false,
    true
  );
}

export async function getUserDetails(): Promise<{ data?: { userId: string; [key: string]: unknown } }> {
  return apiClient("GET", "/api/auth/userDetails", undefined, true, true);
}

export async function createUser(data: { name: string }): Promise<unknown> {
  return apiClient("POST", "/api/auth/userDetails", data, true, true);
}

export async function getAddresses(): Promise<Array<Record<string, unknown> & { _id: string }>> {
  const res = await apiClient<{ data?: unknown[] } | unknown[]>("GET", "/api/addresses", undefined, true, true);
  const arr = Array.isArray(res) ? res : (res as { data?: unknown[] }).data || [];
  return arr as Array<Record<string, unknown> & { _id: string }>;
}

export async function createAddress(data: {
  addressNickName: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  location?: { type: "Point"; coordinates: [number, number] };
  plusCode?: string;
  isDefault: boolean;
  phone: string;
}): Promise<{ _id: string; [key: string]: unknown }> {
  return apiClient("POST", "/api/addresses", data, true, true);
}

export async function getCheckoutEstimate(body: {
  productDetails: Array<{ productId: string; productVariantId: string; quantity: number }>;
  addressId: string;
  couponCode?: string;
  couponId?: string;
  logisticsChoice: string;
}): Promise<{
  quoteId: string;
  productPrice: number;
  shipping: number;
  gst?: number;
  platformFees?: number;
  total: number;
  discount?: number;
}> {
  return apiClient("POST", "/api/checkout/estimate", body, true, true);
}

export async function createOrder(quoteId: string): Promise<{
  orderId: string;
  razorpayOrderId: string;
  expiryTime: string;
}> {
  return apiClient("POST", "/api/checkout/createOrder", { quoteId }, true, true);
}

export async function cancelOrder(orderId: string): Promise<void> {
  await apiClient("PUT", `/api/order/${orderId}/cancel`, undefined, true, true);
}
