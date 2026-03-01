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

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<string>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    role?: "customer" | "manufacturer";
  }) => Promise<string>;
  googleLogin: () => void;
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

  const refreshUser = async () => {
    setIsLoading(true);
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setError(null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiLogin(email, password);
      setUser(data.user);

      if (data.user.mustChangePassword) {
        return "/auth/force-change-password";
      }

      return (
        data.redirectUrl ||
        (data.user.role === "manufacturer" ? "/manufacturer" : "/customer-home")
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
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRegister(userData);
      setUser(data.user);
      return (
        data.redirectUrl ||
        (data.user.role === "manufacturer" ? "/manufacturer" : "/customer-home")
      );
    } catch (err: any) {
      setError(err.message || "Registration failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = () => {
    setIsLoading(true);
    setError(null);
    // Redirect to backend Google auth endpoint
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/auth/google`;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  useEffect(() => {
    refreshUser();
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
