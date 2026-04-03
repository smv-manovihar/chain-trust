"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { 
  Bell, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  Inbox,
  Clock,
  History,
  Pill,
  Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  Notification 
} from "@/api/notification.api";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const limitSize = 15;

  const fetchNotifications = useCallback(async (reset = false) => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    const currentSkip = reset ? 0 : page * limitSize;
    if (reset) setIsLoading(true);

    try {
      const data = await getNotifications(
        limitSize, 
        currentSkip, 
        undefined, 
        controller.signal
      );
      
      let fetched = data.notifications || [];
      const filtered = filter === "unread" ? fetched.filter((n: any) => !n.isRead) : fetched;

      if (reset) {
        setNotifications(filtered);
        setPage(1);
      } else {
        setNotifications(prev => [...prev, ...filtered]);
        setPage(prev => prev + 1);
      }
      
      setUnreadCount(data.unreadCount || 0);
      setHasMore(fetched.length === limitSize);
    } catch (error: any) {
      if (error.name === "AbortError") return;
      toast.error("Failed to load notifications");
    } finally {
      if (fetchAbortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [filter, page]);

  useEffect(() => {
    fetchNotifications(true);
    return () => fetchAbortRef.current?.abort();
  }, [filter]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      if (filter === "unread") setNotifications([]);
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to update notifications");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      if (filter === "unread") {
        setNotifications(prev => prev.filter(n => n._id !== id));
      }
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error("Failed to mark read");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "medicine_expiry":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "batch_recall":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "dose_reminder":
        return <Pill className="h-5 w-5 text-emerald-500" />;
      case "system":
        return <ShieldCheck className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
            Notifications
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 font-medium">
            Stay updated on your medicines and product safety.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            onClick={handleMarkAllRead} 
            disabled={isMarkingAll}
            variant="outline" 
            className="rounded-full font-bold h-10 border-primary/20 hover:bg-primary/5 text-primary"
          >
            {isMarkingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Mark all read
          </Button>
        )}
      </div>

      <Tabs defaultValue="unread" className="w-full flex-1 flex flex-col min-h-0" onValueChange={(val) => setFilter(val as any)}>
        <div className="flex items-center justify-between mb-2">
          <TabsList className="bg-muted/30 p-1 rounded-xl h-11 border border-border/40">
            <TabsTrigger value="unread" className="rounded-lg px-6 font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Unread
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-primary text-primary-foreground border-none px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center rounded-full text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-lg px-6 font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="unread" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="h-[calc(100vh-280px)] border-none bg-transparent shadow-none">
            <div className="h-full overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Fetching updates...</p>
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notif) => (
                  <NotificationCard 
                    key={notif._id} 
                    notification={notif} 
                    onMarkRead={handleMarkRead} 
                    icon={getTypeIcon(notif.type)}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-[60%] text-center px-4">
                  <div className="p-4 rounded-full bg-primary/5 mb-4">
                    <Inbox className="h-10 w-10 text-primary opacity-40" />
                  </div>
                  <h3 className="text-lg font-bold">No new messages</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
                    You&apos;re up to date! We&apos;ll notify you when your medicines need attention.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="h-[calc(100vh-280px)] border-none bg-transparent shadow-none">
            <div className="h-full overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {isLoading && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Loading history...</p>
                </div>
              ) : notifications.length > 0 ? (
                <>
                  {notifications.map((notif) => (
                    <NotificationCard 
                      key={notif._id} 
                      notification={notif} 
                      onMarkRead={handleMarkRead} 
                      icon={getTypeIcon(notif.type)}
                    />
                  ))}
                  {hasMore && (
                    <div className="py-8 flex justify-center">
                      <Button 
                        variant="ghost" 
                        onClick={() => fetchNotifications(false)}
                        className="rounded-full text-muted-foreground hover:text-foreground font-bold"
                      >
                        <History className="mr-2 h-4 w-4" /> Load older history
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[60%] text-center px-4">
                  <div className="p-4 rounded-full bg-muted/20 mb-4">
                    <History className="h-10 w-10 text-muted-foreground opacity-40" />
                  </div>
                  <h3 className="text-lg font-bold">History is empty</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
                    Your notification archive will appear here.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationCard({ 
  notification, 
  onMarkRead, 
  icon 
}: { 
  notification: Notification; 
  onMarkRead: (id: string) => void;
  icon: React.ReactNode;
}) {
  return (
    <Card className={cn(
      "group relative flex gap-4 p-5 rounded-[1.5rem] border transition-all duration-300",
      !notification.isRead 
        ? "bg-card border-primary/20 shadow-sm" 
        : "bg-muted/10 border-border/40 opacity-80 hover:opacity-100"
    )}>
      <div className={cn(
        "shrink-0 p-3 rounded-2xl h-fit",
        !notification.isRead ? "bg-primary/5" : "bg-muted"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <h3 className={cn(
              "text-base tracking-tight leading-tight",
              !notification.isRead ? "font-bold text-foreground" : "font-semibold text-muted-foreground"
            )}>
              {notification.title}
            </h3>
            <div className="flex items-center gap-3 text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(notification.createdAt), "MMM dd, yyyy · HH:mm")}
              </span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
          
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMarkRead(notification._id)}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100"
              title="Mark as read"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <p className={cn(
          "text-sm mt-3 leading-relaxed",
          !notification.isRead ? "text-foreground/90 font-medium" : "text-muted-foreground"
        )}>
          {notification.message}
        </p>

        {notification.link && (
          <Button asChild variant="link" className="p-0 h-auto mt-4 w-fit text-xs font-bold text-primary hover:text-primary decoration-primary/20 group-hover:decoration-primary">
            <Link href={notification.link}>
              View details →
            </Link>
          </Button>
        )}
      </div>
      
      {!notification.isRead && (
        <div className="absolute right-5 bottom-5 h-2 w-2 rounded-full bg-primary animate-pulse" />
      )}
    </Card>
  );
}

export default function CustomerNotificationsPage() {
  return (
    <Suspense fallback={
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium text-sm">Loading notifications...</p>
      </div>
    }>
      <NotificationsContent />
    </Suspense>
  );
}
