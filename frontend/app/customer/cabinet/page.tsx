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
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getCabinet, removeFromCabinet, CabinetItem } from "@/api";
import { toast } from "sonner";
import { AddManualMedicineDialog } from "@/components/cabinet/add-manual-medicine-dialog";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export default function MyMedicinesPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const { user } = useAuth();
  const [medications, setMedications] = useState<CabinetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

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

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchCabinet = async () => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setIsLoading(true);
    try {
      const data = await getCabinet(debouncedSearch, controller.signal);
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
  }, [debouncedSearch]);

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

  const handleTakeDose = async (e: React.MouseEvent, id: string, name: string) => {
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
    <div className="space-y-6 lg:space-y-8 max-w-[1600px] mx-auto pb-20">
      {/* Dynamic Floating Header */}
      <div 
        className={cn(
          "sticky top-0 z-40 transition-all duration-500 -mx-4 px-4 lg:-mx-8 lg:px-8 py-4 sm:py-6",
          scrolled 
            ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm py-3 sm:py-4" 
            : "bg-transparent"
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className={cn("transition-all duration-500", scrolled && "scale-95 origin-left")}>
              <h1 className={cn(
                "font-black tracking-tight text-foreground transition-all duration-500",
                scrolled ? "text-xl sm:text-2xl" : "text-2xl sm:text-4xl"
              )}>
                My Medicines
              </h1>
              {!scrolled && (
                <p className="text-muted-foreground text-sm sm:text-base mt-1 animate-in fade-in slide-in-from-top-1">
                  Welcome back, {user?.name?.split(" ")[0] || "User"}. Managing {medications?.length || 0} medications.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <AddManualMedicineDialog onSuccess={fetchCabinet} />
              <Button
                className="flex-1 sm:flex-none rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold h-10 sm:h-12 px-4 sm:px-6"
                asChild
              >
                <Link href="/verify">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Verify New Medicine</span>
                  <span className="sm:hidden text-xs">Verify New</span>
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Search Bar - Responsive */}
          <div className={cn(
            "relative transition-all duration-500 ease-in-out",
            scrolled ? "max-w-xs ml-auto -mt-12 hidden sm:block" : "max-w-md"
          )}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
            <Input
              placeholder="Search your medications..."
              className={cn(
                "pl-11 rounded-full border-primary/10 bg-card/60 backdrop-blur-md shadow-sm focus-visible:ring-primary/20 h-10 sm:h-12",
                scrolled && "h-10 text-xs"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Mobile-only Search Bar when scrolled */}
      {scrolled && (
        <div className="sm:hidden px-2 mb-4 animate-in fade-in slide-in-from-top-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-50" />
            <Input
              placeholder="Search..."
              className="pl-9 rounded-full border-primary/10 bg-card/60 backdrop-blur-md h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="px-1 pt-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Medication List
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 sm:gap-8">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 rounded-[2.5rem] bg-muted animate-pulse" />
            ))
          ) : medications.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 rounded-[3rem] bg-muted/20 col-span-full">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground/30 font-bold text-3xl">?</div>
              <h3 className="text-xl font-bold">No medications found</h3>
              <p className="text-muted-foreground mt-2 max-w-xs mx-auto text-sm">
                Try searching for something else or add a new medicine to get started tracking your health.
              </p>
              <Button className="mt-6 rounded-full px-8" asChild>
                <Link href="/verify">Verify New Medicine</Link>
              </Button>
            </Card>
          ) : (
            medications.map((med) => (
              <Link 
                key={med._id} 
                href={`/customer/cabinet/${med._id}`}
                className="group block h-full"
              >
                <Card className={cn(
                  "h-full p-6 transition-all duration-500 flex flex-col gap-6 rounded-[2.5rem] border-primary/5 shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 relative overflow-hidden",
                  med.isUserAdded ? "bg-muted/30" : "bg-card/40 backdrop-blur-md"
                )}>
                  {/* Glass Background Artifact */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />
                  
                  <div className="flex gap-4 items-start relative z-10">
                    <div className={cn(
                      "p-4 rounded-2xl transition-all duration-500 shadow-inner shrink-0",
                      med.isUserAdded 
                        ? "bg-zinc-200 text-zinc-500 group-hover:bg-zinc-800 group-hover:text-zinc-100" 
                        : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    )}>
                      {med.isUserAdded ? <Pill className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors truncate">
                        {med.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-70">
                        {med.brand}
                      </p>
                    </div>
                  </div>

                  {/* Quantity Tracker */}
                  <div className="space-y-3 relative z-10 flex-1">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Supply Inventory</span>
                      <span className={cn(
                        "text-xs font-black tabular-nums",
                        (med.currentQuantity || 0) < 5 ? "text-red-500" : "text-primary"
                      )}>
                        {med.currentQuantity || 0} / {med.totalQuantity || "--"} {med.unit || "Units"}
                      </span>
                    </div>
                    <Progress 
                      value={((med.currentQuantity || 0) / (med.totalQuantity || 1)) * 100} 
                      className="h-2 rounded-full overflow-hidden" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 relative z-10">
                    <div className="flex items-center gap-2 bg-background/50 border border-border/40 px-3 py-2 rounded-xl text-[10px] font-bold text-muted-foreground overflow-hidden">
                      <Clock className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate">{med.expiryDate ? format(new Date(med.expiryDate), "MMM yyyy") : "No Expiry"}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-background/50 border border-border/40 px-3 py-2 rounded-xl text-[10px] font-bold text-muted-foreground overflow-hidden">
                      <Archive className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate">Batch: {med.batchNumber}</span>
                    </div>
                  </div>

                  {/* Card Quick Actions */}
                  <div className="flex items-center gap-2 pt-2 relative z-10 mt-auto">
                    <Button
                      variant="outline"
                      onClick={(e) => handleTakeDose(e, med._id, med.name)}
                      className="h-10 flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500/5 hover:bg-emerald-500 hover:text-white border-emerald-500/20 text-emerald-600 transition-all shadow-sm"
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
                      className="h-10 w-10 shrink-0 rounded-xl hover:bg-red-50 hover:text-red-500 text-muted-foreground transition-colors border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
