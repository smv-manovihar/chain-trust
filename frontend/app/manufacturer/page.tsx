"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const data = [
  { name: "Jan", scans: 400 },
  { name: "Feb", scans: 300 },
  { name: "Mar", scans: 600 },
  { name: "Apr", scans: 800 },
  { name: "May", scans: 500 },
  { name: "Jun", scans: 900 },
];

export default function ManufacturerDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground uppercase">
            Operations <span className="text-primary">Overview</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-0.5">
            Welcome, {user?.name || "Manufacturer"}. Here's what's happening
            across your product line.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            className="rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            asChild
          >
            <Link href="/manufacturer/batches/new">
              <Plus className="mr-2 h-4 w-4" />
              New Batch
            </Link>
          </Button>
        </div>
      </div>

      {/* High-Level Stats Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="p-6 rounded-[2rem] border-none bg-primary/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Package className="h-12 w-12" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
            Total Products
          </p>
          <h3 className="text-3xl font-black">24</h3>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-green-600">
            <ArrowUpRight className="h-3 w-3" /> +2 this month
          </div>
        </Card>

        <Card className="p-6 rounded-[2rem] border-none bg-blue-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-blue-500">
            <Boxes className="h-12 w-12" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">
            Active Batches
          </p>
          <h3 className="text-3xl font-black">156</h3>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-blue-600">
            <Activity className="h-3 w-3" /> Healthy distribution
          </div>
        </Card>

        <Card className="p-6 rounded-[2rem] border-none bg-green-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-green-500">
            <TrendingUp className="h-12 w-12" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1">
            Total Verified Scans
          </p>
          <h3 className="text-3xl font-black">12.4k</h3>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-green-600">
            <ArrowUpRight className="h-3 w-3" /> +15.2% vs last week
          </div>
        </Card>

        <Card className="p-6 rounded-[2rem] border-none bg-destructive/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-destructive">
            <AlertTriangle className="h-12 w-12" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-destructive mb-1">
            Recalled Units
          </p>
          <h3 className="text-3xl font-black text-destructive">0</h3>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <ShieldCheck className="h-3 w-3" /> No safety incidents
          </div>
        </Card>
      </div>

      {/* Main Insights Grid */}
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Chart Section */}
        <Card className="lg:col-span-2 p-6 lg:p-8 rounded-[2.5rem] bg-card/50 backdrop-blur-sm border-border/40 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold tracking-tight">
                Consumer Engagement
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                Scan activity across all batches
              </p>
            </div>
            <div className="flex gap-2">
              <Badge
                variant="outline"
                className="rounded-full px-3 py-1 bg-background"
              >
                7 Days
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full px-3 py-1 opacity-50"
              >
                30 Days
              </Badge>
            </div>
          </div>
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
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
                  opacity={0.5}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    background: "hsl(var(--background))",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="scans"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorScans)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Right Column: Mini Tables / Alerts */}
        <div className="space-y-6">
          <Card className="p-6 rounded-[2.5rem] border-border/40 bg-card/30 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold">Recent Alerts</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-primary font-bold"
              >
                Clear All
              </Button>
            </div>
            <div className="space-y-4">
              {[
                {
                  type: "safety",
                  text: "Batch #AMX-120 reached 500 scans",
                  time: "2m ago",
                },
                {
                  type: "system",
                  text: "New product enrolled: Vitamin X",
                  time: "1h ago",
                },
              ].map((alert, i) => (
                <div key={i} className="flex gap-3 justify-between items-start">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold leading-tight">
                      {alert.text}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {alert.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-8 rounded-2xl w-full border-primary/10 hover:bg-primary/5"
            >
              View Activity Log
            </Button>
          </Card>

          <Card className="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary to-accent border-none text-primary-foreground shadow-2xl relative overflow-hidden shadow-primary/30 group">
            <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-24 w-24" />
            </div>
            <h3 className="text-xl font-bold mb-2">Trust Certified</h3>
            <p className="text-xs opacity-90 leading-relaxed mb-6">
              Your manufacturer nodes are perfectly synchronized with the
              blockchain. All product lineages are secure.
            </p>
            <Button
              className="w-full rounded-xl bg-white text-primary hover:bg-white/90 font-black tracking-tight self-end"
              asChild
            >
              <Link href="/manufacturer/batches">
                Manage Batches <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
