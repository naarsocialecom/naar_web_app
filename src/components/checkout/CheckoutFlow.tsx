"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "./LoginModal";
import AddressMap from "./AddressMap";
import {
  getAddresses,
  getCheckoutEstimate,
  createOrder,
} from "@/lib/api-client";
import { ENV } from "@/lib/env";
import type { Product, ProductVariant } from "@/types/product";
import type { Address, CheckoutEstimate } from "@/types/api";

type Step = "idle" | "login" | "address" | "address-map" | "confirm" | "payment" | "success";

interface CheckoutFlowProps {
  product: Product;
  selectedVariant: ProductVariant;
  quantity: number;
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
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
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
  onClose,
}: CheckoutFlowProps) {
  const { isAuthenticated, user, login, requestOtp } = useAuth();
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
    } catch {
      setAddresses([]);
    }
  }, []);

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      if (!isAuthenticated) setStep("login");
      else {
        setStep("address");
        fetchAddresses();
      }
    }
  }, [initialized, isAuthenticated, fetchAddresses]);

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
        setError(err instanceof Error ? err.message : "Failed to get estimate");
        setEstimate(null);
      } finally {
        setLoading(false);
      }
    },
    [productId, productVariantId, quantity]
  );

  useEffect(() => {
    if (selectedAddress?._id) fetchEstimate(selectedAddress._id);
  }, [selectedAddress?._id, fetchEstimate]);

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      setStep("login");
      return;
    }
    setStep("address");
    fetchAddresses().then(() => {
      // If no addresses, AddressMap will show via the condition below
    });
  };

  const handleLoginSuccess = () => {
    setStep("address");
    fetchAddresses();
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
    try {
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        setError("Payment gateway could not be loaded");
        return;
      }
      const { orderId, razorpayOrderId } = await createOrder(estimate.quoteId);
      const rzp = new window.Razorpay({
        key: ENV.RAZORPAY_KEY,
        amount: Math.round(estimate.total * 100),
        currency: "INR",
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name || user?.userName || "",
          contact: user?.phoneNumber || "",
        },
        theme: { color: "#3ff0ff" },
        handler: () => {
          setStep("success");
        },
      });
      rzp.on("payment.failed", () => {
        setError("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  if (step === "idle") return null;

  if (step === "login") {
    return (
      <LoginModal
        onSuccess={handleLoginSuccess}
        onClose={onClose}
        requestOtp={requestOtp}
        login={login}
      />
    );
  }

  if (step === "address" && addresses.length === 0) {
    return (
      <AddressMap
        userPhone={user?.phoneNumber || ""}
        userName={user?.name || user?.userName}
        onAddressCreated={handleAddressCreated}
        onBack={onClose}
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-black">Delivery address</h3>
              <button
                type="button"
                onClick={() => setStep("address-map")}
                className="text-sm font-medium text-black hover:underline"
              >
                {addresses.length ? "Add new" : "Add on map"}
              </button>
            </div>
            {addresses.length === 0 ? (
              <div className="p-4 rounded-xl border-2 border-dashed border-[var(--border-light)] text-center text-[var(--text-muted)]">
                No address added yet
              </div>
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
              </div>
            )}
            {addresses.length > 0 && (
              <button
                type="button"
                onClick={() => setStep("address-map")}
                className="mt-2 text-sm text-[var(--text-muted)] hover:text-black"
              >
                + Add new address on map
              </button>
            )}
          </div>

          {selectedAddress && (
            <div className="p-4 rounded-xl bg-white border border-[var(--border-light)]">
              <h3 className="font-bold text-black mb-3">Order summary</h3>
              <div className="flex gap-3 mb-3">
                <div className="w-16 h-16 rounded-lg bg-[var(--bg-card)] flex-shrink-0" />
                <div>
                  <p className="font-medium text-black">{product.title}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {selectedVariant?.variantOption} × {quantity}
                  </p>
                </div>
              </div>
              {loading && !estimate && <p className="text-sm text-[var(--text-muted)]">Fetching estimate...</p>}
              {estimate && (
                <div className="space-y-1 text-sm border-t border-[var(--border-light)] pt-3">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Product</span>
                    <span>₹{estimate.productPrice}</span>
                  </div>
                  {estimate.shipping > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Shipping</span>
                      <span>₹{estimate.shipping}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-black pt-2">
                    <span>Total</span>
                    <span>₹{estimate.total}</span>
                  </div>
                </div>
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
            {loading ? "Processing..." : `Pay ₹${estimate?.total ?? 0}`}
          </button>
        </div>
      </div>
    );
  }

  if (step === "address-map") {
    return (
      <AddressMap
        userPhone={user?.phoneNumber || ""}
        userName={user?.name || user?.userName}
        onAddressCreated={(addr) => {
          setAddresses((a) => [addr, ...a]);
          setSelectedAddress(addr);
          setStep("confirm");
        }}
        onBack={() => setStep(addresses.length > 0 ? "confirm" : "idle")}
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
          <p className="text-[var(--text-muted)] mb-4">Thank you for your order.</p>
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
