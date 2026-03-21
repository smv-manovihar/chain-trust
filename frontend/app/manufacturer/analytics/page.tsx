"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  BarChart3,
  Activity,
  AlertTriangle,
  Download,
  Package,
  ShieldCheck,
  Zap,
  Clock,
  ExternalLink,
  ArrowUpRight,
  ArrowRight,
  Loader2,
  CalendarDays,
  MapPin,
  Boxes,
  Search,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { listProducts } from "@/api/product.api";
import { listBatches, getScanHistory } from "@/api/batch.api";
import { getNotifications, Notification } from "@/api/notification.api";
import { toast } from "sonner";
import { format, subDays, startOfDay } from "date-fns";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import Link from "next/link";

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // 7, 30, 90
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [topBatches, setTopBatches] = useState<any[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<Notification[]>([]);
  const [stats, setStats] = useState({
    products: 0,
    batches: 0,
    totalScans: 0,
    securityIncidents: 0,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const [productsRes, batchesRes, historyRes, notificationsRes] =
          await Promise.all([
            listProducts(),
            listBatches(),
            getScanHistory(timeRange),
            getNotifications(50), // Get more for the feed
          ]);

        const products = productsRes.products || [];
        const batches = batchesRes.batches || [];
        const history = historyRes.history || [];
        const notifications = notificationsRes.notifications || [];

        // Sum total scans
        const totalScans = batches.reduce((acc: number, b: any) => {
          const counts = Object.values(b.scanCounts || {}) as number[];
          return (
            acc + counts.reduce((a: number, c: number) => a + Number(c), 0)
          );
        }, 0);

        // Sort batches by total scans
        const sortedBatches = [...batches]
          .sort((a: any, b: any) => {
            const sumA = (Object.values(a.scanCounts || {}) as number[]).reduce(
              (sum: number, c: number) => sum + Number(c),
              0,
            );
            const sumB = (Object.values(b.scanCounts || {}) as number[]).reduce(
              (sum: number, c: number) => sum + Number(c),
              0,
            );
            return sumB - sumA;
          })
          .slice(0, 5);

        setStats({
          products: products.length,
          batches: batches.length,
          totalScans,
          securityIncidents: notifications.filter(
            (n: any) => n.type === "alert" && !n.isRead,
          ).length,
        });

        setScanHistory(history);
        setTopBatches(sortedBatches);
        setSecurityAlerts(notifications.filter((n: any) => n.type === "alert"));
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        toast.error("Could not load intelligence data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  if (isLoading && scanHistory.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground font-medium">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p>Synthesizing intelligence hub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 px-1">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter leading-none">
            Analytics
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2 flex items-center gap-2 italic">
            <Clock className="w-3.5 h-3.5" />
            Analyzing {timeRange} days of cryptographic verification integrity.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-full gap-2 border-primary/20 hover:bg-primary/5 px-6 font-bold tracking-tight"
          >
            <Download className="h-4 w-4" />
            Export Intel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Products"
          value={stats.products}
          icon={Package}
          color="blue"
          className="rounded-[1.75rem]"
        />
        <StatCard
          title="Batches"
          value={stats.batches}
          icon={Boxes}
          color="primary"
          className="rounded-[1.75rem]"
        />
        <StatCard
          title="Total Scans"
          value={
            stats.totalScans >= 1000
              ? `${(stats.totalScans / 1000).toFixed(1)}k`
              : stats.totalScans
          }
          icon={ShieldCheck}
          color="green"
          className="rounded-[1.75rem]"
        />
        <StatCard
          title="Incidents"
          value={stats.securityIncidents}
          icon={AlertTriangle}
          color="destructive"
          className="rounded-[1.75rem]"
        />
      </div>

      {/* Layer 2: Verification Trends (Chart) */}
      <Card className="p-8 rounded-[2.5rem] bg-card/50 border-border/40 backdrop-blur-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <TrendingUp className="w-32 h-32" />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4 relative z-10">
          <div>
            <h2 className="text-xl font-black tracking-tight">
              Verification Velocity
            </h2>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Consumer engagement trends over the selected period.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-full text-[10px] font-bold tracking-tight">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant="ghost"
                size="sm"
                onClick={() => setTimeRange(d)}
                className={`rounded-full h-8 px-4 transition-all ${timeRange === d ? "bg-background shadow-sm text-primary" : "text-muted-foreground opacity-60 hover:opacity-100"}`}
              >
                {d}d
              </Button>
            ))}
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={scanHistory}>
              <defs>
                <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
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
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                  fontWeight: 700,
                }}
                tickFormatter={(val) => format(new Date(val), "MMM dd")}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                  fontWeight: 700,
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "16px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  background: "hsl(var(--background))",
                }}
                labelFormatter={(val) => format(new Date(val), "MMMM dd, yyyy")}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorScans)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Layer 3: Batch Performance Rankings */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight">Top Performing Batches</h2>
            <Button
              variant="link"
              className="text-xs font-bold text-primary p-0 h-auto tracking-tight"
              asChild
            >
              <Link href="/manufacturer/batches">
                Explore All <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <Card className="rounded-[2.5rem] border-border/40 bg-card/30 backdrop-blur-md overflow-hidden p-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="px-6 py-4 text-[10px] tracking-tight text-muted-foreground">
                      Batch #
                    </th>
                    <th className="px-6 py-4 text-[10px] tracking-tight text-muted-foreground">
                      Product
                    </th>
                    <th className="px-6 py-4 text-[10px] tracking-tight text-muted-foreground text-right">
                      Scans
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {topBatches.map((batch, i) => {
                    const batchScans = Array.from(
                      Object.values(batch.scanCounts || {}),
                    ).reduce((sum: any, c: any) => sum + Number(c), 0);
                    return (
                      <tr
                        key={i}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold group-hover:text-primary transition-colors">
                            {batch.batchNumber}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-muted-foreground font-medium">
                            {batch.productName}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Badge
                            variant="secondary"
                            className="rounded-full px-3 py-0.5 font-bold text-primary bg-primary/10"
                          >
                            {Number(batchScans)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Deep Dive Link Card */}
          <Link href="/manufacturer/analytics/scans">
            <Card className="p-8 mt-8 rounded-[2.5rem] bg-gradient-to-br from-zinc-900 to-black text-white border-none relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all">
                <MapPin className="w-24 h-24" />
              </div>
              <div className="relative z-10 space-y-4">
                <Badge className="bg-primary hover:bg-primary text-[9px] tracking-tight px-3 py-1">
                  New Feature
                </Badge>
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">
                    Geographic Deep Dive
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium mt-1">
                    Visualize scan locations and identify regional trends.
                  </p>
                </div>
                <Button className="rounded-full font-bold bg-white text-black hover:bg-zinc-200 mt-2 px-6">
                  Launch Scan Analysis <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </Card>
          </Link>
        </section>

        {/* Layer 4: Security Intelligence (Alert Feed) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight">Security Feed</h2>
            <div className="flex items-center gap-2">
              <Badge
                variant="destructive"
                className="rounded-full text-[9px] font-bold tracking-tight h-5"
              >
                {stats.securityIncidents} Open
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            {securityAlerts.length > 0 ? (
              securityAlerts.slice(0, 6).map((alert: any, i) => (
                <Card
                  key={i}
                  className="p-4 border-none bg-destructive/5 hover:bg-destructive/10 transition-colors rounded-[1.85rem] group relative overflow-hidden"
                >
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <p className="text-sm font-bold truncate group-hover:text-destructive transition-colors">
                          {alert.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground font-bold shrink-0">
                          {format(new Date(alert.createdAt), "MMM dd")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 font-medium italic leading-relaxed">
                        {alert.message}
                      </p>

                      <Button
                        variant="link"
                        className="p-0 h-auto tracking-tight mt-2 group-hover:text-destructive"
                        asChild
                      >
                        <Link href={alert.link || "#"}>
                          Analyze Threat{" "}
                          <ArrowUpRight className="ml-1 w-2.5 h-2.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
                <ShieldCheck className="h-16 w-16 mb-4" />
                <p className="text-sm tracking-[0.05em]">Pristine Network</p>
                <p className="text-[10px] font-medium mt-1">
                  No security protocols breached.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
