"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWeb3 } from "@/contexts/web3-context";
import {
  Wallet,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Copy,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function WalletSettings() {
  const { address, status, connect, disconnect } = useWeb3();

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
  };

  return (
    <Card className="overflow-hidden border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="p-8 lg:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              className={cn(
                "h-16 w-16 rounded-3xl flex items-center justify-center relative transition-all duration-500",
                status === "connected"
                  ? "bg-primary/10 text-primary shadow-xl shadow-primary/10"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Wallet className="h-8 w-8" />
              {status === "connected" ? (
                <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-4 border-background flex items-center justify-center">
                  <ShieldCheck className="h-2.5 w-2.5 text-white" />
                </div>
              ) : (
                <div className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 rounded-full border-4 border-background flex items-center justify-center">
                  <ShieldAlert className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter">Blockchain Identity</h3>
              <p className="text-sm text-muted-foreground font-medium mt-1">
                Manage your Web3 signature and wallet connection.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] border-2",
              status === "connected"
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : "bg-orange-500/10 text-orange-600 border-orange-500/20",
            )}
          >
            {status}
          </Badge>
        </div>

        {status === "connected" && address ? (
          <div className="space-y-6">
            <div className="p-6 rounded-[2rem] bg-muted/30 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  Connected Address
                </p>
                <p className="font-mono text-sm font-bold tracking-tight text-primary">
                  {address}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyAddress}
                  className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <a
                    href={`https://etherscan.io/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <Button
                onClick={connect}
                className="w-full sm:flex-1 h-12 rounded-full font-bold text-[11px] tracking-tight gap-2 shadow-lg shadow-primary/20"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Switch Account
              </Button>
              <Button
                variant="outline"
                onClick={disconnect}
                className="w-full sm:w-auto px-8 h-12 rounded-full font-bold text-[11px] tracking-tight text-destructive hover:bg-destructive/5 border-destructive/20 hover:border-destructive/40 gap-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 rounded-[2rem] bg-orange-500/5 border border-orange-500/10">
              <p className="text-sm font-medium text-orange-600/80 leading-relaxed">
                Connect your wallet to enable on-chain actions like product
                registration, batch recalls, and verified ownership tracking.
              </p>
            </div>
            <Button
              onClick={connect}
              disabled={status === "connecting"}
              className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 font-bold tracking-tight text-[11px] gap-3 shadow-xl shadow-primary/20"
            >
              {status === "connecting" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {status === "connecting"
                ? "Authenticating..."
                : "Establish Web3 Link"}
            </Button>
          </div>
        )}
      </div>

      <div className="px-8 py-4 bg-muted/20 border-t border-border/10 flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">
          Certified Secure Node
        </span>
        <div className="flex gap-4">
          <span className="text-[9px] font-bold text-muted-foreground/60">
            EIP-1193
          </span>
          <span className="text-[9px] font-bold text-muted-foreground/60">
            Web3.js v4.x
          </span>
        </div>
      </div>
    </Card>
  );
}
