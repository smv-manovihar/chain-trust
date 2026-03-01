'use client';
import { useAuth as useAuthContext } from '@/contexts/auth-context';
import { User } from "@/api";

export type { User };

export function useAuth() {
  return useAuthContext();
}
