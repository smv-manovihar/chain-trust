"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Layers,
  Search,
  ChevronRight,
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
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { listBatches } from "@/api/batch.api";
import { getTimelineAnalytics, getGeographicAnalytics, getScanDetails } from "@/api/analytics.api";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

function ScanAnalysisContent() {
  const searchParams = useSearchParams();
  const urlBatchNumber = searchParams.get("batchNumber");
  const urlProductId = searchParams.get("productId");

  const [isLoading, setIsLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<any>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [scanData, setScanData] = useState<any>(null);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const isMobile = useIsMobile();
  const batchesAbortRef = useRef<AbortController | null>(null);
  const detailsAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchBatches = async () => {
      if (batchesAbortRef.current) batchesAbortRef.current.abort();
      const controller = new AbortController();
      batchesAbortRef.current = controller;

      try {
        const res = await listBatches({}, controller.signal);
        const batchList = res.batches || [];
        setBatches(batchList);
        
        if (urlBatchNumber) {
          setSelectedBatchNumber(urlBatchNumber);
        } else if (batchList.length > 0) {
          setSelectedBatchNumber(batchList[0].batchNumber);
        } else {
          setIsLoading(false);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error("Failed to fetch batches:", error);
        toast.error("Could not load batches.");
        setIsLoading(false);
      }
    };
    fetchBatches();
    return () => batchesAbortRef.current?.abort();
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
          getTimelineAnalytics({ 
            batchNumber: selectedBatchNumber, 
            groupBy: 'total',
            from: fromStr,
            to: toStr
          }, controller.signal),
          getGeographicAnalytics({ 
            batchNumber: selectedBatchNumber,
            from: startOfDay(subDays(new Date(), 365)).toISOString(),
            to: endOfDay(new Date()).toISOString()
          }, controller.signal),
          getScanDetails({ batchNumber: selectedBatchNumber, limit: 100, from: fromStr, to: toStr }, controller.signal)
        ]);

        const selectedBatch = batches.find(b => b.batchNumber === selectedBatchNumber);
        
        setScanData({
          batch: {
            ...selectedBatch,
            totalScans: detailRes.total || 0,
          },
          scans: detailRes.scans || []
        });
        setGeoData(geoRes.distribution || []);
        setHistory(timelineRes.history || []);
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error("Failed to fetch batch details:", error);
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

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">
          Scanning network for intelligence...
        </p>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
          <Boxes className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl tracking-tighter">No Batches Found</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-md">
            You need to enroll at least one batch before you can analyze scan
            data.
          </p>
        </div>
        <Button asChild className="rounded-full px-8 font-bold">
          <Link href="/manufacturer/batches/new">Enroll Now</Link>
        </Button>
      </div>
    );
  }

  // Aggregate unit data
  const unitStats: any[] = [];

  if (scanData) {
    // Unit Breakdown (from top scans in details)
    const unitMap: Record<number, number> = {};
    scanData.scans.forEach((s: any) => {
      unitMap[s.unitIndex] = (unitMap[s.unitIndex] || 0) + 1;
    });

    Object.keys(unitMap).forEach((idx) => {
      unitStats.push({ index: Number(idx), count: unitMap[Number(idx)] });
    });
  }

  const sortedGeo = geoData.slice(0, 5);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Link
          href="/manufacturer/analytics"
          className="flex items-center gap-2 text-[11px] tracking-tight text-muted-foreground hover:text-primary transition-colors group"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
          Back to Analytics
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl tracking-tighter leading-none">
              Scan Analysis
            </h1>
            <p className="text-muted-foreground text-sm font-medium mt-2">
              Unit-level tracking and geographic distribution analysis.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] tracking-tight opacity-60 italic">
            <ShieldCheck className="w-3 h-3" /> Root Source: Blockchain + GeoIP
          </div>
          {/* Date Picker Integration */}
          {isMobile ? (
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-11 rounded-full sm:hidden",
                    !dateRange && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="truncate">
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
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
              <DrawerContent className="rounded-t-[2.5rem] border-t-primary/10">
                <DrawerHeader className="text-left pt-8 px-6">
                  <DrawerTitle className="text-2xl font-black tracking-tight">Select Date Range</DrawerTitle>
                  <DrawerDescription className="text-muted-foreground font-medium">
                    Analyze data within a specific timeframe.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-6 pb-12 flex justify-center overflow-hidden">
                  <div className="p-1 rounded-3xl border bg-muted/20 backdrop-blur-sm">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                      className="rounded-3xl shadow-none"
                    />
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[260px] justify-start text-left font-normal hidden sm:flex h-10 rounded-full",
                    !dateRange && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="truncate">
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
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
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar: Batch Selector */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-[11px] tracking-tight text-muted-foreground px-1">
            Select Batch
          </h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {batches.map((batch) => (
              <button
                key={batch.batchNumber}
                onClick={() => setSelectedBatchNumber(batch.batchNumber)}
                className={`w-full text-left p-4 rounded-3xl border transition-all group ${
                  selectedBatchNumber === batch.batchNumber
                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                    : "bg-card/40 border-border/40 hover:border-primary/40 hover:bg-card/60"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm tracking-tight">{batch.batchNumber}</p>
                  <ChevronRight
                    className={`h-4 w-4 opacity-50 ${selectedBatchNumber === batch.batchNumber ? "translate-x-1" : ""}`}
                  />
                </div>
                <p
                  className={`text-[10px] font-bold truncate ${selectedBatchNumber === batch.batchNumber ? "opacity-90" : "text-muted-foreground"}`}
                >
                  {batch.productName}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Main Workspace */}
        <div className="lg:col-span-3 space-y-8">
          {detailsLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
            </div>
          ) : scanData ? (
            <>
              {/* Layer 0: Market Pulse (Timeline) */}
              <Card className="p-8 rounded-[2.5rem] bg-card/40 border-border/40 backdrop-blur-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight leading-none">Market Pulse</h3>
                      <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-wider">30-Day Activity Trend</p>
                    </div>
                  </div>
                </div>
                
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.2)" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(val) => format(new Date(val), "MMM dd")}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                        labelFormatter={(val) => format(new Date(val), "MMMM dd, yyyy")}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorCount)" 
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Layer 1: Global Stats for Batch */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-6 rounded-[2rem] border-none bg-primary/5 space-y-2">
                  <p className="text-[10px] tracking-tight text-primary">
                    Total Batch Scans
                  </p>
                  <h3 className="text-3xl tracking-tighter">
                    {scanData.batch.totalScans}
                  </h3>
                </Card>
                <Card className="p-6 rounded-[2rem] border-none bg-blue-500/5 space-y-2">
                  <p className="text-[10px] tracking-tight text-blue-600">
                    Unique Unit Index
                  </p>
                  <h3 className="text-3xl tracking-tighter">
                    {unitStats.length}
                  </h3>
                </Card>
                <Card className="p-6 rounded-[2rem] border-none bg-zinc-900 text-white lg:col-span-1 col-span-2 flex items-center justify-center text-center">
                  <div>
                    <p className="text-[9px] tracking-tight text-zinc-500 mb-1">
                      Status
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm tracking-tight">
                        Operational
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Layer 2: Geographic Distribution */}
              <div className="grid lg:grid-cols-2 gap-8">
                <Card className="p-8 rounded-[2.5rem] bg-card/40 border-border/40 backdrop-blur-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg tracking-tight">Geo Distribution</h3>
                  </div>

                  <div className="space-y-4">
                    {sortedGeo.length > 0 ? (
                      sortedGeo.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <p className="text-sm font-bold truncate">
                                {item.city}, {item.country}
                              </p>
                              <Badge
                                variant="secondary"
                                className="rounded-full font-bold opacity-80"
                              >
                                {item.count} scans
                              </Badge>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                                style={{
                                  width: `${(item.count / scanData.batch.totalScans) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground font-medium py-10 text-center italic">
                        No geographic data captured yet.
                      </p>
                    )}
                  </div>
                </Card>

                {/* Layer 3: Unit Level Risk Analysis */}
                <Card className="p-8 rounded-[2.5rem] bg-card/40 border-border/40 backdrop-blur-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg tracking-tight">High-Risk Units</h3>
                  </div>

                  <div className="space-y-3">
                    {[...scanData.scans]
                      .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
                      .slice(0, 5)
                      .map((scan: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-destructive/20 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <Layers
                              className={`h-4 w-4 ${scan.count > 5 ? "text-destructive" : "text-muted-foreground"}`}
                            />
                            <div>
                              <p className="text-sm font-bold tracking-tight">
                                Unit Index #{scan.unitIndex}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-medium">
                                Last:{" "}
                                {format(
                                  new Date(scan.createdAt),
                                  "MMM dd, HH:mm",
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm ${scan.count > 5 ? "text-destructive" : ""}`}
                            >
                              {scan.count || 1} Scans
                            </p>
                            {scan.count > 5 && (
                              <p className="text-[8px] text-destructive tracking-tight mt-0.5">
                                Alert Triggered
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    {scanData.scans.length === 0 && (
                      <p className="text-xs text-muted-foreground font-medium py-10 text-center italic">
                        No suspicious units detected.
                      </p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Layer 4: Real-time Activity Log */}
              <Card className="rounded-[2.5rem] bg-card/40 border-border/40 backdrop-blur-sm p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Activity className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg tracking-tight">
                      Recent Scan Activity
                    </h3>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold tracking-tight text-[9px] px-3">
                    Live Feed
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="px-6 py-4 text-[10px] tracking-tight text-muted-foreground">
                          Timestamp
                        </th>
                        <th className="px-6 py-4 text-[10px] tracking-tight text-muted-foreground">
                          Location
                        </th>
                        <th className="px-6 py-4 text-[10px] tracking-tight text-muted-foreground">
                          Result
                        </th>
                        <th className="px-6 py-4 text-[10px] tracking-tight text-muted-foreground">
                          IP Address
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {scanData.scans
                        .slice(0, 10)
                        .map((scan: any, i: number) => (
                          <tr
                            key={i}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <p className="text-xs font-bold whitespace-nowrap">
                                {format(
                                  new Date(scan.createdAt),
                                  "MMM dd, HH:mm:ss",
                                )}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs font-medium text-muted-foreground truncate max-w-[150px]">
                                {scan.city}, {scan.country}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-bold">
                                Verified
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-[10px] font-mono p-1 bg-muted/50 rounded inline-block text-muted-foreground">
                                {scan.ip}
                              </p>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center opacity-40">
              <ShieldCheck className="h-16 w-16" />
              <p className="text-sm tracking-tight">
                No Intelligence Data Captured
              </p>
              <p className="text-xs font-medium max-w-xs">
                Scan intelligence is generated when consumers verify units from
                this batch.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ScanAnalysisPage() {
  return (
    <Suspense fallback={
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Initializing intelligence suite...</p>
      </div>
    }>
      <ScanAnalysisContent />
    </Suspense>
  );
}
