"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  generateOtp,
  verifyOtp,
  getUserDetails,
} from "@/lib/api-client";
import { signInWithToken } from "@/lib/firebase";
import type { UserDetails } from "@/types/api";

interface AuthContextValue {
  token: string | null;
  user: UserDetails | null;
  loginPhone: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phoneWithCountryCode: string, otp: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  requestOtp: (phoneWithCountryCode: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loginPhone, setLoginPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistToken = useCallback(async () => {
    const { getIdToken } = await import("@/lib/firebase");
    const idToken = await getIdToken();
    if (idToken && typeof window !== "undefined") {
      localStorage.setItem("naar_id_token", idToken);
      setToken(idToken);
      return idToken;
    }
    return null;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setLoginPhone(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("naar_id_token");
      localStorage.removeItem("naar_login_phone");
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { getUserDetails } = await import("@/lib/api-client");
      const res = await getUserDetails();
      if (res?.data?.userId) {
        setUser(res.data as UserDetails);
      } else {
        setUser(null);
      }
    } catch {
      // Don't logout - keep token so user can proceed (new users may get 401 from userDetails)
      setUser(null);
    }
  }, []);

  const login = useCallback(
    async (phoneWithCountryCode: string, otp: string) => {
      const { verifyOtp } = await import("@/lib/api-client");
      const res = await verifyOtp(phoneWithCountryCode, otp);
      if (!res?.token) throw new Error("Invalid response");
      setLoginPhone(phoneWithCountryCode);
      if (typeof window !== "undefined") {
        localStorage.setItem("naar_login_phone", phoneWithCountryCode);
      }
      await signInWithToken(res.token);
      await persistToken();
      await refreshUser();
    },
    [persistToken, refreshUser]
  );

  const requestOtp = useCallback(async (phoneWithCountryCode: string) => {
    await generateOtp(phoneWithCountryCode);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (typeof window === "undefined") return;
      const stored = localStorage.getItem("naar_id_token");
      const storedPhone = localStorage.getItem("naar_login_phone");
      if (storedPhone) setLoginPhone(storedPhone);
      if (stored) {
        setToken(stored);
        try {
          await refreshUser();
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };
    init();
  }, [refreshUser, logout]);

  const value: AuthContextValue = {
    token,
    user,
    loginPhone,
    isLoading,
    isAuthenticated: !!token,
    login,
    logout,
    refreshUser,
    requestOtp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
