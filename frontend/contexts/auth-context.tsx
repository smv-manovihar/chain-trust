"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  getCurrentUser,
  logout as apiLogout,
  login as apiLogin,
  register as apiRegister,
  User,
} from "@/api";
import { tokenStore } from "@/lib/token-store";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const refreshAbortRef = React.useRef<AbortController | null>(null);

  const refreshUser = async (signal?: AbortSignal) => {
    if (refreshAbortRef.current) refreshAbortRef.current.abort();
    const controller = new AbortController();
    refreshAbortRef.current = controller;

    setIsLoading(true);
    try {
      const data = await getCurrentUser(signal || controller.signal);
      if (data) {
        setUser(data.user);
        if (data.accessToken) {
          tokenStore.setToken(data.accessToken);
        }
        
        if (!data.user.isEmailVerified && typeof window !== "undefined") {
          const path = window.location.pathname;
          if (!path.startsWith("/verify-email") && !path.startsWith("/login") && !path.startsWith("/register") && !path.startsWith("/setup-account")) {
              window.location.href = "/verify-email";
          }
        }

        if (typeof window !== "undefined" && data.user.avatar) {
          cacheAvatarBlob(data.user.avatar);
        }
      } else {
        setUser(null);
        tokenStore.clearToken();
      }
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setUser(null);
      tokenStore.clearToken();
    } finally {
      if (refreshAbortRef.current === controller) {
        setIsLoading(false);
      }
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiLogin(email, password);
      setUser(data.user);
      if (data.accessToken) {
        tokenStore.setToken(data.accessToken);
      }
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
  };

  const register = async (userData: {
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
      setUser(data.user);
      if (data.accessToken) {
        tokenStore.setToken(data.accessToken);
      }
      return (
        data.redirectUrl ||
        (data.user.role === "manufacturer" ? "/manufacturer" : "/customer")
      );
    } catch (err: any) {
      setError(err.message || "Registration failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = (returnTo?: string) => {
    setIsLoading(true);
    setError(null);
    // Redirect to backend Google auth endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    window.location.href = `${baseUrl}/api/auth/google${query}`;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    tokenStore.clearToken();
    if (typeof window !== "undefined") {
      localStorage.removeItem("cached_avatar");
    }
  };

  useEffect(() => {
    refreshUser();
    return () => refreshAbortRef.current?.abort();
  }, []);

  const value: AuthContextType = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
