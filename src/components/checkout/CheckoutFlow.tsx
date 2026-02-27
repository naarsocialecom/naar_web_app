"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "./LoginModal";
import AddressMap from "./AddressMap";
import {
  getAddresses,
  getCheckoutEstimate,
  createOrder,
  cancelOrder,
  getUserDetails,
} from "@/lib/api-client";
import { ENV } from "@/lib/env";
import type { Product, ProductVariant } from "@/types/product";
import type { Address, CheckoutEstimate } from "@/types/api";

const DEFAULT_LABELS: Record<string, string> = {
  productPrice: "Sub Total",
  shipping: "Shipping",
  gst: "GST",
  platformFees: "Platform Fees",
  discount: "Coupon Discount",
};

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(n);
}

function EstimateBreakdown({ estimate }: { estimate: CheckoutEstimate }) {
  const keys = estimate.labels
    ? Object.keys(estimate.labels).filter((k) => k !== "total")
    : Object.keys(DEFAULT_LABELS);
  const currency = "INR ";
  return (
    <div className="space-y-1.5 text-sm border-t border-[var(--border-light)] pt-3">
      {keys.map((key) => {
        const label = estimate.labels?.[key] ?? DEFAULT_LABELS[key] ?? key;
        const value = ((estimate as unknown) as Record<string, unknown>)[key] as number | undefined ?? 0;
        const isShipping = key === "shipping";
        const isLogisticsFree = isShipping && estimate.isLogisticsFree;
        if (value === 0 && !isShipping && key !== "productPrice") return null;
        if (isShipping && value === 0 && !isLogisticsFree) return null;
        const isDiscount = key === "discount";
        const strikeValue = isLogisticsFree && (estimate.estimateLogisticsPrice ?? estimate.shipping) > 0
          ? estimate.estimateLogisticsPrice ?? estimate.shipping
          : null;
        return (
          <div key={key} className="flex justify-between items-center">
            <span className="text-[var(--text-muted)]">{label}</span>
            <span>
              {isLogisticsFree && strikeValue != null ? (
                <>
                  <span className="text-[var(--text-muted-light)] line-through mr-1.5">
                    {currency}{formatINR(strikeValue)}
                  </span>
                  <span className="font-medium text-green-600">FREE</span>
                </>
              ) : (
                <span className={isDiscount ? "text-green-600" : ""}>
                  {isDiscount ? "(-) " : ""}{currency}{formatINR(value)}
                </span>
              )}
            </span>
          </div>
        );
      })}
      <div className="flex justify-between font-bold text-black pt-2 border-t border-[var(--border-light)] mt-2">
        <span>Total</span>
        <span>{currency}{formatINR(estimate.total)}</span>
      </div>
    </div>
  );
}

type Step = "idle" | "login" | "address" | "address-map" | "confirm" | "payment" | "success";

function getProductImageUrl(imgBase: string, fileName: string): string {
  if (!imgBase || !fileName) return "";
  return `${imgBase}${imgBase.endsWith("/") ? "" : "/"}uploads/products/${fileName}`;
}

interface CheckoutFlowProps {
  product: Product;
  selectedVariant: ProductVariant;
  quantity: number;
  imgBase?: string;
  onClose: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  timeout?: number;
  modal?: { ondismiss?: () => void; escape?: boolean };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: () => void) => void;
}

function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(!!window.Razorpay);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutFlow({
  product,
  selectedVariant,
  quantity,
  imgBase = "",
  onClose,
}: CheckoutFlowProps) {
  const { isAuthenticated, user, loginPhone, login, requestOtp, refreshUser, logout } = useAuth();
  const orderCacheRef = useRef<Record<string, { orderId: string; razorpayOrderId: string; expiryTime: string }>>({});
  const [step, setStep] = useState<Step>("idle");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [estimate, setEstimate] = useState<CheckoutEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const productId = product._id || "";
  const productVariantId = selectedVariant?._id || selectedVariant?.variantOption || "";
  const [initialized, setInitialized] = useState(false);

  const fetchAddresses = useCallback(async () => {
    try {
      const list = await getAddresses();
      setAddresses(list as unknown as Address[]);
      const def = list.find((a) => (a as Record<string, unknown>).isDefault);
      if (def) setSelectedAddress(def as unknown as Address);
      else if (list.length) setSelectedAddress(list[0] as unknown as Address);
    } catch (err) {
      setAddresses([]);
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
        logout();
        setStep("login");
      }
    }
  }, [logout]);

  const routeAfterUserCheck = useCallback(
    async () => {
      try {
        const res = await getUserDetails();
        if (res?.data?.userId) {
          await refreshUser();
        }
      } catch {
      }
      setStep("address");
      fetchAddresses();
    },
    [refreshUser, fetchAddresses]
  );

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      if (!isAuthenticated) {
        setStep("login");
        return;
      }
      routeAfterUserCheck();
    }
  }, [initialized, isAuthenticated, routeAfterUserCheck]);

  const fetchEstimate = useCallback(
    async (addressId: string) => {
      if (!addressId) return;
      setLoading(true);
      setError("");
      try {
        const est = await getCheckoutEstimate({
          productDetails: [
            { productId, productVariantId, quantity },
          ],
          addressId,
          logisticsChoice: "hyperlocal",
        });
        setEstimate(est);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to get estimate";
        setError(msg);
        setEstimate(null);
        if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
          logout();
          setStep("login");
        }
      } finally {
        setLoading(false);
      }
    },
    [productId, productVariantId, quantity, logout]
  );

  useEffect(() => {
    if (selectedAddress?._id) fetchEstimate(selectedAddress._id);
  }, [selectedAddress?._id, fetchEstimate]);

  useEffect(() => {
    if (!isAuthenticated) {
      orderCacheRef.current = {};
    }
  }, [isAuthenticated]);

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      setStep("login");
      return;
    }
    setStep("address");
    fetchAddresses();
  };

  const handleLoginSuccess = () => {
    routeAfterUserCheck();
  };

  const handleAddressCreated = (addr: Address) => {
    setAddresses((a) => [addr, ...a]);
    setSelectedAddress(addr);
    setStep("confirm");
  };

  const handlePlaceOrder = async () => {
    if (!estimate || !selectedAddress) return;
    setLoading(true);
    setError("");
    const cacheKey = `order_${estimate.quoteId}`;

    const cleanupOrder = async (orderId: string) => {
      try {
        await cancelOrder(orderId);
      } catch {}
      delete orderCacheRef.current[cacheKey];
    };

    try {
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        setError("Payment gateway could not be loaded");
        setLoading(false);
        return;
      }

      let orderData: { orderId: string; razorpayOrderId: string; expiryTime: string };
      const cached = orderCacheRef.current[cacheKey];

      if (cached && new Date() < new Date(cached.expiryTime)) {
        orderData = cached;
      } else {
        orderData = await createOrder(estimate.quoteId);
        orderCacheRef.current[cacheKey] = orderData;
      }

      const { orderId, razorpayOrderId, expiryTime } = orderData;
      if (!orderId || !razorpayOrderId) {
        setError("Invalid order response");
        setLoading(false);
        return;
      }

      const expiryMs = new Date(expiryTime).getTime() - Date.now();
      const timeoutInSeconds = Math.max(0, Math.floor(expiryMs / 1000));

      if (timeoutInSeconds <= 0) {
        await cleanupOrder(orderId);
        setError("Order expired. Please try again.");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: ENV.RAZORPAY_KEY,
        amount: Math.round(estimate.total * 100),
        currency: "INR",
        order_id: razorpayOrderId,
        name: "Naar Ecommerce Platform",
        description: `Order valid till ${expiryTime}`,
        prefill: {
          name: user?.name || user?.userName || "",
          contact: user?.phoneNumber || "",
          email: "",
        },
        theme: { color: "#1F1D2B" },
        timeout: timeoutInSeconds,
        modal: {
          escape: false,
          ondismiss: () => {
            cleanupOrder(orderId);
            setError("Payment cancelled.");
            setLoading(false);
          },
        },
        handler: () => {
          delete orderCacheRef.current[cacheKey];
          setStep("success");
          setLoading(false);
        },
      });

      rzp.on("payment.failed", () => {
        cleanupOrder(orderId);
        setError("Payment failed. Please try again.");
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
      setLoading(false);
    }
  };

  if (step === "idle") return null;

  const userPhone = (user?.phoneNumber || loginPhone || "").trim();

  if (step === "login" || ((step === "address" || step === "address-map") && !userPhone)) {
    return (
      <LoginModal
        onSuccess={handleLoginSuccess}
        onClose={onClose}
        requestOtp={requestOtp}
        login={login}
      />
    );
  }

  if (step === "address" || step === "confirm") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-light)] overflow-auto">
        <div className="flex-shrink-0 p-4 flex items-center justify-between bg-white border-b border-[var(--border-light)]">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-card)]"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-black">Checkout</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-card)]"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
          <div>
            <h3 className="font-bold text-black mb-3">Delivery address</h3>
            {addresses.length === 0 ? (
              <button
                type="button"
                onClick={() => setStep("address-map")}
                className="w-full p-5 rounded-xl border-2 border-dashed border-[var(--border-light)] flex flex-col items-center justify-center gap-2 hover:border-black/30 hover:bg-[var(--bg-card)] transition-colors text-center"
              >
                <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-semibold text-black">Add address</span>
                <span className="text-sm text-[var(--text-muted)]">Tap to add on map</span>
              </button>
            ) : (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <button
                    key={addr._id}
                    type="button"
                    onClick={() => setSelectedAddress(addr)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                      selectedAddress?._id === addr._id
                        ? "border-black bg-[var(--bg-card)]"
                        : "border-[var(--border-light)] hover:border-black/30"
                    }`}
                  >
                    <p className="font-medium text-black">
                      {addr.addressLine1}
                      {addr.addressLine2 && `, ${addr.addressLine2}`}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {addr.city}, {addr.state} {addr.pincode}
                    </p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setStep("address-map")}
                  className="w-full py-3 rounded-xl border-2 border-[var(--border-light)] font-semibold text-black hover:border-black/30 hover:bg-[var(--bg-card)] transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add new address
                </button>
              </div>
            )}
          </div>

          {selectedAddress && (
            <div className="p-4 rounded-xl bg-white border border-[var(--border-light)]">
              <h3 className="font-bold text-black mb-3">Order summary</h3>
              <div className="flex gap-3 mb-3">
                <div className="relative w-16 h-16 rounded-lg bg-[var(--bg-card)] flex-shrink-0 overflow-hidden">
                  {(() => {
                    const content = product.content || [];
                    const firstFile = content[0]?.fileName;
                    const imgSrc = firstFile ? getProductImageUrl(imgBase, firstFile) : "";
                    return imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt={product.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                        unoptimized={imgSrc.startsWith("http")}
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--bg-card)]" />
                    );
                  })()}
                </div>
                <div>
                  <p className="font-medium text-black">{product.title}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {selectedVariant?.variantOption} × {quantity}
                  </p>
                </div>
              </div>
              {loading && !estimate && <p className="text-sm text-[var(--text-muted)]">Fetching estimate...</p>}
              {estimate && (
                <EstimateBreakdown estimate={estimate} />
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={!selectedAddress || !estimate || loading}
            className="w-full py-3 rounded-full bg-[var(--accent)] text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? "Processing..." : `Pay INR ${estimate?.total ?? 0}`}
          </button>
        </div>
      </div>
    );
  }

  if (step === "address-map") {
    return (
      <AddressMap
        userPhone={userPhone}
        hasUserRecord={!!user?.userId}
        userName={user?.name || user?.userName}
        onUserCreated={refreshUser}
        onAddressCreated={(addr: Address) => {
          setAddresses((a) => [addr, ...a]);
          setSelectedAddress(addr);
          setStep("confirm");
        }}
        onBack={() => setStep(addresses.length > 0 ? "confirm" : "address")}
      />
    );
  }

  if (step === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="max-w-sm w-full rounded-2xl bg-[var(--bg-light)] p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--accent)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-black mb-2">Order placed!</h2>
          <p className="text-[var(--text-muted)] mb-2">Thank you for your order.</p>
          <p className="text-sm text-[var(--text-muted)] mb-4">You can track your order on the Naar app.</p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-full bg-[var(--accent)] text-black font-bold"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
}
