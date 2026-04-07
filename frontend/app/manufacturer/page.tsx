"use client";

import { useEffect, useState, useRef } from "react";
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
  ArrowRight,
  ShieldCheck,
  Activity,
  BarChart3,
  Bell,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/contexts/auth-context";
import { listProducts } from "@/api/product.api";
import { listBatches } from "@/api/batch.api";
import { getTimelineAnalytics } from "@/api/analytics.api";
import { getNotifications, Notification } from "@/api/notification.api";
import { format, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

export default function ManufacturerDashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    products: 0,
    batches: 0,
    scansToday: 0,
    unreadNotifications: 0,
  });
  const [recentNotifications, setRecentNotifications] = useState<
    Notification[]
  >([]);
  const [tendency, setTendency] = useState<string | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const today = new Date();

        const [productsRes, batchesRes, timelineRes, notificationsRes] =
          await Promise.all([
            listProducts({}, controller.signal),
            listBatches({}, controller.signal),
            getTimelineAnalytics(
              {
                from: startOfDay(sevenDaysAgo).toISOString(),
                to: endOfDay(today).toISOString(),
                groupBy: "total",
              },
              controller.signal,
            ),
            getNotifications(5, 0, undefined, controller.signal),
          ]);

        const products = productsRes.products || [];
        const batches = batchesRes.batches || [];
        const history = timelineRes.history || [];
        const notifications = notificationsRes.notifications || [];
        const unreadCount = notificationsRes.unreadCount || 0;

        const todayStr = format(new Date(), "yyyy-MM-dd");

        // Find today's scans in the history array
        const todayData = history.find((h: any) => h.date === todayStr);

        // Calculate tendency from yesterday
        let calculatedTendency = undefined;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = format(yesterday, "yyyy-MM-dd");
        const yesterdayData = history.find((h: any) => h.date === yesterdayStr);

        if (yesterdayData && yesterdayData.count > 0 && todayData) {
          const diff =
            ((todayData.count - yesterdayData.count) / yesterdayData.count) *
            100;
          calculatedTendency = `${diff >= 0 ? "+" : ""}${diff.toFixed(0)}%`;
        } else if (todayData && todayData.count > 0 && !yesterdayData) {
          calculatedTendency = "+100%";
        }

        setStats({
          products: products.length,
          batches: batches.length,
          scansToday: todayData ? todayData.count : 0,
          unreadNotifications: unreadCount,
        });
        setTendency(calculatedTendency);
        setRecentNotifications(notifications);
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("Failed to fetch dashboard data:", error);
        toast.error("Could not load dashboard metrics.");
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => abortControllerRef.current?.abort();
  }, []);

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <div className="space-y-8 lg:space-y-10 pb-12">
      <PageHeader
        title={
          <>
            Welcome,{" "}
            <span className="text-primary">
              {user?.name?.split(" ")[0] || "Manufacturer"}
            </span>
          </>
        }
        description="Here's what's happening across your company today."
      />

      {/* Bento KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="Products Enrolled"
          value={stats.products}
          icon={Package}
          description="Catalogue size"
          color="blue"
        />

        <StatCard
          title="Active Batches"
          value={stats.batches}
          icon={Boxes}
          description="Production runs"
          color="primary"
        />

        <StatCard
          title="Scans Today"
          value={stats.scansToday}
          icon={TrendingUp}
          tendency={tendency}
          description={`Date: ${format(new Date(), "MMM dd")}`}
          color="green"
        />

        <StatCard
          title="Unread Alerts"
          value={stats.unreadNotifications}
          icon={AlertTriangle}
          description="Security items"
          color={stats.unreadNotifications > 0 ? "destructive" : "primary"}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Quick Actions Navigation Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: "Manage Products",
                desc: "View and edit your product catalog",
                icon: Package,
                href: "/manufacturer/products",
                color: "bg-blue-500/10 text-blue-600",
              },
              {
                title: "Enroll Batch",
                desc: "Register a new production run",
                icon: Plus,
                href: "/manufacturer/batches/new",
                color: "bg-primary/10 text-primary",
              },
              {
                title: "View Analytics",
                desc: "Deep dive into scan locations and trends",
                icon: BarChart3,
                href: "/manufacturer/analytics",
                color: "bg-purple-500/10 text-purple-600",
              },
              {
                title: "View Scan activity",
                desc: "Investigate suspicious scan activity",
                icon: Activity,
                href: "/manufacturer/analytics/scans",
                color: "bg-emerald-500/10 text-emerald-600",
              },
            ].map((action, i) => (
              <div key={i} className="flex flex-col h-full">
                <Link href={action.href} className="flex-1">
                  <Card className="p-5 rounded-3xl border-border/40 bg-card/40 backdrop-blur-md hover:bg-muted/40 transition-all group h-full flex flex-col">
                    <div
                      className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                        action.color,
                      )}
                    >
                      <action.icon className="h-6 w-6" />
                    </div>
                    <h4 className="font-bold text-base mb-1 group-hover:text-primary transition-colors">
                      {action.title}
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      {action.desc}
                    </p>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity Feed */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight">
              Recent Activity
            </h2>
            <Button
              variant="link"
              className="text-xs text-primary p-0 h-auto"
              asChild
            >
              <Link href="/manufacturer/analytics">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>

          <Card className="rounded-3xl border-border/40 bg-card/20 backdrop-blur-sm p-6 overflow-hidden">
            <div className="space-y-4">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((notif, i) => (
                  <div key={i} className="flex gap-4 items-start group">
                    <div className="h-10 w-10 rounded-2xl bg-muted/50 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/10 transition-colors">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 border-b border-border/40 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground font-bold shrink-0">
                          {format(new Date(notif.createdAt), "HH:mm")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 font-medium italic opacity-80">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                  <ShieldCheck className="h-12 w-12 mb-4" />
                  <p className="text-xs tracking-tight">All systems green</p>
                  <p className="text-[10px] font-medium mt-1">
                    No recent activity to report.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
