// app/customer/dashboard/page.tsx (or equivalent)
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Pill,
  Clock,
  AlertTriangle,
  BellRing,
  ShieldCheck,
  ArrowRight,
  QrCode,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import {
  getDashboardStats,
  getCabinet,
  markDoseTaken,
  undoDose,
  CabinetItem,
} from "@/api/customer.api";
import {
  getNotifications,
  markAsRead,
  Notification as NotificationAlert,
} from "@/api/notification.api";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { UpcomingDoseCarousel } from "@/components/cabinet/upcoming-dose-carousel";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [medications, setMedications] = useState<CabinetItem[]>([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    scheduledToday: 0,
    expiringSoon: 0,
  });
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const cabinetRes = await getCabinet();
      setMedications(cabinetRes || []);
      const statsRes = await getDashboardStats();
      setStats(statsRes);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAlerts = async () => {
    setAlertsLoading(true);
    try {
      const res = await getNotifications(
        4,
        0,
        "medicine_expiry,batch_recall",
      );
      setAlerts(res.notifications || []);
      setUnreadAlerts(res.unreadCount || 0);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAlerts();
  }, []);

  const handleTakeDose = async (id: string, name: string) => {
    try {
      const res = await markDoseTaken(id);
      const isLate = !res.wasPunctual;
      toast.success(isLate ? "Dose recorded (Late)" : "Dose recorded!", {
        description: isLate
          ? `Recorded outside the 3h window.`
          : `Your dose has been recorded.`,
        action: { label: "Undo", onClick: () => handleUndoDose(id, name) },
      });
      fetchData();
    } catch (err) {
      toast.error("Failed to record dose");
    }
  };

  const handleUndoDose = async (id: string, name: string) => {
    try {
      await undoDose(id);
      toast.success("Dose undone");
      fetchData();
    } catch (err) {
      toast.error("Failed to undo dose");
    }
  };

  const sortedMeds = [...medications].sort((a, b) => {
    const qA = (a.currentQuantity || 0) / (a.totalQuantity || 100);
    const qB = (b.currentQuantity || 0) / (b.totalQuantity || 100);
    return qA - qB;
  });

  if (isLoading || alertsLoading)
    return <LoadingScreen message="Loading dashboard..." />;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title={
          <>
            Welcome back,{" "}
            <span className="text-primary">
              {user?.name?.split(" ")[0] || "User"}
            </span>
          </>
        }
        actions={
          <Button
            size="lg"
            className="rounded-xl px-6 w-full sm:w-auto font-semibold"
            asChild
          >
            <Link href="/verify">
              <QrCode className="mr-2 h-5 w-5" />
              Scan & Verify New Medicine
            </Link>
          </Button>
        }
      />

      {/* TOP ROW: Hero Carousel & Inventory Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Safety Profile Hero */}
        <div className="lg:col-span-2 flex flex-col">
          <UpcomingDoseCarousel />
        </div>

        {/* My Medicines Sidebar */}
        <section className="flex flex-col h-full bg-card rounded-[2rem] border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Pill className="h-5 w-5 text-primary" /> Inventory
            </h3>
            <Button
              variant="link"
              className="text-sm font-semibold text-primary p-0 h-auto"
              asChild
            >
              <Link href="/customer/cabinet">View All</Link>
            </Button>
          </div>

          <div className="space-y-4 flex-1 flex flex-col overflow-y-auto pr-2">
            {medications.length > 0 ? (
              sortedMeds.slice(0, 4).map((med) => {
                const isRecentlyTaken =
                  !!med.lastDoseTaken &&
                  Date.now() - new Date(med.lastDoseTaken).getTime() <
                    5 * 60 * 1000;
                const percentLeft = Math.round(
                  ((med.currentQuantity || 0) / (med.totalQuantity || 100)) *
                    100,
                );

                return (
                  <div
                    key={med._id}
                    className="p-4 rounded-xl border bg-muted/30 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-sm leading-tight mb-1 text-foreground">
                          {med.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {med.brand}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        {isRecentlyTaken && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUndoDose(med._id, med.name)}
                            className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant={isRecentlyTaken ? "secondary" : "default"}
                          size="sm"
                          disabled={isRecentlyTaken}
                          onClick={() => handleTakeDose(med._id, med.name)}
                          className={cn(
                            "h-7 px-3 rounded-md text-xs font-semibold",
                            isRecentlyTaken && "opacity-50",
                          )}
                        >
                          {isRecentlyTaken ? "Taken" : "Take"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                        <span>Supply Remaining</span>
                        <span
                          className={
                            percentLeft < 20
                              ? "text-destructive font-bold"
                              : "text-foreground"
                          }
                        >
                          {med.currentQuantity} / {med.totalQuantity}
                        </span>
                      </div>
                      <Progress
                        value={percentLeft}
                        className={cn(
                          "h-1.5",
                          percentLeft < 20 && "[&>div]:bg-destructive",
                        )}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 bg-muted/20 rounded-xl border border-dashed py-8">
                <Pill className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm font-medium">Cabinet is empty</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* MIDDLE ROW: Quick Actions & Alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold px-1">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: "My Medicines",
                desc: "Manage your inventory & doses",
                icon: Pill,
                href: "/customer/cabinet",
                color: "text-primary bg-primary/10",
              },
              {
                title: "Verify Medicine",
                desc: "Scan a blockchain QR code",
                icon: QrCode,
                href: "/verify",
                color: "text-emerald-600 bg-emerald-500/10",
              },
              {
                title: "Security Vault",
                desc: "Access reports & prescriptions",
                icon: ShieldCheck,
                href: "/customer/cabinet",
                color: "text-blue-600 bg-blue-500/10",
              },
              {
                title: "Treatment Plans",
                desc: "Adjust your schedule",
                icon: Clock,
                href: "/customer/settings",
                color: "text-amber-600 bg-amber-500/10",
              },
            ].map((action, i) => (
              <Link key={i} href={action.href}>
                <Card className="p-5 rounded-2xl border hover:border-primary/30 hover:shadow-md transition-all h-full group bg-card">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center mb-3",
                      action.color,
                    )}
                  >
                    <action.icon className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Safety Feed */}
        <section className="space-y-4 flex flex-col">
          <h2 className="text-lg font-bold flex items-center gap-2 px-1">
            <BellRing className="h-5 w-5 text-foreground" /> Safety Alerts
          </h2>
          <Card className="rounded-2xl border p-2 flex-1 flex flex-col bg-card shadow-sm">
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div
                    key={alert._id}
                    className="flex gap-4 p-4 rounded-xl hover:bg-muted/40 transition-colors border border-transparent hover:border-border/60"
                  >
                    <div
                      className={cn(
                        "h-10 w-10 shrink-0 rounded-full flex items-center justify-center",
                        alert.type === "batch_recall"
                          ? "bg-red-500/10 text-red-600"
                          : alert.type === "medicine_expiry"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-primary/10 text-primary",
                      )}
                    >
                      {alert.type === "batch_recall" ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <BellRing className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="text-sm font-semibold text-foreground truncate pr-4">
                          {alert.title}
                        </p>
                        <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(alert.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                        {alert.message}
                      </p>
                      {alert.link && (
                        <Link
                          href={alert.link}
                          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                        >
                          View details <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center text-center opacity-60 h-full py-12">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium">No alerts at this time</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your supply is secure and verified.
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
