"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  BarChart3,
  Activity,
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
  Globe,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { listProducts } from "@/api/product.api";
import { 
  listBatches, 
  getScanHistory, 
  getGeoDistribution, 
  getThreatIntelligence 
} from "@/api/batch.api";
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
  BarChart,
  Bar,
  Cell
} from "recharts";
import Link from "next/link";

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // 7, 30, 90
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [topBatches, setTopBatches] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [threats, setThreats] = useState<any[]>([]);
  const [stats, setStats] = useState({
    products: 0,
    batches: 0,
    totalScans: 0,
    securityIncidents: 0,
  });
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      setIsLoading(true);
      try {
        const [productsRes, batchesRes, historyRes, geoRes, threatsRes] =
          await Promise.all([
            listProducts({}, controller.signal),
            listBatches({}, controller.signal),
            getScanHistory(timeRange, controller.signal),
            getGeoDistribution(controller.signal),
            getThreatIntelligence(controller.signal)
          ]);
        
        if (controller.signal.aborted) return;

        const products = productsRes.products || [];
        const batches = batchesRes.batches || [];
        const history = historyRes.history || [];
        const geoSegments = geoRes || [];
        const threatIntel = threatsRes || [];

        // Sum total scans using backend-provided totals for accuracy
        const totalScans = batches.reduce((acc: number, b: any) => acc + (Number(b.totalScans) || 0), 0);

        setStats({
          products: products.length,
          batches: batches.length,
          totalScans,
          securityIncidents: threatIntel.length
        });

        setScanHistory(history);
        setGeoData(geoSegments);
        setThreats(threatIntel);
        
        // Sort batches by total scans (pre-calculated by backend)
        const sortedBatches = [...batches]
          .sort((a: any, b: any) => (Number(b.totalScans) || 0) - (Number(a.totalScans) || 0))
          .slice(0, 5);
        setTopBatches(sortedBatches);

      } catch (error: any) {
        if (error.name === 'AbortError') return;
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
          {scanHistory.length > 0 ? (
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
                  labelFormatter={(val) => {
                    try {
                      return format(new Date(val), "MMMM dd, yyyy");
                    } catch {
                      return val;
                    }
                  }}
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
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 bg-muted/5 rounded-[2rem] border-2 border-dashed border-border/40">
              <Activity className="h-8 w-8 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">No activity found in this period</p>
            </div>
          )}
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
                    const batchScans = Number(batch.totalScans) || 0;
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

        {/* Layer 4: Intelligence & Security */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 lg:p-8 rounded-[2.5rem] bg-card/50 backdrop-blur-sm border-primary/5">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  <Globe className="h-6 w-6 text-primary" /> Regional Scan Density
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  Global product engagement by territory
                </p>
              </div>
              <Badge variant="outline" className="rounded-full bg-primary/5 text-primary border-primary/10">
                Top 20 Locations
              </Badge>
            </div>

            <div className="h-[350px] w-full">
              {geoData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={geoData} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="city" 
                      type="category" 
                      stroke="#888888" 
                      fontSize={11} 
                      fontWeight="bold"
                      width={100}
                      tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 10)}..` : value}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(var(--primary-rgb), 0.05)' }} 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                      {geoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "var(--primary)" : `hsl(var(--primary) / ${Math.max(0.1, 1 - index * 0.1)})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-[2rem] border-2 border-dashed border-border/50">
                  <Globe className="h-10 w-10 mb-2 opacity-20 animate-pulse" />
                  <p className="text-xs font-bold">Awaiting global scan telemetry...</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 lg:p-8 rounded-[2.5rem] bg-zinc-900 border-none text-white overflow-hidden relative group">
            <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <ShieldAlert className="h-48 w-48" />
            </div>
            
            <div className="relative z-10 h-full flex flex-col">
              <div className="mb-8">
                <Badge className="bg-red-500 text-white border-none mb-3 px-3 py-1 rounded-full text-[10px] uppercase font-black">
                  Live Security Audit
                </Badge>
                <h3 className="text-2xl font-black tracking-tight">
                  Intelligence Feed
                </h3>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  Suspicious scan pattern detection
                </p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
                {threats.length > 0 ? (
                  threats.map((threat, idx) => (
                    <div key={idx} className="p-4 rounded-[1.5rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-default group/item">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black uppercase text-red-500 tracking-widest bg-red-500/10 px-2 py-0.5 rounded-full">
                          Anomaly Detected
                        </span>
                        <span className="text-[10px] text-zinc-500 font-bold">
                          {threat.visitorCount} IPs
                        </span>
                      </div>
                      <p className="text-sm font-bold truncate text-white mb-0.5">
                        {threat.batch?.productName || 'Unknown Product'}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-tighter mt-2">
                        <span>Unit #{threat.unit}</span>
                        <span className="flex items-center gap-1 group-hover/item:text-red-400 transition-colors">
                          <Activity className="h-3 w-3" /> {threat.totalScans} Scans
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-12 opacity-50 bg-white/5 rounded-[1.5rem] border border-dashed border-white/10">
                    <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-500 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-widest">Integrity Verified</p>
                    <p className="text-[10px] font-medium mt-1">No leak patterns found</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <Button variant="outline" className="w-full rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold h-12" asChild>
                  <Link href="/manufacturer/security">
                    Full Security Audit Log <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
