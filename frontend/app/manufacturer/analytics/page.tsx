"use client";

import { useEffect, useState, useRef } from "react";
import {
  format,
  differenceInDays,
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
  Download,
  Package,
  ShieldCheck,
  Calendar as CalendarIcon,
  MapPin,
  Boxes,
  Globe,
  AlertTriangle,
  ArrowRight,
  Loader2,
  MousePointerClick,
  ExternalLink,
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
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);

  // Replaced static 30 with Shadcn DateRange state
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [entityTotals, setEntityTotals] = useState<Record<string, number>>({
    all: 0,
  });
  const [activeTab, setActiveTab] = useState<string>("all");

  const [topBatches, setTopBatches] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    products: 0,
    batches: 0,
    totalScans: 0,
    securityIncidents: 0,
  });
  const fetchAbortRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      const startDate = dateRange?.from || subDays(new Date(), 30);
      const endDate = dateRange?.to || new Date();

      setIsLoading(true);
      try {
        const fromStr = startOfDay(startDate).toISOString();
        const toStr = endOfDay(endDate).toISOString();

        const [productsRes, batchesRes, timelineRes, geoRes, threatsRes] =
          await Promise.all([
            listProducts({}, controller.signal),
            listBatches({}, controller.signal),
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
            getThreatAnalytics(controller.signal),
          ]);

        if (controller.signal.aborted) return;

        const products = productsRes.products || [];
        const batches = batchesRes.batches || [];
        const history = timelineRes.history || [];
        const totals = timelineRes.metadata?.totals || { all: 0 };
        const geoSegments = geoRes.distribution || [];
        const threatIntel = threatsRes.threats || [];

        const totalScans = batches.reduce(
          (acc: number, b: any) => acc + (Number(b.totalScans) || 0),
          0,
        );

        setStats({
          products: products.length,
          batches: batches.length,
          totalScans: totals.all,
          securityIncidents: threatIntel.length,
        });

        setScanHistory(history);
        setEntityTotals(totals);
        setGeoData(geoSegments);

        const sortedBatches = [...batches]
          .sort(
            (a: any, b: any) =>
              (Number(b.totalScans) || 0) - (Number(a.totalScans) || 0),
          )
          .slice(0, 8);
        setTopBatches(sortedBatches);
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("Failed to fetch analytics:", error);
        toast.error("Could not load intelligence data.");
      } finally {
        if (fetchAbortRef.current === controller) {
          setIsLoading(false);
        }
      }
    };

    fetchAnalytics();
    return () => fetchAbortRef.current?.abort();
  }, [dateRange, activeTab]);

  if (isLoading && scanHistory.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground font-medium">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full gap-8 pb-12 overflow-y-auto pr-1 custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 sticky top-0 z-20 bg-background/95 backdrop-blur-sm py-2">
        <h1 className="text-2xl sm:text-4xl font-black tracking-tighter text-foreground leading-none">
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
                    "w-full justify-start text-left font-normal h-11 rounded-full",
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
                  <DrawerTitle>Select Date Range</DrawerTitle>
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
                    "w-[260px] justify-start text-left font-normal h-10 rounded-full",
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
              className="w-full sm:w-auto gap-2 shadow-sm font-semibold group h-11 sm:h-10 rounded-full"
            >
              <Activity className="h-4 w-4" />
              Scan Details
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
                Scan Volume
              </CardTitle>
              <CardDescription>
                Detailed scan activity and scan trends
              </CardDescription>
            </div>
            <div className="flex flex-wrap border-t sm:border-t-0 sm:border-l">
              {[
                { id: "all", label: "Total Scans", total: entityTotals.all },
                {
                  id: "product",
                  label: "By Products",
                  total: entityTotals.all,
                },
                { id: "batch", label: "By Batches", total: entityTotals.all },
              ].map((tab) => (
                <button
                  key={tab.id}
                  data-active={activeTab === tab.id}
                  className="flex flex-1 min-w-[100px] flex-col justify-center gap-1 px-4 py-3 sm:px-6 sm:py-4 text-left data-[active=true]:bg-muted/50 transition-colors border-r last:border-r-0"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold leading-none">
                    {tab.label}
                  </span>
                  <span className="text-lg leading-none font-black sm:text-2xl">
                    {tab.total >= 1000
                      ? `${(tab.total / 1000).toFixed(1)}k`
                      : tab.total}
                  </span>
                </button>
              ))}
            </div>
          </CardHeader>

          <div className="flex-1 w-full min-h-[220px]">
            {scanHistory.length > 0 ? (
              <ChartContainer
                config={lineChartConfig}
                className="h-full w-full"
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
                      stroke="var(--color-count)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  ) : (
                    Object.keys(entityTotals)
                      .filter((k) => k !== "all")
                      .slice(0, 5)
                      .map((key, index) => (
                        <Line
                          key={key}
                          dataKey={key}
                          type="monotone"
                          stroke={`var(--chart-${(index % 5) + 1})`}
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
                <p className="text-sm font-medium">No activity in period</p>
              </div>
            )}
          </div>
        </Card>

        {/* Executive Summary */}
        <Card className="lg:col-span-1 rounded-xl shadow-sm flex flex-col min-h-[320px] overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-black tracking-tight">
              Executive Summary
            </CardTitle>
            <CardDescription>Fleet-wide performance overview</CardDescription>
          </CardHeader>
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Products
                  </p>
                  <p className="text-2xl font-black tracking-tight">
                    {stats.products}
                  </p>
                </div>
                <div className="p-2.5 bg-blue-500/10 rounded-lg">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
              </div>

              <div className="flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Active Batches
                  </p>
                  <p className="text-2xl font-black tracking-tight">
                    {stats.batches}
                  </p>
                </div>
                <div className="p-2.5 bg-primary/10 rounded-lg">
                  <Boxes className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Total Scans
                  </p>
                  <p className="text-2xl font-black tracking-tight">
                    {stats.totalScans >= 1000
                      ? `${(stats.totalScans / 1000).toFixed(1)}k`
                      : stats.totalScans}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                </div>
              </div>

              <div className="flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Incidents
                  </p>
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
                    "p-2.5 rounded-lg",
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
              Regional Scans
            </CardTitle>
            <CardDescription>
              Geographic distribution of product verifications
            </CardDescription>
          </CardHeader>
          <div className="p-6 flex-1 w-full min-h-[300px]">
            {geoData.length > 0 ? (
              <ChartContainer config={geoChartConfig} className="h-full w-full">
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
                    fill="var(--color-count)"
                    radius={4}
                    barSize={32}
                  >
                    <LabelList
                      dataKey="city"
                      position="insideLeft"
                      offset={12}
                      className="fill-[hsl(var(--background))] font-medium"
                      fontSize={12}
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
        <Card className="lg:col-span-1 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
          <CardHeader className="border-b gap-0.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-black tracking-tight">
                Batch Performance
              </CardTitle>
              <Badge
                variant="outline"
                className="font-bold uppercase tracking-widest text-[9px] px-1.5 h-4 border-primary/20 text-primary bg-primary/5"
              >
                Top Rank
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Engagement volume by production run
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-card z-10 border-b">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                    Batch ID
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-right">
                    Scan Index
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {topBatches.map((batch, i) => (
                  <tr
                    key={i}
                    className="hover:bg-muted/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <Link
                        href={`/manufacturer/analytics/scans?batchNumber=${batch.batchNumber}`}
                        className="flex flex-col gap-0.5"
                      >
                        <div className="flex items-center gap-1.5 font-black tracking-tight text-sm sm:text-base group-hover:text-primary transition-colors">
                          {batch.batchNumber}
                          <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all sm:inline hidden" />
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-tight truncate max-w-[80px] sm:max-w-none">
                          {batch.productName}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                      <div className="flex items-center justify-end gap-2 sm:gap-4">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm sm:text-base font-black tracking-tighter tabular-nums">
                            {batch.totalScans}
                          </span>
                          <div className="h-1 w-12 sm:w-20 bg-muted rounded-full overflow-hidden hidden xs:block">
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
                              <Link href={`/manufacturer/batches/${batch._id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary transition-colors shrink-0"
                                >
                                  <ExternalLink className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent
                              side="left"
                              className="text-xs font-bold bg-primary text-primary-foreground border-none"
                            >
                              View Profile
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
          <div className="px-6 py-4 border-t">
            <Link href="/manufacturer/analytics/scans">
              <Button variant="ghost" className="w-full text-sm hover:bg-muted">
                View Detailed Scans <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
