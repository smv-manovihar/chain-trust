'use client';
import { useAuth as useAuthContext } from '@/contexts/auth-context';
import type { User } from '@/lib/api';

export type { User };

export function useAuth() {
  return useAuthContext();
}
