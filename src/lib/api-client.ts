import { ENV } from "./env";
import { NAAR_HEADERS } from "./api-headers";
import type { Product } from "@/types/product";

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
  } catch {}
  return localStorage.getItem("naar_id_token");
}

export async function apiClient<T = unknown>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  auth = false,
  commerce = true,
  init?: RequestInit
): Promise<T> {
  const baseUrl =
    path.startsWith("/api/") ? "" : commerce ? ENV.API_URL_COMMERCIAL : ENV.API_URL_SOCIAL;
  const url = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...NAAR_HEADERS,
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
    ...init,
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

export async function createUser(data: { name: string; onboarding?: Record<string, string>; deviceId?: string }): Promise<unknown> {
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

export async function getProduct(productId: string): Promise<Product> {
  return apiClient<Product>(
    "GET",
    `/products/${productId}`,
    undefined,
    false,
    true,
    { next: { revalidate: 60 } }
  );
}

export async function geocodeSearch(query: string): Promise<{ results: Array<{ lat: number; lon: number; display_name: string }> }> {
  return apiClient("GET", `/api/geocode/search?q=${encodeURIComponent(query)}`, undefined, false, true);
}

export async function geocodeReverse(lat: number, lon: number): Promise<{ city: string; state: string; pincode: string; area: string }> {
  return apiClient("GET", `/api/geocode/reverse?lat=${lat}&lng=${lon}`, undefined, false, true);
}

export async function linkClick(body: { link: string; deviceId: string; platform: string; campaignInfo?: Record<string, string> }, auth: boolean): Promise<void> {
  await apiClient("POST", "/api/linkClick", body, auth, true);
}

export async function logLinkClick(referrer?: string): Promise<void> {
  const { getCampaignFromURL, hasCampaignInfo, getDeviceId } = await import("@/lib/campaign");
  const campaign = getCampaignFromURL(referrer);
  if (!hasCampaignInfo(campaign)) return;
  const info = { ...campaign };
  delete info.platform;
  const link = referrer && referrer.startsWith("http") ? referrer : (typeof window !== "undefined" ? window.location.href : "");
  const token = await getAuthToken();
  try {
    await linkClick(
      { link, deviceId: getDeviceId(), platform: "web", campaignInfo: info },
      !!token?.replace(/^Bearer\s+/i, "").trim()
    );
  } catch {}
}

export async function linkDeviceToUser(): Promise<void> {
  const { getDeviceId } = await import("@/lib/campaign");
  try {
    await linkClick({ link: "", deviceId: getDeviceId(), platform: "web" }, true);
  } catch {}
}
