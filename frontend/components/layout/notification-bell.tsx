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
    };
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
          className="relative rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary p-0 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>

      {/* Mobile updates: w-[calc(100vw-2rem)] ensures it doesn't overflow small screens, 
        sm:w-80 keeps it standard width on desktop. z-50 handles overlay stacking. 
      */}
      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-80 p-0 z-50"
        align="end"
      >
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h4 className="font-semibold text-sm">Notifications</h4>
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-8 text-xs hover:bg-muted"
            >
              Mark all read <Check className="ml-2 h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Dynamic height for better mobile experience */}
        <ScrollArea className="max-h-[60vh] sm:h-[400px]">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <MoreHorizontal className="h-8 w-8 animate-pulse text-muted-foreground opacity-50" />
            </div>
          ) : notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => !notif.isRead && handleMarkRead(notif._id)}
                  className={cn(
                    "flex gap-3 p-4 border-b transition-colors hover:bg-muted/50 cursor-pointer",
                    !notif.isRead
                      ? "bg-muted/20 border-l-2 border-l-primary"
                      : "border-l-2 border-l-transparent",
                  )}
                >
                  <div className="mt-1 shrink-0">{getTypeIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <p
                        className={cn(
                          "text-sm font-medium leading-none",
                          !notif.isRead
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {notif.title}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                        {formatDistanceToNow(new Date(notif.createdAt), {
                          addSuffix: true,
                        }).replace("about ", "")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notif.message}
                    </p>
                    {notif.link && (
                      <Link
                        href={notif.link}
                        className="inline-flex items-center text-xs text-primary mt-1 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                        }}
                      >
                        View Details
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <Inbox className="h-10 w-10 mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">
                You have no new notifications.
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t text-center">
          <Button
            variant="ghost"
            className="w-full text-sm hover:bg-muted"
            asChild
          >
            <Link
              href="/manufacturer/analytics"
              onClick={() => setIsOpen(false)}
            >
              View All Notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
