"use client";

import { useEffect, useState, useRef } from "react";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
} from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  Package,
  ShieldCheck,
  Calendar as CalendarIcon,
  Globe,
  AlertTriangle,
  ArrowRight,
  Loader2,
  ExternalLink,
  Boxes,
} from "lucide-react";
import { listProducts } from "@/api/product.api";
import { listBatches } from "@/api/batch.api";
import {
  getTimelineAnalytics,
  getGeographicAnalytics,
  getThreatAnalytics,
} from "@/api/analytics.api";
import { toast } from "sonner";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  LabelList,
  Line,
  LineChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import Link from "next/link";
import { cn, getEntityColor } from "@/lib/utils";
import {
  StatsSkeleton,
  ChartSkeleton,
  GeoSkeleton,
} from "@/components/manufacturer/analytics-skeletons";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { parseISO } from "date-fns";

export default function AnalyticsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [isGeoLoading, setIsGeoLoading] = useState(false);

  // Initialize from URL
  const urlTab = searchParams.get("tab") || "all";
  const urlFrom = searchParams.get("from");
  const urlTo = searchParams.get("to");

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: urlFrom ? parseISO(urlFrom) : subDays(new Date(), 30),
    to: urlTo ? parseISO(urlTo) : new Date(),
  });

  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [entityTotals, setEntityTotals] = useState<Record<string, number>>({
    all: 0,
  });
  const [activeTab, setActiveTab] = useState<string>(urlTab);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", activeTab);
    if (dateRange?.from) params.set("from", dateRange.from.toISOString());
    else params.delete("from");
    if (dateRange?.to) params.set("to", dateRange.to.toISOString());
    else params.delete("to");

    const queryString = params.toString();
    if (queryString !== searchParams.toString()) {
      router.replace(`${pathname}?${queryString}`, { scroll: false });
    }
  }, [activeTab, dateRange, pathname, router, searchParams]);

  const [topBatches, setTopBatches] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [threats, setThreats] = useState<any[]>([]);
  const [activeModal, setActiveModal] = useState<"geo" | "incidents" | null>(null);
  const [geoActiveTab, setGeoActiveTab] = useState<"product" | "batch">("product");

  const [stats, setStats] = useState({
    products: 0,
    batches: 0,
    totalScans: 0,
    securityIncidents: 0,
  });
  const baseFetchAbortRef = useRef<AbortController | null>(null);
  const operationalFetchAbortRef = useRef<AbortController | null>(null);

  const geoChartConfig = {
    count: {
      label: "Scans",
      color: "hsl(var(--chart-2))",
    },
    label: {
      color: "hsl(var(--background))",
    },
  } satisfies ChartConfig;

  const lineChartConfig = {
    count: {
      label: "Scans",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  const isMobile = useIsMobile();

  // Effect 1: Fetch Base Data (Products, Batches, Threats) - Once on mount
  useEffect(() => {
    const fetchBaseData = async () => {
      if (baseFetchAbortRef.current) baseFetchAbortRef.current.abort();
      const controller = new AbortController();
      baseFetchAbortRef.current = controller;

      try {
        const [productsRes, batchesRes, threatsRes] = await Promise.all([
          listProducts({}, controller.signal),
          listBatches({}, controller.signal),
          getThreatAnalytics(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        const products = productsRes.products || [];
        const batches = batchesRes.batches || [];
        const threatIntel = threatsRes.threats || [];

        setStats((prev) => ({
          ...prev,
          products: products.length,
          batches: batches.length,
          securityIncidents: threatIntel.length,
        }));

        const sortedBatches = [...batches]
          .sort(
            (a: any, b: any) =>
              (Number(b.totalScans) || 0) - (Number(a.totalScans) || 0),
          )
          .slice(0, 8);
        setTopBatches(sortedBatches);
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("Failed to fetch base analytics:", error);
      } finally {
        if (baseFetchAbortRef.current === controller) {
          setIsInitialLoading(false);
        }
      }
    };

    fetchBaseData();
    return () => baseFetchAbortRef.current?.abort();
  }, []);

  // Effect 2: Fetch Operational Data (Timeline, Geography) - On Date/Tab change
  useEffect(() => {
    const fetchOperationalData = async () => {
      if (operationalFetchAbortRef.current)
        operationalFetchAbortRef.current.abort();
      const controller = new AbortController();
      operationalFetchAbortRef.current = controller;

      const startDate = dateRange?.from || subDays(new Date(), 30);
      const endDate = dateRange?.to || new Date();
      const fromStr = startOfDay(startDate).toISOString();
      const toStr = endOfDay(endDate).toISOString();

      setIsTimelineLoading(true);
      setIsGeoLoading(true);

      try {
        const [timelineRes, geoRes] = await Promise.all([
          getTimelineAnalytics(
            {
              from: fromStr,
              to: toStr,
              groupBy: activeTab === "all" ? "total" : (activeTab as any),
            },
            controller.signal,
          ),
          getGeographicAnalytics(
            { from: fromStr, to: toStr },
            controller.signal,
          ),
        ]);

        if (controller.signal.aborted) return;

        const history = timelineRes.history || [];
        const totals = timelineRes.metadata?.totals || { all: 0 };
        const geoSegments = geoRes.distribution || [];

        setScanHistory(history);
        setEntityTotals(totals);
        setGeoData(geoSegments);
        setStats((prev) => ({ ...prev, totalScans: totals.all }));
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("Failed to fetch operational analytics:", error);
        toast.error("Could not update analytics filters.");
      } finally {
        if (operationalFetchAbortRef.current === controller) {
          setIsTimelineLoading(false);
          setIsGeoLoading(false);
        }
      }
    };

    fetchOperationalData();
    return () => operationalFetchAbortRef.current?.abort();
  }, [dateRange, activeTab]);

  if (isInitialLoading && topBatches.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground font-medium">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Loading analytics workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full gap-8 pb-12 pr-1 custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 py-4 transition-all px-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none">
          Analytics
        </h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Date Range Picker */}
          {isMobile ? (
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-11 rounded-full active:scale-95 transition-all",
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
              <DrawerContent>
                <DrawerHeader className="text-left">
                  <DrawerTitle>Select date range</DrawerTitle>
                  <DrawerDescription>
                    Analyze data within a specific timeframe.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-4 pb-10 flex justify-center">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    className="rounded-md border shadow-none bg-transparent"
                  />
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
                    "w-[260px] justify-start text-left font-normal h-10 rounded-full active:scale-95 transition-all",
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

          <Link
            href="/manufacturer/analytics/scans"
            className="w-full sm:w-auto"
          >
            <Button
              variant="default"
              className="w-full sm:w-auto gap-2 shadow-sm font-semibold group h-11 sm:h-10 rounded-full active:scale-95 transition-all"
            >
              <Activity className="h-4 w-4" />
              Scan details
              <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform sm:inline hidden" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 1: Velocity (2/3) & Summary (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 shrink-0">
        {/* Verification Trends */}
        <Card className="lg:col-span-2 rounded-xl flex flex-col min-h-[400px] shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col items-stretch border-b p-0 sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4">
              <CardTitle className="text-lg font-black tracking-tight leading-none">
                Scan volume
              </CardTitle>
              <CardDescription>
                Detailed verification activity and scan trends
              </CardDescription>
            </div>
            <div className="flex flex-wrap border-t sm:border-t-0 sm:border-l">
              {[
                { id: "all", label: "Total scans", total: entityTotals.all },
                {
                  id: "product",
                  label: "By products",
                  total: entityTotals.all,
                },
                { id: "batch", label: "By batches", total: entityTotals.all },
              ].map((tab) => (
                <button
                  key={tab.id}
                  data-active={activeTab === tab.id}
                  className="flex flex-1 min-w-[100px] flex-col justify-center gap-1 px-4 py-3 sm:px-6 sm:py-4 text-left data-[active=true]:bg-muted/50 transition-all border-r last:border-r-0 active:scale-95"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="text-[10px] tracking-wider text-muted-foreground font-bold leading-none">
                    {tab.label}
                  </span>
                  <span className="text-lg leading-none font-black sm:text-2xl mt-1">
                    {tab.total >= 1000
                      ? `${(tab.total / 1000).toFixed(1)}k`
                      : tab.total}
                  </span>
                </button>
              ))}
            </div>
          </CardHeader>

          <div className="flex-1 w-full min-h-[220px]">
            {isTimelineLoading && scanHistory.length === 0 ? (
              <ChartSkeleton />
            ) : scanHistory.length > 0 ? (
              <ChartContainer
                config={lineChartConfig}
                className={cn(
                  "h-full w-full transition-opacity duration-300",
                  isTimelineLoading ? "opacity-50" : "opacity-100",
                )}
              >
                <LineChart
                  accessibilityLayer
                  data={scanHistory}
                  margin={{ left: 8, right: 8, top: 4, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={{
                      fontSize: 12,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickFormatter={(val) => {
                      try {
                        return format(new Date(val), "MMM dd");
                      } catch {
                        return val;
                      }
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 12,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  {activeTab === "all" ? (
                    <Line
                      dataKey="count"
                      type="monotone"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  ) : (
                    Object.keys(entityTotals)
                      .filter((k) => k !== "all")
                      .slice(0, 5)
                      .map((key) => (
                        <Line
                          key={key}
                          dataKey={key}
                          type="monotone"
                          stroke={getEntityColor(key)}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                      ))
                  )}
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 bg-muted/20 rounded-lg border border-dashed">
                <Activity className="h-8 w-8 opacity-50" />
                <p className="text-sm font-medium">No activity detected</p>
              </div>
            )}
          </div>
        </Card>

        {/* Executive Summary - Uppercase Labels Allowed here */}
        <Card className="lg:col-span-1 rounded-xl shadow-sm flex flex-col min-h-[320px] overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-black tracking-tight">
              Executive summary
            </CardTitle>
            <CardDescription>Product and batch performance</CardDescription>
          </CardHeader>
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">PRODUCTS</p>
                  <p className="text-2xl font-black tracking-tight">{stats.products}</p>
                </div>
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
              </div>

              <div className="flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">ACTIVE BATCHES</p>
                  <p className="text-2xl font-black tracking-tight">{stats.batches}</p>
                </div>
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Boxes className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">TOTAL SCANS</p>
                  <p className="text-2xl font-black tracking-tight">
                    {stats.totalScans >= 1000
                      ? `${(stats.totalScans / 1000).toFixed(1)}k`
                      : stats.totalScans}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                </div>
              </div>

              <div className="flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">INCIDENTS</p>
                  <p
                    className={cn(
                      "text-2xl font-black tracking-tight",
                      stats.securityIncidents > 0 ? "text-red-500" : "",
                    )}
                  >
                    {stats.securityIncidents}
                  </p>
                </div>
                <div
                  className={cn(
                    "p-2.5 rounded-xl",
                    stats.securityIncidents > 0 ? "bg-red-500/10" : "bg-muted",
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      "h-5 w-5",
                      stats.securityIncidents > 0
                        ? "text-red-500"
                        : "text-muted-foreground",
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Geography (2/3) & Batches (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 shrink-0">
        {/* Regional Density */}
        <Card className="lg:col-span-2 rounded-xl shadow-sm flex flex-col min-h-[300px] overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-black tracking-tight">
              Regional scans
            </CardTitle>
            <CardDescription>
              Geographic distribution of verifications
            </CardDescription>
          </CardHeader>
          <div className="p-6 flex-1 w-full min-h-[300px]">
            {isGeoLoading && geoData.length === 0 ? (
              <GeoSkeleton />
            ) : geoData.length > 0 ? (
              <ChartContainer
                config={geoChartConfig}
                className={cn(
                  "h-full w-full transition-opacity duration-300",
                  isGeoLoading ? "opacity-50" : "opacity-100",
                )}
              >
                <BarChart
                  accessibilityLayer
                  data={geoData}
                  layout="vertical"
                  margin={{ left: 0, right: 32, top: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis
                    dataKey="city"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    hide
                  />
                  <XAxis dataKey="count" type="number" hide />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Bar
                    dataKey="count"
                    layout="vertical"
                    fill="hsl(var(--primary))"
                    radius={4}
                    barSize={32}
                    style={{
                      fill: "hsl(var(--primary) / 0.8)",
                    }}
                  >
                    <LabelList
                      dataKey="city"
                      position="insideLeft"
                      offset={12}
                      className="fill-white font-bold text-[10px] uppercase tracking-tight"
                    />
                    <LabelList
                      dataKey="count"
                      position="right"
                      offset={12}
                      className="fill-foreground font-semibold"
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <Globe className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">Awaiting telemetry...</p>
              </div>
            )}
          </div>
        </Card>

        {/* Batch Ranking Table */}
        <Card className="lg:col-span-1 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <CardHeader className="border-b gap-0.5">
            <CardTitle className="text-xl font-black tracking-tight">
              Batch performance
            </CardTitle>
            <CardDescription className="text-xs">
              Engagement volume by production run
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-card z-10 border-b">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-[10px] font-bold text-muted-foreground">
                    Batch ID
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-[10px] font-bold text-muted-foreground text-right">
                    Scan index
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {topBatches.map((batch, i) => (
                  <tr
                    key={i}
                    onClick={() => router.push(`/manufacturer/analytics/scans?batchNumber=${batch.batchNumber}`)}
                    className="hover:bg-primary/[0.03] transition-all group cursor-pointer"
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 font-black tracking-tight text-sm sm:text-base group-hover:text-primary transition-colors">
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: getEntityColor(batch.batchNumber),
                            }}
                          />
                          {batch.batchNumber}
                          <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all sm:inline hidden" />
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium truncate max-w-[80px] sm:max-w-none">
                          {batch.productName}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 sm:gap-4">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm sm:text-base font-black tracking-tighter tabular-nums">
                            {batch.totalScans}
                          </span>
                          <div className="h-1.5 w-12 sm:w-20 bg-muted/50 rounded-full overflow-hidden hidden xs:block">
                            <div
                              className="h-full bg-primary"
                              style={{
                                width: `${Math.min(100, (batch.totalScans / (topBatches[0]?.totalScans || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link 
                                href={`/manufacturer/batches/${batch.batchNumber}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary transition-all active:scale-95 shrink-0"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                           <TooltipContent
                              side="top"
                              className="text-[10px] font-bold bg-primary text-primary-foreground border-none px-3 py-1.5"
                            >
                              Open profile
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t bg-muted/5">
            <Link href="/manufacturer/analytics/scans">
              <Button variant="ghost" className="w-full text-xs font-bold hover:bg-muted rounded-xl h-10 active:scale-95 transition-all">
                View detailed scans <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
