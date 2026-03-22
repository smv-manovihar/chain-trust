"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Bell,
  Check,
  AlertTriangle,
  ShieldCheck,
  Zap,
  MoreHorizontal,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  Notification,
} from "@/api/notification.api";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const fetchNotifications = useCallback(async (isInitial = false) => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    if (isInitial) setIsLoading(true);
    try {
      const data = await getNotifications(20, 0, controller.signal);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("Failed to fetch notifications:", error);
    } finally {
      if (fetchAbortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(), 30000); // 30s polling
    return () => {
      clearInterval(interval);
      fetchAbortRef.current?.abort();
    }
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to update notifications");
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification read:", error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "scan_milestone":
        return <Zap className="h-4 w-4 text-emerald-500" />;
      case "system":
        return <ShieldCheck className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-primary transition-colors rounded-full"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-primary p-0 flex items-center justify-center border-2 border-background text-[10px] font-black">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 rounded-[1.5rem] border-border/40 bg-card/95 backdrop-blur-md shadow-2xl relative z-[100]"
        align="end"
      >
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <div>
            <h4 className="text-sm uppercase tracking-widest">Alerts Center</h4>
            <p className="text-[10px] text-muted-foreground font-medium">
              {unreadCount} unread reports
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-8 px-2 font-bold uppercase tracking-tighter hover:bg-primary/10 hover:text-primary rounded-lg"
            >
              Clear All <Check className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>

        <ScrollArea className="h-[350px]">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <MoreHorizontal className="h-8 w-8 animate-pulse text-muted-foreground opacity-30" />
            </div>
          ) : notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => !notif.isRead && handleMarkRead(notif._id)}
                  className={cn(
                    "relative flex gap-3 p-4 border-b border-border/20 transition-all hover:bg-muted/50 cursor-pointer",
                    !notif.isRead && "bg-primary/5 border-l-2 border-l-primary",
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                      !notif.isRead ? "bg-background shadow-sm" : "bg-muted",
                    )}
                  >
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start">
                      <p
                        className={cn(
                          "text-xs font-bold truncate leading-tight",
                          !notif.isRead
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[9px] font-medium text-muted-foreground shrink-0 whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(notif.createdAt), {
                          addSuffix: true,
                        }).replace("about ", "")}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 italic">
                      {notif.message}
                    </p>
                    {notif.link && (
                      <Link
                        href={notif.link}
                        className="inline-flex items-center text-[9px] uppercase tracking-widest text-primary mt-1 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                        }}
                      >
                        Resolve Threat <Zap className="ml-1 w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6 opacity-30">
              <Inbox className="h-12 w-12 mb-3" />
              <p className="text-sm uppercase tracking-widest">
                Network Secure
              </p>
              <p className="text-[10px] font-medium mt-1">
                No pending notifications in your feed.
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-border/40 text-center">
          <Button
            variant="ghost"
            className="w-full h-8 uppercase hover:bg-primary/5 hover:text-primary rounded-xl"
            asChild
          >
            <Link
              href="/manufacturer/analytics"
              onClick={() => setIsOpen(false)}
            >
              Full Intelligence Feed
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
