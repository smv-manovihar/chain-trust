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

  return (
    <div className="space-y-6 lg:space-y-8 max-w-6xl mx-auto">
      {/* Welcome & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            My Medicines
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Welcome back, {user?.name?.split(" ")[0] || "User"}. You have{" "}
            {medications?.length || 0} saved medications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AddManualMedicineDialog onSuccess={fetchCabinet} />
          <Button
            className="flex-1 sm:flex-none rounded-full shadow-lg shadow-primary/20"
            asChild
          >
            <Link href="/verify">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Verify New Medicine</span>
              <span className="sm:hidden">Verify</span>
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="relative max-w-md px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search your medicines..."
          className="pl-11 h-12 rounded-full border-primary/10 bg-card/40 backdrop-blur-md shadow-sm focus-visible:ring-primary/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="p-4 lg:p-6 border-primary/10 bg-card/40 backdrop-blur-md rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-1 font-bold">
                Total Items
              </p>
              <h3 className="text-3xl tracking-tighter font-black">
                {medications.length}
              </h3>
            </div>
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Pill className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 lg:p-6 border-amber-500/10 bg-card/40 backdrop-blur-md rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-1 font-bold">
                Self-Added
              </p>
              <h3 className="text-3xl tracking-tighter text-amber-600 font-black">
                {medications.filter((m) => m.isUserAdded).length}
              </h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
              <Activity className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 lg:p-6 border-green-500/10 bg-green-500/[0.03] backdrop-blur-md rounded-[2rem] shadow-sm lg:col-span-2 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-green-500/10 rounded-2xl text-green-500">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-0.5 font-bold">
                Verified Items
              </p>
              <h3 className="text-xl lg:text-2xl text-green-600 dark:text-green-400 font-black">
                {medications.filter((m) => !m.isUserAdded).length} Products
                Trusted
              </h3>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-[10px] font-bold text-muted-foreground">
              Status
            </p>
            <p className="text-sm font-bold">Synced</p>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Medication List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg lg:text-xl font-black flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Medicine History
            </h2>
          </div>

          <div className="space-y-4 lg:space-y-5">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card
                  key={i}
                  className="p-6 h-32 animate-pulse bg-muted rounded-[2rem]"
                />
              ))
            ) : medications.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 rounded-[2.5rem] bg-muted/20">
                <div className="mx-auto w-12 h-12 text-muted-foreground/30 mb-4 font-bold text-2xl flex items-center justify-center">
                  ?
                </div>
                <h3 className="text-lg font-bold">Your medicines list is empty</h3>
                <p className="text-sm text-muted-foreground">
                  Verify a medicine or add one manually to get started.
                </p>
              </Card>
            ) : (
              medications.map((med) => (
                <Card
                  key={med._id}
                  className={`p-5 lg:p-6 border-primary/5 transition-all flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center group rounded-[2.5rem] ${
                    med.isUserAdded
                      ? "bg-muted/30 hover:bg-muted/50"
                      : "bg-card/30 hover:bg-card/60 hover:border-primary/20"
                  }`}
                >
                  <div className="flex gap-5 items-start lg:items-center w-full">
                    <div
                      className={`p-4 rounded-[1.5rem] transition-all duration-500 shrink-0 shadow-inner ${
                        med.isUserAdded
                          ? "bg-zinc-200 text-zinc-500 group-hover:bg-zinc-800 group-hover:text-zinc-100"
                          : "bg-primary/5 group-hover:bg-primary group-hover:text-primary-foreground text-primary"
                      }`}
                    >
                      {med.isUserAdded ? (
                        <Pill className="h-7 w-7" />
                      ) : (
                        <ShieldCheck className="h-7 w-7" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-bold text-lg lg:text-xl tracking-tight truncate">
                          {med.name}
                        </h3>
                        {med.isUserAdded ? (
                          <Badge
                            variant="outline"
                            className="h-5 text-[9px] px-2 font-bold border-muted-foreground/30 text-muted-foreground"
                          >
                            Self-Added
                          </Badge>
                        ) : (
                          <Badge className="h-5 text-[9px] px-2 font-bold bg-green-500 hover:bg-green-600 border-none">
                            Verified Authentic
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs lg:text-sm text-muted-foreground font-bold tracking-tight">
                        {med.brand}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-4">
                        <div className="flex items-center gap-2 bg-background/50 border border-border px-3 py-1.5 rounded-2xl text-[11px] tracking-tight text-muted-foreground">
                          <Archive className="h-3.5 w-3.5" /> Batch:{" "}
                          {med.batchNumber}
                        </div>
                        {med.expiryDate && (
                          <div className="flex items-center gap-2 bg-background/50 border border-border px-3 py-1.5 rounded-2xl text-[11px] tracking-tight text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" /> Exp:{" "}
                            {med.expiryDate}
                          </div>
                        )}
                        <div className="flex items-center gap-2 bg-background/50 border border-border px-3 py-1.5 rounded-2xl text-[11px] tracking-tight text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" /> Added:{" "}
                          {med.createdAt
                            ? format(new Date(med.createdAt), "MMM d, yyyy")
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-3 w-full sm:w-40 mt-4 sm:mt-0">
                    {!med.isUserAdded && med.salt && (
                      <Button
                        asChild
                        className="flex-1 sm:w-full rounded-2xl h-11 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                      >
                        <Link href={`/verify?salt=${med.salt}`}>
                          <ExternalLink className="mr-2 h-4 w-4" /> Check
                          Real-time
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="flex-1 sm:w-full rounded-2xl h-11 font-bold bg-background/50 border-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shadow-sm"
                      onClick={() => handleDelete(med._id, med.name)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </Card>
              ))
            )}

            <Card
              className="p-6 border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col items-center justify-center text-center rounded-[2rem] group cursor-pointer"
              asChild
            >
              <Link href="/verify">
                <div className="p-3 bg-primary/20 rounded-full text-primary group-hover:scale-110 transition-transform mb-3">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-primary text-sm tracking-tight">
                  Verify New medicine
                </h4>
                <p className="text-xs text-muted-foreground max-w-[200px] mt-1">
                  Keep your medicine history up to date and safe.
                </p>
              </Link>
            </Card>
          </div>
        </div>

        {/* intelligence Sidebar */}
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-black flex items-center gap-2 mb-4">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Safety Watch
            </h2>

            <div className="space-y-4">
              {medications.some((m) => !m.isUserAdded) ? (
                <Card className="p-5 border-green-500/20 bg-green-500/5 shadow-sm rounded-2xl">
                  <div className="flex gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-green-900 dark:text-green-400 text-sm mb-1">
                        Authenticated Batch
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your verified products are tracked against global recall
                        databases.
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-5 border-amber-500/20 bg-amber-500/5 shadow-sm rounded-2xl">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 dark:text-amber-400 text-sm mb-1">
                        Verify Products
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Manually added items cannot be checked for authenticity
                        or batch recalls.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-5 border-primary/20 bg-primary/5 shadow-sm rounded-2xl">
                <div className="flex gap-3">
                  <BellRing className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-primary text-sm mb-1">
                      Alert Subscription
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Push notifications are enabled for batch changes and
                      suspicious activity.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 border-dashed border-primary/20 hover:bg-muted/50 transition-colors cursor-pointer rounded-2xl group">
                <div className="flex items-center justify-between group-hover:translate-x-1 transition-transform">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold">Health Trends</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
