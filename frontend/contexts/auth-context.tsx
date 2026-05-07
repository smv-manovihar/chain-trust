"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  getCurrentUser,
  logout as apiLogout,
  login as apiLogin,
  register as apiRegister,
  verifyEmailWithToken as apiVerifyEmailWithToken,
  verifyEmailWithOTP as apiVerifyEmailWithOTP,
  changeEmail as apiChangeEmail,
  User,
} from "@/api";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refreshUser: (signal?: AbortSignal) => Promise<void>;
  login: (email: string, password: string) => Promise<string>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    role?: "customer" | "manufacturer";
    phoneNumber?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    companyName?: string;
    website?: string;
    industry_registration?: string;
  }) => Promise<string>;
  googleLogin: (returnTo?: string) => void;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  verifyEmailWithToken: (token: string) => Promise<void>;
  verifyEmailWithOTP: (data: { email: string; otp: string }) => Promise<void>;
  changeEmail: (oldEmail: string, newEmail: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const cacheAvatarBlob = async (url: string) => {
  if (typeof window === "undefined" || !url) return;
  try {
    if (url.startsWith("data:")) {
      localStorage.setItem("cached_avatar", url);
      return;
    }
    const response = await fetch(url);
    if (!response.ok) return;
    const blob = await response.blob();
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        localStorage.setItem("cached_avatar", reader.result as string);
      }
    };
    reader.readAsDataURL(blob);
  } catch (err) {
    console.error("Failed to cache avatar blob:", err);
  }
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && user && !user.isEmailVerified) {
      if (
        (pathname.startsWith("/customer") ||
          pathname.startsWith("/manufacturer") ||
          pathname.startsWith("/settings")) &&
        !pathname.startsWith("/verify-email")
      ) {
        console.log(`[Redirect Check] Unverified user on protected path: ${pathname}. Redirecting to /verify-email`);
        window.location.href = "/verify-email";
      }
    }
  }, [user, isLoading, pathname]);

  const refreshAbortRef = React.useRef<AbortController | null>(null);

  const refreshUser = useCallback(async (signal?: AbortSignal) => {
    if (refreshAbortRef.current) refreshAbortRef.current.abort();
    const controller = new AbortController();
    refreshAbortRef.current = controller;

    setIsLoading(true);
    try {
      const data = await getCurrentUser(signal || controller.signal);
      if (data) {
        setUser(data.user);
        // Cookies handle the token storage

        if (!data.user.isEmailVerified && typeof window !== "undefined") {
          const path = window.location.pathname;
          if (
            !path.startsWith("/verify-email") &&
            !path.startsWith("/login") &&
            !path.startsWith("/register") &&
            !path.startsWith("/setup-account") &&
            path !== "/" &&
            !path.startsWith("/verify")
          ) {
            console.log(`[RefreshUser Redirect] User not verified on path: ${path}. Redirecting to /verify-email`);
            window.location.href = "/verify-email";
          }
        }

        if (typeof window !== "undefined" && data.user.avatar) {
          cacheAvatarBlob(data.user.avatar);
        }
      } else {
        setUser(null);
      }
      setError(null);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setUser(null);
    } finally {
      if (refreshAbortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiLogin(email, password);
      setUser(data.user);
      if (typeof window !== "undefined" && data.user.avatar) {
        cacheAvatarBlob(data.user.avatar);
      }

      if (data.user.mustChangePassword) {
        return "/auth/force-change-password";
      }

      if (!data.user.isEmailVerified) {
        return "/verify-email";
      }

      return (
        data.redirectUrl ||
        (data.user.role === "manufacturer" ? "/manufacturer" : "/customer")
      );
    } catch (err: any) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData: {
    email: string;
    password: string;
    name: string;
    role?: "customer" | "manufacturer";
    phoneNumber?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    companyName?: string;
    website?: string;
    industry_registration?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRegister(userData);

      // Auto-login after registration
      setUser(data.user);
      // Cookies handle token storage
      if (data.accessToken) {
      }
      if (typeof window !== "undefined" && data.user.avatar) {
        cacheAvatarBlob(data.user.avatar);
      }

      return "/verify-email";
    } catch (err: any) {
      setError(err.message || "Registration failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const googleLogin = useCallback((returnTo?: string) => {
    setIsLoading(true);
    setError(null);
    // Redirect to backend Google auth endpoint
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    window.location.href = `${baseUrl}/api/auth/google${query}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error("Logout API failed, continuing with cleanup:", err);
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("cached_avatar");
        // Use hard redirect to ensure all state is cleared
        window.location.href = "/login";
      }
    }
  }, []);

  const verifyEmailWithToken = useCallback(async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiVerifyEmailWithToken(token);
      setUser(data.user);
      // Wait for state to settle, then refresh to be sure
      await refreshUser();
      
      if (typeof window !== "undefined" && data.user.avatar) {
        cacheAvatarBlob(data.user.avatar);
      }
    } catch (err: any) {
      setError(err.message || "Verification failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const verifyEmailWithOTP = useCallback(async (data: { email: string; otp: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await apiVerifyEmailWithOTP(data);
      setUser(resp.user);
      // Ensure session is fully refreshed
      await refreshUser();
    } catch (err: any) {
      setError(err.message || "OTP Verification failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const changeEmail = useCallback(async (oldEmail: string, newEmail: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiChangeEmail(oldEmail, newEmail);
      if (user) {
        setUser({ ...user, email: response.email });
      }
      toast.success("Email Updated", {
        description: "A new verification code has been sent.",
      });
    } catch (error: any) {
      toast.error("Failed to update email", {
        description: error.message || "Please try again.",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshUser();
    return () => refreshAbortRef.current?.abort();
  }, []);

  const value: AuthContextType = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    refreshUser,
    login,
    register,
    googleLogin,
    logout,
    setUser,
    verifyEmailWithToken,
    verifyEmailWithOTP,
    changeEmail,
  }), [
    user, 
    isLoading, 
    error, 
    refreshUser, 
    login, 
    register, 
    googleLogin, 
    logout, 
    verifyEmailWithToken, 
    verifyEmailWithOTP, 
    changeEmail
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
