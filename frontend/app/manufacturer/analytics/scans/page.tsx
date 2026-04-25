"use client";

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  MapPin,
  Boxes,
  TrendingUp,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Calendar as CalendarIcon,
  Search,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, getEntityColor } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { listBatches } from "@/api/batch.api";
import {
  getTimelineAnalytics,
  getGeographicAnalytics,
  getScanDetails,
} from "@/api/analytics.api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { format, startOfDay, endOfDay, subDays, parseISO } from "date-fns";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  StatsSkeleton,
  ChartSkeleton,
  GeoSkeleton,
  TableSkeleton,
} from "@/components/manufacturer/analytics-skeletons";

function ScanAnalysisContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlBatchNumber = searchParams.get("batchNumber");
  const urlFrom = searchParams.get("from");
  const urlTo = searchParams.get("to");

  const [isLoading, setIsLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<string | null>(
    urlBatchNumber || null,
  );

  const [dateRange, setDateRange] = useState<any>({
    from: urlFrom ? parseISO(urlFrom) : subDays(new Date(), 30),
    to: urlTo ? parseISO(urlTo) : new Date(),
  });

  const [scanData, setScanData] = useState<any>(null);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [batchSearch, setBatchSearch] = useState("");
  const [batchSelectorOpen, setBatchSelectorOpen] = useState(false);

  // Deep Dive Modal States
  const [activeModal, setActiveModal] = useState<"geo" | "risk" | "log" | null>(
    null,
  );

  const isMobile = useIsMobile();
  const batchesAbortRef = useRef<AbortController | null>(null);
  const detailsAbortRef = useRef<AbortController | null>(null);

  const batchColor = getEntityColor(selectedBatchNumber || "");

  const updateUrlParams = useCallback(
    (newBatch: string | null, newDates: { from?: Date; to?: Date }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newBatch) params.set("batchNumber", newBatch);
      if (newDates.from) params.set("from", newDates.from.toISOString());
      if (newDates.to) params.set("to", newDates.to.toISOString());

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleBatchSelect = (batchNumber: string) => {
    setSelectedBatchNumber(batchNumber);
    updateUrlParams(batchNumber, dateRange);
    setBatchSelectorOpen(false);
  };

  const handleDateSelect = (range: any) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      updateUrlParams(selectedBatchNumber, range);
    }
  };

  useEffect(() => {
    const fetchBatches = async () => {
      if (batchesAbortRef.current) batchesAbortRef.current.abort();
      const controller = new AbortController();
      batchesAbortRef.current = controller;

      try {
        const res = await listBatches({}, controller.signal);
        const batchList = res.batches || [];
        setBatches(batchList);

        if (!selectedBatchNumber && batchList.length > 0) {
          handleBatchSelect(batchList[0].batchNumber);
        } else if (batchList.length === 0) {
          setIsLoading(false);
        }
      } catch (error: any) {
        if (error.name === "AbortError") return;
        toast.error("Could not load batches.");
        setIsLoading(false);
      }
    };
    fetchBatches();
    return () => batchesAbortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBatchNumber) return;

    const fetchDetails = async () => {
      if (detailsAbortRef.current) detailsAbortRef.current.abort();
      const controller = new AbortController();
      detailsAbortRef.current = controller;

      const startDate = dateRange?.from || subDays(new Date(), 30);
      const endDate = dateRange?.to || new Date();

      setDetailsLoading(true);
      try {
        const fromStr = startOfDay(startDate).toISOString();
        const toStr = endOfDay(endDate).toISOString();

        const [timelineRes, geoRes, detailRes] = await Promise.all([
          getTimelineAnalytics(
            {
              batchNumber: selectedBatchNumber,
              groupBy: "total",
              from: fromStr,
              to: toStr,
            },
            controller.signal,
          ),
          getGeographicAnalytics(
            {
              batchNumber: selectedBatchNumber,
              from: startOfDay(subDays(new Date(), 365)).toISOString(),
              to: endOfDay(new Date()).toISOString(),
            },
            controller.signal,
          ),
          getScanDetails(
            {
              batchNumber: selectedBatchNumber,
              limit: 500, // Fetch more for deep-dive views
              from: fromStr,
              to: toStr,
            },
            controller.signal,
          ),
        ]);

        const selectedBatch = batches.find(
          (b) => b.batchNumber === selectedBatchNumber,
        );

        setScanData({
          batch: {
            ...selectedBatch,
            totalScans: detailRes.total || 0,
          },
          scans: detailRes.scans || [],
        });
        setGeoData(geoRes.distribution || []);
        setHistory(timelineRes.history || []);
      } catch (error: any) {
        if (error.name === "AbortError") return;
        toast.error("Could not load scan details for this batch.");
      } finally {
        if (detailsAbortRef.current === controller) {
          setDetailsLoading(false);
          setIsLoading(false);
        }
      }
    };
    fetchDetails();
    return () => detailsAbortRef.current?.abort();
  }, [selectedBatchNumber, dateRange, batches]);

  if (isLoading && batches.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium">
          Loading analytics workspace...
        </p>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="h-full flex flex-1 flex-col items-center justify-center gap-6 text-center min-h-[50vh]">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Boxes className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-2xl tracking-tight font-bold">
            No batches found
          </h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-md">
            You need to enroll at least one batch before you can analyze scan
            data.
          </p>
        </div>
        <Button asChild className="rounded-full px-8 active:scale-95 transition-all">
          <Link href="/manufacturer/batches/new">Enroll now</Link>
        </Button>
      </div>
    );
  }

  const unitStats: any[] = [];
  const unitMap: Record<number, number> = {};
  const suspiciousScans =
    scanData?.scans.filter((s: any) => s.isSuspicious) || [];

  if (scanData) {
    scanData.scans.forEach((s: any) => {
      unitMap[s.unitIndex] = (unitMap[s.unitIndex] || 0) + 1;
    });
    Object.keys(unitMap).forEach((idx) => {
      unitStats.push({ index: Number(idx), count: unitMap[Number(idx)] });
    });
  }

  const sortedGeo = geoData.slice(0, 5);
  const filteredBatches = batches.filter(
    (b) =>
      b.batchNumber.toLowerCase().includes(batchSearch.toLowerCase()) ||
      b.productName.toLowerCase().includes(batchSearch.toLowerCase()),
  );

  const selectedBatchObj = batches.find(
    (b) => b.batchNumber === selectedBatchNumber,
  );

  // Reusable Batch Selection List component
  const BatchSelectionList = () => (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search batches..."
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          value={batchSearch}
          onChange={(e) => setBatchSearch(e.target.value)}
        />
      </div>
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
        {filteredBatches.length > 0 ? (
          filteredBatches.map((batch) => (
            <Button
              key={batch.batchNumber}
              variant={selectedBatchNumber === batch.batchNumber ? "secondary" : "outline"}
              onClick={() => handleBatchSelect(batch.batchNumber)}
              className={cn(
                "w-full text-left p-3 h-auto rounded-xl border transition-all flex items-center justify-between group",
                selectedBatchNumber === batch.batchNumber
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card hover:border-primary/40 hover:bg-card/80",
              )}
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {batch.batchNumber}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                  {batch.productName}
                </p>
              </div>
              {selectedBatchNumber === batch.batchNumber && (
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
              )}
            </Button>
          ))
        ) : (
          <p className="text-sm text-center text-muted-foreground py-4">
            No batches match your search.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* --------------------- CONTEXTUAL DIALOGS --------------------- */}

      {/* Geo Distribution Full View */}
      <ResponsiveDialog
        open={activeModal === "geo"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      >
        <ResponsiveDialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              Geographic Distribution
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="overflow-y-auto custom-scrollbar p-1 pb-6 space-y-4">
            {geoData.length > 0 ? (
              geoData.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-sm font-medium truncate">
                        {item.city}, {item.country}
                      </p>
                      <span className="text-sm font-medium text-muted-foreground">
                        {item.count} scans
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full"
                        style={{
                          width: `${(item.count / scanData?.batch.totalScans) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No geographic data available.
              </p>
            )}
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* High-Risk Units Full View */}
      <ResponsiveDialog
        open={activeModal === "risk"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      >
        <ResponsiveDialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>High-Risk Units</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="overflow-y-auto custom-scrollbar p-1 pb-6 space-y-3">
            {suspiciousScans.length > 0 ? (
              suspiciousScans.map((scan: any, i: number) => (
                <div
                  key={i}
                  className="flex flex-col p-4 rounded-xl border bg-destructive/5 border-destructive/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-destructive">
                      Unit #{scan.unitIndex}
                    </p>
                    <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded">
                      {scan.ip}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 mb-3">
                    {scan.suspiciousReason ||
                      "Multiple rapid scans from inconsistent IPs."}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Flagged:{" "}
                      {format(
                        new Date(scan.createdAt),
                        "MMM dd, yyyy HH:mm:ss",
                      )}
                    </span>
                    <span>
                      Location: {scan.city}, {scan.country}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No suspicious units detected in this batch.
              </p>
            )}
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Scan Log Full View */}
      <ResponsiveDialog
        open={activeModal === "log"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      >
        <ResponsiveDialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Scan Activity Log</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="overflow-y-auto custom-scrollbar p-1 pb-6">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Unit index</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">IP address</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {scanData?.scans.map((scan: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-xs">
                        {format(new Date(scan.createdAt), "MMM dd, HH:mm:ss")}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">
                        #{scan.unitIndex}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {scan.city}, {scan.country}
                      </td>
                      <td className="px-4 py-3">
                        {scan.isSuspicious ? (
                          <Badge
                            variant="destructive"
                            className="bg-destructive/10 text-destructive border-none text-[10px]"
                          >
                            Risk
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                          {scan.ip}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* --------------------- MAIN DASHBOARD --------------------- */}

      <PageHeader
        title="Scan Analytics"
        backHref="/manufacturer/analytics"
        actions={
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Batch Selector */}
            {isMobile ? (
              <Drawer
                open={batchSelectorOpen}
                onOpenChange={setBatchSelectorOpen}
              >
                <DrawerTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-[240px] justify-between rounded-full h-11 bg-card active:scale-95 transition-all"
                  >
                    <span className="truncate flex items-center gap-2 font-medium">
                      <Boxes className="h-4 w-4 text-muted-foreground transition-colors" />
                      {selectedBatchObj?.batchNumber || "Select batch"}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 transition-transform" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[85dvh]">
                  <DrawerHeader className="text-left px-6">
                    <DrawerTitle className="text-xl font-bold">
                      Select target batch
                    </DrawerTitle>
                  </DrawerHeader>
                  <div className="p-6 pt-2">
                    <BatchSelectionList />
                  </div>
                </DrawerContent>
              </Drawer>
            ) : (
              <Popover
                open={batchSelectorOpen}
                onOpenChange={setBatchSelectorOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[240px] justify-between rounded-full h-10 bg-card active:scale-95 transition-all"
                  >
                    <span className="truncate flex items-center gap-2 font-medium">
                      <Boxes className="h-4 w-4 text-muted-foreground transition-colors" />
                      {selectedBatchObj?.batchNumber || "Select batch"}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 transition-transform" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[300px] p-3 rounded-2xl shadow-xl border-border/50"
                  align="end"
                >
                  <BatchSelectionList />
                </PopoverContent>
              </Popover>
            )}

            {/* Date Picker */}
            {isMobile ? (
              <Drawer>
                <DrawerTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-auto justify-start text-left font-normal h-11 rounded-full bg-card active:scale-95 transition-all text-xs",
                      !dateRange && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 transition-colors" />
                    <span className="truncate font-medium">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </span>
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[95dvh]">
                  <DrawerHeader className="text-left px-6">
                    <DrawerTitle className="text-xl font-bold">
                      Select date range
                    </DrawerTitle>
                  </DrawerHeader>
                  <div className="p-6 pb-8 flex justify-center overflow-y-auto">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={handleDateSelect}
                      numberOfMonths={1}
                      className="rounded-2xl border border-border/50"
                    />
                  </div>
                </DrawerContent>
              </Drawer>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[260px] justify-start text-left font-normal h-10 rounded-full bg-card active:scale-95 transition-all text-[10px]",
                      !dateRange && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 transition-colors" />
                    <span className="truncate font-medium">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border/50" align="end">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={handleDateSelect}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        }
      />

      {/* Main Workspace */}
      <div className="space-y-6">
        {detailsLoading && !scanData ? (
          <div className="space-y-6">
            <StatsSkeleton />
            <Card className="p-6 h-[400px]">
              <ChartSkeleton />
            </Card>
          </div>
        ) : scanData ? (
          <>
            {/* Global Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="p-4 sm:p-6 rounded-2xl border bg-muted/20 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  TOTAL SCANS
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold">
                  {detailsLoading ? <Skeleton className="h-8 w-12" /> : scanData.batch.totalScans}
                </h3>
              </Card>

              <Card className="p-4 sm:p-6 rounded-2xl border bg-muted/20 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                   UNIQUE UNITS
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold">
                  {detailsLoading ? <Skeleton className="h-8 w-12" /> : unitStats.length}
                </h3>
              </Card>

              <Card
                className={cn(
                  "p-4 sm:p-6 rounded-2xl lg:col-span-1 col-span-2 flex flex-col justify-center border transition-colors",
                  !detailsLoading && scanData.scans.some((s: any) => s.isSuspicious)
                    ? "bg-destructive/5 border-destructive/20"
                    : "bg-card",
                )}
              >
                <p
                  className={cn(
                    "text-xs font-medium mb-1 uppercase tracking-wider",
                    !detailsLoading && scanData.scans.some((s: any) => s.isSuspicious)
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  RISK STATUS
                </p>
                <div className="flex items-center gap-2">
                  {detailsLoading ? (
                    <Skeleton className="h-6 w-32" />
                  ) : (
                    <>
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          scanData.scans.some((s: any) => s.isSuspicious)
                            ? "bg-destructive animate-pulse"
                            : "bg-green-500",
                        )}
                      />
                      <span className="text-lg sm:text-xl font-bold">
                        {scanData.scans.some((s: any) => s.isSuspicious)
                          ? "Threats detected"
                          : "No threats detected"}
                      </span>
                    </>
                  )}
                </div>
              </Card>
            </div>

            {/* Timeline Activity */}
            <Card className="p-4 sm:p-6 rounded-2xl bg-card border shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-full flex items-center justify-center transition-colors text-center"
                    style={{
                      backgroundColor: selectedBatchNumber ? `hsl(${getEntityColor(selectedBatchNumber).match(/\d+/g)?.[0] || 0}, 80%, 50%, 0.15)` : "hsl(var(--primary) / 0.1)",
                      color: selectedBatchNumber ? getEntityColor(selectedBatchNumber) : "hsl(var(--primary))",
                    }}
                  >
                    <TrendingUp className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Activity Trend</h3>
                    <p className="text-xs text-muted-foreground">
                      Scan volume over selected period
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs font-bold rounded-lg h-8 active:scale-95 transition-all"
                  onClick={() => setActiveModal("log")}
                >
                  View Logs
                </Button>
              </div>

              <div className="h-[220px] w-full">
                {detailsLoading ? (
                  <ChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={history}
                      margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorCount"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--muted)/0.4)"
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 11,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        tickFormatter={(val) => format(new Date(val), "MMM dd")}
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          fontSize: "12px",
                        }}
                        labelFormatter={(val) =>
                          format(new Date(val), "MMMM dd, yyyy")
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke={batchColor}
                        fillOpacity={1}
                        fill="url(#colorCount)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Geographic & Risks Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Geographic Distribution Widget */}
              <Card className="p-4 sm:p-6 rounded-2xl bg-card border flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold">
                        Geographic distribution
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Top verification locations
                      </p>
                    </div>
                  </div>
                  {geoData.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveModal("geo")}
                      className="h-8 text-xs text-primary hover:text-primary"
                    >
                      View all
                    </Button>
                  )}
                </div>

                <div className="space-y-4 flex-1">
                  {detailsLoading ? (
                    <GeoSkeleton />
                  ) : geoData.length > 0 ? (
                    sortedGeo.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1.5">
                            <p className="text-sm font-medium truncate pr-2">
                              {item.city}, {item.country}
                            </p>
                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {item.count} scans
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${(item.count / scanData.batch.totalScans) * 100}%`,
                                backgroundColor: batchColor,
                                opacity: 0.8,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center h-full flex items-center justify-center">
                      No geographic data captured yet.
                    </p>
                  )}
                </div>
              </Card>

              {/* High-Risk Units Widget */}
              <Card className="p-4 sm:p-6 rounded-2xl bg-card border flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-bold">High-risk units</h3>
                  </div>
                  {suspiciousScans.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveModal("risk")}
                      className="h-8 text-xs text-primary hover:text-primary"
                    >
                      View all
                    </Button>
                  )}
                </div>

                <div className="space-y-3 flex-1">
                  {detailsLoading ? (
                    <TableSkeleton />
                  ) : suspiciousScans.length > 0 ? (
                    suspiciousScans.slice(0, 5).map((scan: any, i: number) => (
                      <div
                        key={i}
                        className="flex flex-col p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">
                            Unit #{scan.unitIndex}
                          </p>
                          <Badge variant="destructive" className="text-[10px]">
                            Suspicious
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {scan.suspiciousReason ||
                            "Multiple rapid scans from inconsistent IPs."}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Flagged:{" "}
                          {format(new Date(scan.createdAt), "MMM dd, HH:mm")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center h-full flex items-center justify-center">
                      No suspicious units detected.
                    </p>
                  )}
                </div>
              </Card>
            </div>

            {/* Recent Log Widget */}
            <Card className="p-4 sm:p-6 rounded-2xl bg-card border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Recent scan activity</h3>
                    <p className="text-xs text-muted-foreground">
                      Latest verification events
                    </p>
                  </div>
                </div>
                {scanData.scans.length > 10 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveModal("log")}
                    className="h-8 text-xs text-primary hover:text-primary"
                  >
                    View all logs
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Timestamp</th>
                      <th className="px-4 py-3 font-medium">Location</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">IP address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {scanData.scans.slice(0, 10).map((scan: any, i: number) => (
                      <tr
                        key={i}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs">
                          {format(new Date(scan.createdAt), "MMM dd, HH:mm:ss")}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {scan.city}, {scan.country}
                        </td>
                        <td className="px-4 py-3">
                          {scan.isSuspicious ? (
                            <Badge
                              variant="destructive"
                              className="bg-destructive/10 text-destructive border-none text-[10px]"
                            >
                              Risk
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                            {scan.ip}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <ShieldCheck className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium">No analytics data captured</p>
            <p className="text-xs max-w-xs">
              Scan data will appear here once consumers verify units from this
              batch on the blockchain.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScanAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Loading analytics...
          </p>
        </div>
      }
    >
      <ScanAnalysisContent />
    </Suspense>
  );
}
