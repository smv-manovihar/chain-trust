"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pill,
  Clock,
  AlertTriangle,
  Calendar,
  Activity,
  BellRing,
  Archive,
  Plus,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  Trash2,
  ExternalLink,
  ShieldAlert,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getCabinet, removeFromCabinet, CabinetItem } from "@/api";
import { resolveMediaUrl } from "@/lib/media-url";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { DataToolbar } from "@/components/ui/data-toolbar";

export default function MyMedicinesPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const { user } = useAuth();
  const [medications, setMedications] = useState<CabinetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [showInactive, setShowInactive] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 500);
  const fetchAbortRef = useRef<AbortController | null>(null);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }

    const queryString = params.toString();
    const currentQueryString = searchParams.toString();

    if (queryString !== currentQueryString) {
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(url, { scroll: false });
    }
  }, [debouncedSearch, pathname, router, searchParams]);

  const fetchCabinet = async () => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setIsLoading(true);
    try {
      const data = await getCabinet(
        debouncedSearch,
        showInactive ? "all" : "active",
        controller.signal,
      );
      setMedications(data);
    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("Failed to fetch cabinet:", error);
    } finally {
      if (fetchAbortRef.current === controller) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchCabinet();
    return () => fetchAbortRef.current?.abort();
  }, [debouncedSearch, showInactive]);

  const handleDelete = async (id: string, name: string) => {
    try {
      await removeFromCabinet(id);
      toast.success("Medicine Removed", {
        description: `${name} has been removed from your history.`,
      });
      fetchCabinet();
    } catch (error) {
      toast.error("Failed to remove medicine");
    }
  };

  const handleTakeDose = async (
    e: React.MouseEvent,
    id: string,
    name: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { markDoseTaken } = await import("@/api/customer.api");
      await markDoseTaken(id);
      toast.success("Dose Recorded", {
        description: `Your dose for ${name} has been marked as taken.`,
      });
      fetchCabinet();
    } catch (err) {
      toast.error("Failed to record dose");
    }
  };

  return (
    <div className="space-y-2 lg:space-y-4 max-w-[1600px] mx-auto pb-20">
      <PageHeader
        title="My Medicines"
        description={`Welcome back, ${user?.name?.split(" ")[0] || "User"}. Managing ${medications?.length || 0} medications.`}
        actions={
          <>
            <Button
              className="flex-1 sm:flex-none rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold h-10 sm:h-12 px-4 sm:px-6 gap-2 transition-all active:scale-95"
              asChild
            >
              <Link href="/customer/cabinet/add">
                <Plus className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" />
                <span>Add Medicine</span>
              </Link>
            </Button>

            <Button
              variant="outline"
              className="flex-1 sm:flex-none rounded-full border-primary/20 hover:bg-primary/5 font-bold h-10 sm:h-12 px-4 sm:px-6 shadow-md transition-all active:scale-95"
              asChild
            >
              <Link href="/verify">
                <QrCode className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
                <span className="hidden sm:inline text-sm">Verify Medicine</span>
                <span className="sm:hidden text-xs">Verify</span>
              </Link>
            </Button>
          </>
        }
      />

      <DataToolbar
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: "Search medications...",
        }}
        filters={
          <div className="flex items-center space-x-2 bg-muted/40 px-3 sm:px-4 h-11 sm:h-12 rounded-full border border-border/50 shrink-0">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label
              htmlFor="show-inactive"
              className="text-[10px] sm:text-xs font-bold text-muted-foreground cursor-pointer select-none hidden xs:inline-block"
            >
              Show inactive
            </Label>
          </div>
        }
      />

      {/* Main Content */}
      <div className="px-1 pt-2">
        <div className="flex flex-col gap-4 sm:gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-[2.5rem] bg-muted animate-pulse"
              />
            ))
          ) : medications.length === 0 ? (
            <div className="col-span-full py-8">
              <EmptyState
                icon={Pill}
                title="No medicines found"
                description="Try searching for something else or verify a new medicine to get started tracking your health."
                action={{
                  label: "Verify New Medicine",
                  href: "/verify",
                }}
              />
            </div>
          ) : (
            medications.map((med) => (
                <Card
                  key={med._id}
                  role="article"
                  tabIndex={0}
                  onClick={() => router.push(`/customer/cabinet/${med._id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/customer/cabinet/${med._id}`);
                    }
                  }}
                  className={cn(
                    "p-5 sm:p-6 transition-all duration-500 flex flex-col md:flex-row md:items-center gap-4 sm:gap-6 md:gap-8 rounded-[2rem] sm:rounded-[2.5rem] border-primary/5 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 relative overflow-hidden cursor-pointer group",
                    med.isUserAdded
                      ? "bg-muted/30"
                      : "bg-card/40 backdrop-blur-md",
                  )}
                >
                  {/* Glass Background Artifact */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />

                  <div className="flex gap-4 items-center relative z-10 md:w-[250px] shrink-0">
                    {med.images && med.images.length > 0 ? (
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-[0.85rem] overflow-hidden shrink-0 shadow-sm border border-primary/10 bg-white">
                        <img src={resolveMediaUrl(med.images[0])} alt={med.name} className="h-full w-full object-cover" crossOrigin="anonymous" />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-[0.85rem] transition-all duration-500 shadow-inner shrink-0",
                          med.isUserAdded
                            ? "bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background"
                            : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
                        )}
                      >
                        {med.isUserAdded ? (
                          <Pill className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <h3 className="font-bold text-base sm:text-lg leading-tight group-hover:text-primary transition-colors truncate">
                        {med.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-black mt-0.5 opacity-70 truncate">
                        {med.brand}
                      </p>
                    </div>
                  </div>

                  {/* Quantity Tracker */}
                  <div className="relative z-10 flex-1 w-full md:w-auto min-w-[150px]">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-black text-muted-foreground opacity-60">
                        Supply Inventory
                      </span>
                      <span
                        className={cn(
                          "text-[10px] sm:text-xs font-black tabular-nums",
                          (med.currentQuantity || 0) < 5
                            ? "text-destructive"
                            : "text-primary",
                        )}
                      >
                        {med.currentQuantity || 0} / {med.totalQuantity || "--"}{" "}
                        {med.unit || "Units"}
                      </span>
                    </div>
                    <Progress
                      value={
                        ((med.currentQuantity || 0) /
                          (med.totalQuantity || 1)) *
                        100
                      }
                      className="h-1.5 sm:h-2 rounded-full overflow-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:flex md:flex-row gap-2 sm:gap-3 relative z-10 w-full md:w-auto mt-2 md:mt-0 shrink-0">
                    <div className="flex items-center gap-2 bg-background/50 border border-border/40 px-3 py-2 sm:py-2.5 rounded-xl text-[10px] font-bold text-muted-foreground overflow-hidden justify-center md:justify-start">
                      <Clock className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                      <span className="truncate">
                        {med.expiryDate
                          ? format(new Date(med.expiryDate), "MMM yyyy")
                          : "No Expiry"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-background/50 border border-border/40 px-3 py-2 sm:py-2.5 rounded-xl text-[10px] font-bold text-muted-foreground overflow-hidden justify-center md:justify-start">
                      <Archive className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                      <span className="truncate">Code: {med.batchNumber}</span>
                    </div>
                  </div>

                  {/* Card Quick Actions */}
                  <div className="flex items-center gap-2 relative z-10 w-full md:w-auto mt-2 md:mt-0 shrink-0">
                    <Button
                      variant="outline"
                      onClick={(e) => handleTakeDose(e, med._id, med.name)}
                      className="h-9 sm:h-10 flex-1 md:flex-none md:w-28 rounded-xl text-[10px] sm:text-xs font-black bg-emerald-500/5 hover:bg-emerald-500 hover:text-white border-emerald-500/20 text-emerald-600 transition-all shadow-sm"
                    >
                      Take Dose
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(med._id, med.name);
                      }}
                      className="h-9 sm:h-10 w-9 sm:w-10 shrink-0 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors border border-transparent hover:border-destructive/20"
                      aria-label={`Remove ${med.name} from cabinet`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
        </div>
      </div>
    </div>
  );
}
