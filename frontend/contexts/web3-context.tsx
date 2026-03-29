"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { requestExecutionAccounts, getWeb3 } from "@/api/web3-client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

interface Web3ContextType {
  address: string | null;
  status: 'connected' | 'disconnected' | 'connecting';
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const isManufacturer = isAuthenticated && user?.role === "manufacturer";

  const checkConnection = async () => {
    if (typeof window === "undefined" || !window.ethereum || !isManufacturer) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setStatus('connected');
      }
    } catch (err) {
      console.error("Failed to check wallet connection:", err);
    }
  };

  const connect = async () => {
    if (!isManufacturer) {
      toast.error("Only manufacturers can connect a wallet");
      return;
    }
    setStatus('connecting');
    setError(null);
    try {
      const accounts = await requestExecutionAccounts();
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setStatus('connected');
        toast.success("Wallet connected successfully");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
      setStatus('disconnected');
      toast.error(err.message || "Failed to connect wallet");
    }
  };

  const disconnect = () => {
    setAddress(null);
    setStatus('disconnected');
    toast.info("Wallet disconnected (local)");
  };

  useEffect(() => {
    if (!isManufacturer) {
      if (address) {
        setAddress(null);
        setStatus('disconnected');
      }
      return;
    }
    
    checkConnection();

    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setStatus('connected');
        } else {
          setAddress(null);
          setStatus('disconnected');
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const value: Web3ContextType = {
    address,
    status,
    error,
    connect,
    disconnect,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}
