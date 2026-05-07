// components/cabinet/upcoming-dose-carousel.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Pill,
  Clock,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Info,
} from "lucide-react";
import { markDoseTaken, undoDose, getUpcomingDoses } from "@/api/customer.api";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function UpcomingDoseCarousel() {
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUpcoming = async () => {
    try {
      const data = await getUpcomingDoses();
      setUpcoming(data || []);
    } catch (err) {
      console.error("Failed to fetch upcoming doses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming();
  }, []);

  const handleTakeDose = async (
    cabinetItemId: string,
    name: string,
    scheduledTime: Date,
  ) => {
    // Unique key for this specific occurrence
    const doseKey = `${cabinetItemId}-${new Date(scheduledTime).getTime()}`;
    setActionLoading(doseKey);

    // Find the item to potentially restore it later
    const itemToHide = upcoming.find(
      (u) =>
        u.cabinetItemId === cabinetItemId &&
        new Date(u.scheduledTime).getTime() ===
          new Date(scheduledTime).getTime(),
    );
    const originalUpcoming = [...upcoming];

    try {
      // Optimistic UI: Hide ONLY this specific occurrence
      setUpcoming((prev) =>
        prev.filter(
          (u) =>
            `${u.cabinetItemId}-${new Date(u.scheduledTime).getTime()}` !==
            doseKey,
        ),
      );

      const res = await markDoseTaken(cabinetItemId);
      const isLate = !res.wasPunctual;

      toast.success(isLate ? `Dose recorded (Late)` : `Dose recorded!`, {
        description: isLate
          ? `Recorded for ${name} outside the 3h window.`
          : `Your dose for ${name} has been recorded.`,
        action: {
          label: "Undo",
          onClick: () => handleUndo(cabinetItemId, name, doseKey, itemToHide),
        },
      });
    } catch (err: any) {
      // Restore state on error
      setUpcoming(originalUpcoming);
      toast.error(err.response?.data?.message || "Failed to record dose");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUndo = async (
    cabinetItemId: string,
    name: string,
    doseKey: string,
    restoredItem?: any,
  ) => {
    setActionLoading(doseKey);
    try {
      await undoDose(cabinetItemId);

      // If we have the item, put it back immediately for responsiveness
      if (restoredItem) {
        setUpcoming((prev) => {
          const exists = prev.find(
            (u) =>
              `${u.cabinetItemId}-${new Date(u.scheduledTime).getTime()}` ===
              doseKey,
          );
          if (exists) return prev;
          const newList = [...prev, restoredItem];
          return newList.sort(
            (a, b) =>
              new Date(a.scheduledTime).getTime() -
              new Date(b.scheduledTime).getTime(),
          );
        });
      }

      toast.success(`Reverted dose for ${name}`);
      await fetchUpcoming();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to revert dose");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 lg:p-12 border-border/40 bg-card rounded-[2rem] flex flex-col justify-center h-full min-h-[320px] animate-pulse">
        <div className="space-y-4">
          <div className="h-10 w-3/4 bg-muted/60 rounded-xl" />
          <div className="h-5 w-1/2 bg-muted/40 rounded-lg" />
        </div>
      </Card>
    );
  }

  if (upcoming.length === 0) {
    return (
      <Card className="p-8 lg:p-12 border-primary/20 bg-primary/5 rounded-[2rem] flex flex-col items-center justify-center text-center h-full min-h-[320px] relative overflow-hidden group">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
          <ShieldCheck className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
          You're all caught up!
        </h2>
        <p className="text-muted-foreground text-base max-w-[400px]">
          No pending doses at the moment.
        </p>
      </Card>
    );
  }

  return (
    <div className="relative group/carousel h-full flex flex-col">
      <Carousel
        opts={{ align: "start", loop: false }}
        className="w-full h-full flex-1"
      >
        <CarouselContent className="-ml-4 h-full">
          {upcoming.map((dose, index) => (
            <CarouselItem
              key={`${dose.cabinetItemId}-${index}`}
              className="pl-4 basis-full lg:basis-full h-full"
            >
              <Card
                className={cn(
                  "group relative p-6 sm:p-8 rounded-[2rem] transition-all duration-300 h-full flex flex-col border",
                  dose.isMissed
                    ? "bg-destructive/5 border-destructive/30 shadow-sm"
                    : "bg-card border-border shadow-sm hover:border-primary/30",
                )}
              >
                {/* Header: Status & Time */}
                <div className="flex items-start justify-between mb-6">
                  <div className="space-y-1">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide",
                        dose.isMissed
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {dose.isMissed ? (
                        <AlertCircle className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      <span>{dose.isMissed ? "Missed Dose" : "Upcoming"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const d = new Date(dose.scheduledTime);
                      const isValid = !isNaN(d.getTime());
                      return (
                        <>
                          <div className="text-sm font-bold tabular-nums text-foreground">
                            {isValid ? format(d, "h:mm a") : "--:--"}
                          </div>
                          <div
                            className={cn(
                              "text-xs font-medium",
                              dose.isMissed
                                ? "text-destructive"
                                : "text-muted-foreground",
                            )}
                          >
                            {isValid
                              ? formatDistanceToNow(d, { addSuffix: true })
                              : "Invalid date"}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Body: Medicine Details */}
                <div className="flex items-center gap-5 flex-1 mb-8">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center shrink-0 border border-border/50">
                    <Pill
                      className="h-8 w-8 text-foreground/70"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-2xl font-bold tracking-tight truncate text-foreground mb-1">
                      {dose.name}
                    </h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {dose.brand} <span className="mx-1.5">•</span>
                      <span className="font-semibold text-foreground/80">
                        {dose.dosage || "1 Unit"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Footer: Actions */}
                <div className="flex items-center gap-3 mt-auto">
                  {(() => {
                    const d = new Date(dose.scheduledTime);
                    const isToday =
                      d.toDateString() === new Date().toDateString();
                    return (
                      <Button
                        size="lg"
                        onClick={() =>
                          handleTakeDose(
                            dose.cabinetItemId,
                            dose.name,
                            dose.scheduledTime,
                          )
                        }
                        disabled={!!actionLoading || !isToday}
                        className="flex-1 h-14 rounded-xl text-base font-bold transition-all active:scale-[0.98]"
                      >
                        {actionLoading ===
                        `${dose.cabinetItemId}-${d.getTime()}` ? (
                          <RotateCcw className="h-5 w-5 animate-spin" />
                        ) : !isToday ? (
                          <>
                            <Clock className="mr-2 h-5 w-5" />
                            Scheduled {format(d, "MMM d")}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            Mark as Taken
                          </>
                        )}
                      </Button>
                    );
                  })()}
                  <Button
                    variant="secondary"
                    size="icon"
                    asChild
                    className="h-14 w-14 rounded-xl transition-all"
                  >
                    <Link href={`/customer/cabinet/${dose.cabinetItemId}`}>
                      <Info className="h-6 w-6" />
                      <span className="sr-only">View Details</span>
                    </Link>
                  </Button>
                </div>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        {upcoming.length > 1 && (
          <>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </>
        )}
      </Carousel>
    </div>
  );
}
