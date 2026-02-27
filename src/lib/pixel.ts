declare global {
  interface Window {
    fbq?: (action: string, event: string, params?: Record<string, unknown>) => void;
  }
}

export function trackInitiateCheckout(params: {
  productId: string;
  productName: string;
  value: number;
  currency?: string;
  quantity?: number;
}) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "InitiateCheckout", {
      content_ids: [params.productId],
      content_name: params.productName,
      content_type: "product",
      value: params.value,
      currency: params.currency ?? "INR",
      num_items: params.quantity ?? 1,
    });
  }
}

export function trackPurchase(params: {
  productId: string;
  productName: string;
  value: number;
  currency?: string;
  quantity?: number;
}) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Purchase", {
      content_ids: [params.productId],
      content_name: params.productName,
      content_type: "product",
      value: params.value,
      currency: params.currency ?? "INR",
      num_items: params.quantity ?? 1,
    });
  }
}
