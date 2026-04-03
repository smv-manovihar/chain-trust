"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pill,
  Clock,
  AlertTriangle,
  BellRing,
  Plus,
  ShieldCheck,
  ChevronRight,
  PlusCircle,
  Smartphone,
  CheckCircle2,
  FileText,
  Settings,
  Package,
  ArrowRight,
  QrCode,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import {
  getDashboardStats,
  getCabinet,
  CabinetItem,
  markDoseTaken,
} from "@/api/customer.api";
import {
  getNotifications,
  markAsRead,
  Notification as NotificationAlert,
} from "@/api/notification.api";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { LoadingScreen } from "@/components/ui/loading-screen";

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
        "medicine_expiry,batch_recall,dose_reminder",
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

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
      setUnreadAlerts((prev) => Math.max(0, prev - 1));
    } catch (err) {
      toast.error("Failed to dismiss alert.");
    }
  };

  const handleTakeDose = async (id: string, name: string) => {
    try {
      await markDoseTaken(id);
      toast.success("Dose Recorded", {
        description: `Your dose for ${name} has been marked as taken.`,
      });
      fetchData(); // Refresh to update quantity bars
    } catch (err) {
      toast.error("Failed to record dose");
    }
  };

  const sortedMeds = [...medications].sort((a, b) => {
    const qA = (a.currentQuantity || 0) / (a.totalQuantity || 100);
    const qB = (b.currentQuantity || 0) / (b.totalQuantity || 100);
    return qA - qB;
  });

  if (isLoading || alertsLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <div className="space-y-8 lg:space-y-12 pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2 pt-2">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter text-foreground leading-none">
            Welcome,{" "}
            <span className="text-primary">
              {user?.name?.split(" ")[0] || "User"}
            </span>
          </h1>
        </div>
        <Button
          className="rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-8 font-bold h-12"
          asChild
        >
          <Link href="/verify">
            <QrCode className="mr-2 h-5 w-5" />
            Verify New Medicine
          </Link>
        </Button>
      </div>

      {/* TOP ROW (3-Col Grid): Safety Profile (2) & My Medicines List (1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Safety Profile Hero (2 Columns) */}
        <div className="lg:col-span-2">
          <Card className="p-10 lg:p-16 border-border/40 bg-card/40 backdrop-blur-md rounded-[3rem] shadow-sm flex flex-col justify-center relative overflow-hidden group min-h-[450px] h-full">
            <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 pointer-events-none transition-transform duration-1000 group-hover:scale-110">
              <ShieldCheck className="h-64 w-64 text-primary" />
            </div>
            <div className="relative">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                {unreadAlerts > 0
                  ? "Review Required"
                  : "You are all caught up!"}
              </h2>
              <p className="text-muted-foreground text-lg font-normal mt-4 max-w-[500px] leading-relaxed opacity-70">
                Your medical supply is currently verified and secure.
              </p>
            </div>
          </Card>
        </div>

        {/* My Medicines Sidebar (1 Column) */}
        <section className="space-y-6 flex flex-col h-full min-h-[450px]">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" strokeWidth={2.5} /> My
              Medicines
            </h3>
            <Button
              variant="link"
              className="text-xs text-primary p-0 h-auto font-bold"
              asChild
            >
              <Link href="/customer/cabinet">
                See all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>

          <div className="space-y-4 flex-1 flex flex-col">
            {medications.length > 0 ? (
              sortedMeds.slice(0, 5).map((med) => (
                <Card
                  key={med._id}
                  className="p-6 rounded-[2.5rem] border-border/30 bg-card/40 backdrop-blur-md border-dashed shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground tracking-tight leading-none mb-1.5">
                        {med.brand}
                      </p>
                      <h4 className="text-base font-bold truncate tracking-tight leading-none">
                        {med.name}
                      </h4>
                    </div>
                  </div>
                  <Progress
                    value={
                      ((med.currentQuantity || 0) /
                        (med.totalQuantity || 100)) *
                      100
                    }
                    className="h-1 mb-4"
                  />
                  <div className="flex justify-between items-center bg-background/50 p-2 rounded-xl">
                    <span className="text-[10px] font-black text-primary">
                      {med.currentQuantity} Left
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTakeDose(med._id, med.name)}
                      className="h-8 px-4 rounded-xl text-[10px] font-black hover:bg-primary hover:text-white transition-all border-primary/20"
                    >
                      Taken
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="flex-1 min-h-[300px] lg:min-h-0 flex flex-col items-center justify-center text-center opacity-40 border-2 border-dashed rounded-[2.5rem] bg-muted/5 h-full">
                <Pill className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p className="text-[10px] font-bold text-muted-foreground">
                  Your list is empty
                </p>
              </Card>
            )}
          </div>
        </section>
      </div>

      {/* MIDDLE ROW: Safety Alerts (2/3 width) */}
      <div className="grid lg:grid-cols-2 gap-8 pt-4">
        {/* Quick Actions */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight px-2">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: "My Medicines",
                desc: "Track inventory, doses, and expiry dates",
                icon: Pill,
                href: "/customer/cabinet",
                color: "bg-primary/10 text-primary",
              },
              {
                title: "Verify Medicine",
                desc: "Perform a live blockchain security scan",
                icon: QrCode,
                href: "/verify",
                color: "bg-emerald-500/10 text-emerald-600",
              },
              {
                title: "Security Vault",
                desc: "Digital prescriptions and lab reports",
                icon: ShieldCheck,
                href: "/customer/cabinet",
                color: "bg-blue-500/10 text-blue-600",
              },
              {
                title: "Treatment Plans",
                desc: "Manage reminders and dose schedules",
                icon: Clock,
                href: "/customer/settings",
                color: "bg-amber-500/10 text-amber-600",
              },
            ].map((action, i) => (
              <Link key={i} href={action.href} className="group">
                <Card className="p-6 rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-md hover:bg-muted/40 transition-all h-full flex flex-col justify-start">
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
                  <p className="text-[13px] text-muted-foreground font-medium leading-relaxed">
                    {action.desc}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Safety Feed */}
        <section className="space-y-6 flex flex-col h-full">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 px-2">
            <BellRing className="h-5 w-5 text-primary" strokeWidth={2.5} />{" "}
            Safety Alerts
          </h2>
          <Card className="rounded-[2.5rem] border-border/40 bg-card/20 backdrop-blur-sm p-6 overflow-hidden flex-1 flex flex-col min-h-[300px]">
            <div className="space-y-5 flex-1 flex flex-col">
              {alertsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-4 h-[80px] animate-pulse rounded-[1.5rem] bg-muted/40"
                  />
                ))
              ) : alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div key={alert._id} className="flex gap-4 items-start group">
                    <div
                      className={cn(
                        "h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center transition-colors",
                        alert.type === "batch_recall"
                          ? "bg-red-500/10 text-red-600"
                          : alert.type === "medicine_expiry"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-primary/10 text-primary",
                      )}
                    >
                      {alert.type === "batch_recall" ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <BellRing className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 border-b border-border/20 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-0.5 gap-2">
                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors tracking-tight">
                          {alert.title}
                        </p>
                        <span className="text-[11px] text-muted-foreground font-bold shrink-0">
                          {formatDistanceToNow(new Date(alert.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-[13px] text-muted-foreground line-clamp-2 font-medium leading-relaxed mb-3">
                        {alert.message}
                      </p>
                      {alert.link && (
                        <Link
                          href={alert.link}
                          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          View Details <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center text-center opacity-40 h-full py-20 lg:py-0">
                  <ShieldCheck
                    className="h-10 w-10 mb-3 text-primary"
                    strokeWidth={1.5}
                  />
                  <p className="text-xs font-bold text-muted-foreground/60">
                    Your supply is secure
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
