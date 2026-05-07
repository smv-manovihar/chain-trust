"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pill,
  Clock,
  Archive,
  Plus,
  ShieldCheck,
  RotateCcw,
  Flame,
  QrCode,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  getCabinet,
  removeFromCabinet,
  markDoseTaken,
  CabinetItem,
  undoDose,
} from "@/api";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
      await markDoseTaken(id);
      toast.success("Dose Recorded", {
        description: `Your dose for ${name} has been marked as taken.`,
        action: {
          label: "Undo",
          onClick: () => handleUndoDose(id, name),
        },
      });
      fetchCabinet();
    } catch (err) {
      toast.error("Failed to record dose");
    }
  };

  const handleUndoDose = async (id: string, name: string) => {
    try {
      await undoDose(id);
      toast.success("Dose undone", {
        description: `Your record for ${name} has been reverted.`,
      });
      fetchCabinet();
    } catch (err) {
      toast.error("Failed to undo dose");
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
                <QrCode
                  className="mr-2 h-4 w-4 text-primary"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline text-sm">
                  Verify Medicine
                </span>
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
        viewToggle={{
          mode: viewMode,
          onChange: setViewMode,
        }}
        filters={
          <div
            className={cn(
              "flex items-center space-x-2 px-3 sm:px-4 h-11 sm:h-12 rounded-full border transition-all duration-300 shrink-0",
              showInactive
                ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                : "bg-muted/40 border-border/50 text-muted-foreground",
            )}
          >
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
              className="data-[state=checked]:bg-primary"
            />
            <Label
              htmlFor="show-inactive"
              className="text-[10px] sm:text-xs font-bold cursor-pointer select-none"
            >
              Show inactive
              {showInactive && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary text-[8px] sm:text-[9px] text-primary-foreground animate-in zoom-in-50 duration-300">
                  ON
                </span>
              )}
            </Label>
          </div>
        }
      />

      {/* Main Content */}
      <div className="px-1 pt-2">
        {isLoading ? (
          <div
            className={cn(
              "grid gap-4 sm:gap-6",
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1",
            )}
          >
            {Array.from({ length: viewMode === "grid" ? 8 : 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-3xl bg-muted/40 animate-pulse",
                  viewMode === "grid" ? "aspect-[4/5]" : "h-24 w-full",
                )}
              />
            ))}
          </div>
        ) : medications.length === 0 ? (
          <div className="py-20">
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
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {medications.map((med) => {
                  const isRecentlyTaken =
                    !!med.lastDoseTaken &&
                    Date.now() - new Date(med.lastDoseTaken).getTime() <
                      5 * 60 * 1000;
                  // isDoseDoneToday: server-computed — all scheduled doses for today are logged
                  const isDoseDoneToday = !!med.isDoseDoneToday;
                  const isTakeDisabled = isRecentlyTaken || isDoseDoneToday;

                  return (
                    <Card
                      key={med._id}
                      role="article"
                      tabIndex={0}
                      onClick={() =>
                        router.push(`/customer/cabinet/${med._id}`)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/customer/cabinet/${med._id}`);
                        }
                      }}
                      className={cn(
                        "p-5 sm:p-6 transition-all duration-500 flex flex-col gap-4 sm:gap-6 rounded-3xl border-primary/5 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 relative overflow-hidden cursor-pointer group",
                        med.isUserAdded
                          ? "bg-muted/30"
                          : "bg-card/40 backdrop-blur-md",
                      )}
                    >
                      {/* Glass Background Artifact */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />

                      {/* Adherence Streak Badge */}
                      {med.currentStreak !== undefined &&
                        med.currentStreak > 0 && (
                          <div className="absolute top-4 right-4 z-20">
                            <Badge className="rounded-full hover:bg-transparent bg-orange-500/20 text-orange-600 border-orange-300 font-black px-2 py-0.5 text-[10px] sm:text-[11px] flex items-center gap-1 shadow-sm transition-transform active:scale-95 group-hover:scale-110">
                              <Flame className="h-3 w-3 fill-orange-500 animate-pulse transition-all" />
                              {med.currentStreak}
                            </Badge>
                          </div>
                        )}

                      <div className="flex gap-4 items-center relative z-10 w-full shrink-0">
                        {med.images && med.images.length > 0 ? (
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl overflow-hidden shrink-0 shadow-sm border border-primary/10 bg-white">
                            <img
                              src={resolveMediaUrl(med.images[0])}
                              alt={med.name}
                              className="h-full w-full object-cover"
                              crossOrigin="anonymous"
                            />
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl transition-all duration-500 shadow-inner shrink-0",
                              "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
                            )}
                          >
                            {med.isUserAdded ? (
                              <Pill className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <ShieldCheck
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col">
                          <h3 className="font-bold text-base md:text-lg leading-tight group-hover:text-primary transition-colors truncate">
                            {med.name}
                          </h3>
                          <p className="text-xs text-muted-foreground font-black mt-0.5 opacity-70 truncate">
                            {med.brand}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Tracker */}
                      <div className="relative z-10 w-full flex-1">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[10px] font-black text-muted-foreground opacity-60 uppercase tracking-widest">
                            Inventory
                          </span>
                          <span
                            className={cn(
                              "text-xs font-black tabular-nums",
                              (med.currentQuantity || 0) < 5
                                ? "text-destructive"
                                : "text-primary",
                            )}
                          >
                            {med.currentQuantity || 0} /{" "}
                            {med.totalQuantity || "--"} {med.unit || "Units"}
                          </span>
                        </div>
                        <Progress
                          value={
                            ((med.currentQuantity || 0) /
                              (med.totalQuantity || 1)) *
                            100
                          }
                          className="h-2 rounded-full overflow-hidden"
                        />
                      </div>

                      <div className="flex flex-col gap-2 w-full mt-auto relative z-10 shrink-0">
                        <div className="flex items-center gap-2 bg-background/50 border border-border/40 px-3 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold text-muted-foreground overflow-hidden">
                          <Clock
                            className="h-3.5 w-3.5 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            Expiry:{" "}
                            {med.expiryDate
                              ? format(new Date(med.expiryDate), "MMM yyyy")
                              : "No Expiry"}
                          </span>
                        </div>
                        {!med.isUserAdded && (
                          <div className="flex items-center gap-2 bg-background/50 border border-border/40 px-3 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold text-muted-foreground overflow-hidden">
                            <Archive
                              className="h-3.5 w-3.5 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                            <span className="truncate text-foreground font-black">
                              Code: {med.batchNumber}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Quick Actions */}
                      <div className="flex items-center gap-2 relative z-10 w-full pt-2 shrink-0">
                        {isRecentlyTaken && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleUndoDose(med._id, med.name);
                            }}
                            className="h-[2.5rem] sm:h-11 w-[2.5rem] sm:w-11 shrink-0 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all border border-transparent hover:border-destructive/20"
                            title="Undo dose"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          disabled={isTakeDisabled}
                          onClick={(e) => handleTakeDose(e, med._id, med.name)}
                          className={cn(
                            "h-[2.5rem] sm:h-11 flex-1 rounded-xl text-[11px] sm:text-xs font-black transition-all shadow-sm",
                            isDoseDoneToday
                              ? "bg-green-500/10 text-green-700 border-green-300/50 cursor-not-allowed"
                              : isRecentlyTaken
                                ? "bg-muted text-muted-foreground border-border/50"
                                : "bg-primary/5 hover:bg-primary hover:text-primary-foreground border-primary/20 text-primary",
                          )}
                        >
                          {isDoseDoneToday
                            ? "Done Today"
                            : isRecentlyTaken
                              ? "Recently Taken"
                              : "Take Dose"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(med._id, med.name);
                          }}
                          className="h-[2.5rem] w-[2.5rem] sm:h-11 sm:w-11 shrink-0 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors border border-transparent hover:border-destructive/20"
                          aria-label={`Remove ${med.name} from cabinet`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Desktop List Mode Array */}
                <div className="hidden lg:block border rounded-3xl bg-card/40 backdrop-blur-xl border-primary/5 overflow-hidden shadow-xl shadow-primary/5">
                  <Table>
                    <TableHeader className="bg-primary/5">
                      <TableRow className="hover:bg-transparent border-primary/5">
                        <TableHead className="w-[300px] font-black text-xs text-primary/70">
                          MEDICINE
                        </TableHead>
                        <TableHead className="font-black text-xs text-primary/70">
                          INVENTORY STATUS
                        </TableHead>
                        <TableHead className="font-black text-xs text-primary/70 text-center">
                          STREAK
                        </TableHead>
                        <TableHead className="font-black text-xs text-primary/70 text-right">
                          EXPIRY
                        </TableHead>
                        <TableHead className="font-black text-xs text-primary/70 text-center">
                          BATCH CODE
                        </TableHead>
                        <TableHead className="w-[120px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {medications.map((med) => (
                        <TableRow
                          key={med._id}
                          onClick={() =>
                            router.push(`/customer/cabinet/${med._id}`)
                          }
                          className="hover:bg-primary/5 border-primary/5 transition-colors group cursor-pointer"
                        >
                          <TableCell className="py-5">
                            <div className="flex items-center gap-4">
                              {med.images && med.images.length > 0 ? (
                                <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 shadow-sm border border-primary/10 bg-white">
                                  <img
                                    src={resolveMediaUrl(med.images[0])}
                                    alt={med.name}
                                    className="h-full w-full object-cover"
                                    crossOrigin="anonymous"
                                  />
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center shadow-inner",
                                    "bg-primary/10 text-primary",
                                  )}
                                >
                                  {med.isUserAdded ? (
                                    <Pill
                                      className="h-5 w-5"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <ShieldCheck
                                      className="h-5 w-5"
                                      aria-hidden="true"
                                    />
                                  )}
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="font-black text-sm tracking-tight text-foreground group-hover:text-primary transition-colors">
                                  {med.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-black opacity-70">
                                  {med.brand}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-[180px]">
                              <div className="flex justify-between items-end mb-1.5">
                                <span
                                  className={cn(
                                    "text-xs font-black tabular-nums",
                                    (med.currentQuantity || 0) < 5
                                      ? "text-destructive"
                                      : "text-foreground",
                                  )}
                                >
                                  {med.currentQuantity || 0} /{" "}
                                  {med.totalQuantity || "--"}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-bold">
                                  {med.unit || "Units"}
                                </span>
                              </div>
                              <Progress
                                value={
                                  ((med.currentQuantity || 0) /
                                    (med.totalQuantity || 1)) *
                                  100
                                }
                                className="h-1.5 rounded-full overflow-hidden"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {med.currentStreak !== undefined &&
                            med.currentStreak > 0 ? (
                              <Badge className="rounded-full bg-orange-500/20 text-orange-600 border-orange-300 font-black px-2 py-0.5 text-[10px]">
                                <Flame className="h-3 w-3 mr-1 fill-orange-500" />
                                {med.currentStreak} Days
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/30 font-bold">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 text-xs font-bold text-muted-foreground">
                              <Clock
                                className="h-3.5 w-3.5 text-primary"
                                aria-hidden="true"
                              />
                              {med.expiryDate
                                ? format(new Date(med.expiryDate), "MMM yyyy")
                                : "No Expiry"}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {med.isUserAdded ? (
                              <Badge
                                variant="outline"
                                className="font-bold text-[10px] bg-muted/30 border-dashed"
                              >
                                Manual Entry
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="font-black text-[10px] bg-primary/5 text-primary border-primary/20"
                              >
                                {med.batchNumber}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const isRecentlyTaken =
                                !!med.lastDoseTaken &&
                                Date.now() -
                                  new Date(med.lastDoseTaken).getTime() <
                                  5 * 60 * 1000;
                              const isDoseDoneToday = !!med.isDoseDoneToday;
                              const isTakeDisabled =
                                isRecentlyTaken || isDoseDoneToday;
                              return (
                                <div className="flex items-center justify-end gap-1 opacity-100 group-hover:opacity-100 transition-opacity">
                                  {isRecentlyTaken && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-10 w-10 rounded-xl hover:bg-destructive/10 text-destructive transition-all active:scale-95"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleUndoDose(med._id, med.name);
                                      }}
                                      title="Undo Dose"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isTakeDisabled}
                                    className={cn(
                                      "h-10 w-10 rounded-xl transition-all active:scale-95",
                                      isDoseDoneToday
                                        ? "text-green-600/50 cursor-not-allowed"
                                        : isRecentlyTaken
                                          ? "text-muted-foreground/30"
                                          : "hover:bg-primary/10 text-primary",
                                    )}
                                    onClick={(e) =>
                                      handleTakeDose(e, med._id, med.name)
                                    }
                                    title={
                                      isDoseDoneToday
                                        ? "All doses taken today"
                                        : "Take Dose"
                                    }
                                    aria-label={
                                      isDoseDoneToday
                                        ? `All doses taken today for ${med.name}`
                                        : `Take dose for ${med.name}`
                                    }
                                  >
                                    <Plus className="h-5 w-5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 rounded-xl hover:bg-red-50 text-red-500/70 hover:text-red-500 transition-all active:scale-95"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDelete(med._id, med.name);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile List Mode Array (Cards as flat list) */}
                <div className="lg:hidden flex flex-col gap-4">
                  {medications.map((med) => (
                    <Card
                      key={med._id}
                      role="article"
                      tabIndex={0}
                      onClick={() =>
                        router.push(`/customer/cabinet/${med._id}`)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/customer/cabinet/${med._id}`);
                        }
                      }}
                      className={cn(
                        "p-4 sm:p-5 transition-all duration-500 flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border-primary/5 shadow-sm active:scale-[0.98] relative overflow-hidden cursor-pointer",
                        med.isUserAdded
                          ? "bg-muted/30"
                          : "bg-card/40 backdrop-blur-md",
                      )}
                    >
                      <div className="flex gap-4 items-center w-full sm:w-[200px] shrink-0 relative">
                        {med.currentStreak !== undefined &&
                          med.currentStreak > 0 && (
                            <Badge className="absolute -top-2 -right-1 rounded-full bg-orange-500 text-white border-2 border-background font-black px-1.5 py-0.5 text-[9px] shadow-lg z-20 flex items-center gap-0.5 animate-pulse zoom-in duration-300">
                              <Flame className="h-2.5 w-2.5 fill-current" />
                              {med.currentStreak}
                            </Badge>
                          )}
                        {med.images && med.images.length > 0 ? (
                          <div className="h-12 w-12 overflow-hidden shrink-0 shadow-sm border border-primary/10">
                            <img
                              src={resolveMediaUrl(med.images[0])}
                              alt={med.name}
                              className="h-full w-full object-cover"
                              crossOrigin="anonymous"
                            />
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "h-12 w-12 flex items-center justify-center shadow-inner shrink-0",
                              "bg-primary/10 text-primary",
                            )}
                          >
                            {med.isUserAdded ? (
                              <Pill className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <ShieldCheck
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
                            {med.name}
                          </h3>
                          <p className="text-[10px] text-muted-foreground font-black mt-0.5 opacity-70 truncate">
                            {med.brand}
                          </p>
                        </div>
                      </div>

                      <div className="w-full sm:flex-1">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] font-black text-muted-foreground opacity-60">
                            Inventory
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-black tabular-nums",
                              (med.currentQuantity || 0) < 5
                                ? "text-destructive"
                                : "text-foreground",
                            )}
                          >
                            {med.currentQuantity || 0} /{" "}
                            {med.totalQuantity || "--"}
                          </span>
                        </div>
                        <Progress
                          value={
                            ((med.currentQuantity || 0) /
                              (med.totalQuantity || 1)) *
                            100
                          }
                          className="h-1.5 rounded-full"
                        />
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-2 shrink-0">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                          <Clock
                            className="h-3 w-3 text-primary"
                            aria-hidden="true"
                          />
                          {med.expiryDate
                            ? format(new Date(med.expiryDate), "MMM yyyy")
                            : "No Expiry"}
                        </div>

                        <div className="flex items-center gap-1">
                          {(() => {
                            const isRecentlyTaken =
                              !!med.lastDoseTaken &&
                              Date.now() -
                                new Date(med.lastDoseTaken).getTime() <
                                5 * 60 * 1000;
                            const isDoseDoneToday = !!med.isDoseDoneToday;
                            const isTakeDisabled =
                              isRecentlyTaken || isDoseDoneToday;
                            return (
                              <>
                                {isRecentlyTaken && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleUndoDose(med._id, med.name);
                                    }}
                                    className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  disabled={isTakeDisabled}
                                  onClick={(e) =>
                                    handleTakeDose(e, med._id, med.name)
                                  }
                                  className={cn(
                                    "h-8 px-3 rounded-lg text-[10px] font-black transition-all",
                                    isDoseDoneToday
                                      ? "bg-green-500/10 text-green-700 border-green-300/50 cursor-not-allowed"
                                      : isRecentlyTaken
                                        ? "bg-muted text-muted-foreground border-border/50"
                                        : "bg-primary/5 hover:bg-primary hover:text-primary-foreground border-primary/20 text-primary",
                                  )}
                                >
                                  {isDoseDoneToday
                                    ? "Done"
                                    : isRecentlyTaken
                                      ? "Taken"
                                      : "Dose"}
                                </Button>
                              </>
                            );
                          })()}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(med._id, med.name);
                            }}
                            className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
