"use client";

import { useState, useRef } from "react";

const COUNTRY_CODE = "+91";

interface LoginModalProps {
  onSuccess: () => void;
  onClose: () => void;
  requestOtp: (phone: string) => Promise<void>;
  login: (phone: string, otp: string) => Promise<void>;
}

export default function LoginModal({
  onSuccess,
  onClose,
  requestOtp,
  login,
}: LoginModalProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  const fullPhone = phone.startsWith("+") ? phone : `${COUNTRY_CODE}${phone.replace(/^0+/, "")}`;

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Enter a valid 10-digit number");
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    try {
      await requestOtp(fullPhone);
      setStep("otp");
      setOtp(["", "", "", ""]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (val.length > 1) {
      const arr = val.split("").slice(0, 4);
      const next = [...otp];
      arr.forEach((c, i) => {
        if (idx + i < 4) next[idx + i] = c;
      });
      setOtp(next);
      const last = Math.min(idx + arr.length, 3);
      if (last < 3) {
        const el = document.getElementById(`otp-${last + 1}`);
        el?.focus();
      } else {
        document.getElementById("otp-submit")?.focus();
      }
      return;
    }
    const next = [...otp];
    next[idx] = val.replace(/\D/g, "").slice(-1);
    setOtp(next);
    if (val && idx < 3) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
      const next = [...otp];
      next[idx - 1] = "";
      setOtp(next);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setError("");
    const code = otp.join("");
    if (code.length !== 4) {
      setError("Enter all 4 digits");
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    try {
      await login(fullPhone, code);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--bg-light)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">Naar Login</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === "phone" ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">Mobile number</label>
              <div className="flex rounded-xl border-2 border-[var(--border-light)] overflow-hidden focus-within:border-black transition-colors">
                <span className="flex items-center px-4 bg-[var(--bg-card)] text-[var(--text-muted)] text-sm font-medium">
                  {COUNTRY_CODE}
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit number"
                  className="flex-1 px-4 py-3 text-black placeholder:text-[var(--text-muted-light)] outline-none bg-transparent"
                  autoFocus
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, "").length < 10}
              className="w-full py-3 rounded-full bg-[var(--accent)] text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? "Sending..." : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Enter the 4-digit code sent to {fullPhone}
            </p>
            <div className="flex gap-2 justify-center">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-11 h-12 text-center text-lg font-bold rounded-lg border-2 border-[var(--border-light)] focus:border-black outline-none transition-colors"
                />
              ))}
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <button
              id="otp-submit"
              type="submit"
              disabled={loading || otp.join("").length !== 4}
              className="w-full py-3 rounded-full bg-[var(--accent)] text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="w-full text-sm text-[var(--text-muted)] hover:text-black transition-colors"
            >
              Change number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
