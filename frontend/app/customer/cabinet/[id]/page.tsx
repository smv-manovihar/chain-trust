"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getCabinetItem,
  updateCabinetItem,
  markDoseTaken,
  undoDose,
  getDosageLogs,
  CabinetItem,
} from "@/api/customer.api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Pill,
  Clock,
  ShieldCheck,
  Save,
  Trash2,
  Bell,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileText,
  Plus,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Stethoscope,
  Calendar as CalendarIcon,
  Activity,
  AlertCircle,
  History,
  RotateCcw,
  Zap,
  Flame,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadImages } from "@/api/upload.api";
import { PageHeader } from "@/components/ui/page-header";

import Link from "next/link";
import {
  format,
  isAfter,
  isBefore,
  addDays,
  differenceInMinutes,
  differenceInHours,
} from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrescriptionSelector } from "@/components/prescriptions/prescription-selector";
import { DocumentViewerDialog } from "@/components/common/document-viewer";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
  ResponsiveDialogBody,
} from "@/components/ui/responsive-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveMediaUrl } from "@/lib/media-url";

const safeFormatTime = (time: any) => {
  if (!time) return "";
  // Check if it's already HH:mm
  if (typeof time === "string" && /^\d{2}:\d{2}$/.test(time)) return time;
  
  try {
    const d = new Date(time);
    if (isNaN(d.getTime())) return "";
    return format(d, "HH:mm");
  } catch (e) {
    return "";
  }
};

export default function MedicineDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [medicine, setMedicine] = useState<CabinetItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    composition: "",
    medicineCode: "",
    expiryDate: undefined as Date | undefined,
    dosage: 0,
    frequency: "",
    notes: "",
    doctorName: "",
    currentQuantity: 0,
    totalQuantity: 0,
    unit: "units",
    reminderTimes: [] as {
      time: string;
      mealContext: string;
      frequencyType?: string;
      daysOfWeek?: number[];
      interval?: number;
    }[],
    prescriptions: [] as { url: string; label: string; uploadedAt: string }[],
    prescriptionIds: [] as string[],
    notificationOverrides: {
      medicine_expiry: { inApp: true, email: true },
      batch_recall: { inApp: true, email: true },
      dose_reminder: { inApp: true, email: false },
    } as any,
  });
  const [dosageLogs, setDosageLogs] = useState<any[]>([]);
  const [isRefillDialogOpen, setIsRefillDialogOpen] = useState(false);
  const [refillValue, setRefillValue] = useState(0);
  const [isPrescriptionDialogOpen, setIsPrescriptionDialogOpen] =
    useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    label: string;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fetchAbortRef = useRef<AbortController | null>(null);

  // Compute isDirty state
  const isDirty = useMemo(() => {
    if (!medicine) return false;

    // Convert dates for comparison
    const initialExpiry = medicine.expiryDate
      ? new Date(medicine.expiryDate).getTime()
      : undefined;
    const currentExpiry = formData.expiryDate
      ? formData.expiryDate.getTime()
      : undefined;

    return (
      formData.name !== (medicine.name || "") ||
      formData.brand !== (medicine.brand || "") ||
      formData.composition !== (medicine.composition || "") ||
      formData.medicineCode !==
        (medicine.medicineCode ||
          (medicine.isUserAdded
            ? "N/A"
            : medicine.batchNumber || "VERIFIED")) ||
      initialExpiry !== currentExpiry ||
      formData.dosage !== (medicine.dosage || "") ||
      formData.frequency !== (medicine.frequency || "") ||
      formData.doctorName !== (medicine.doctorName || "") ||
      formData.notes !== (medicine.notes || "") ||
      formData.currentQuantity !== (medicine.currentQuantity || 0) ||
      formData.totalQuantity !== (medicine.totalQuantity || 0) ||
      formData.unit !== (medicine.unit || "units") ||
      JSON.stringify(formData.reminderTimes) !==
        JSON.stringify(
          (medicine.reminderTimes || []).map((r: any) => ({
            time: safeFormatTime(r.time),
            mealContext: r.mealContext || "no_preference",
            frequencyType: r.frequencyType || "daily",
            daysOfWeek: r.daysOfWeek || [],
            interval: r.interval || 1,
          })),
        ) ||
      JSON.stringify(formData.notificationOverrides) !==
        JSON.stringify(medicine.notificationOverrides || {})
    );
  }, [medicine, formData]);

  // Prevent closing tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      setLoading(true);
      try {
        const item = await getCabinetItem(id, controller.signal);
        setMedicine(item);
        const backendPrescriptions = Array.isArray(item.prescriptionIds)
          ? item.prescriptionIds
          : [];

        const popPrescriptions = backendPrescriptions
          .filter((p: any) => typeof p === "object" && p !== null)
          .map((p: any) => ({
            url: p.url,
            label: p.label || "Prescription",
            uploadedAt: p.createdAt || p.uploadedAt || new Date().toISOString(),
          }));

        const rawIds = backendPrescriptions.map((p: any) =>
          typeof p === "object" && p !== null ? p._id : p,
        );

        setFormData({
          name: item.name || "",
          brand: item.brand || "",
          composition: item.composition || "",
          medicineCode:
            item.medicineCode ||
            (item.isUserAdded ? "N/A" : item.batchNumber || "VERIFIED"),
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          dosage: Number(item.dosage) || 0,
          frequency: item.frequency || "",
          doctorName: item.doctorName || "",
          notes: item.notes || "",
          currentQuantity: item.currentQuantity || 0,
          totalQuantity: item.totalQuantity || 0,
          unit: item.unit || "units",
          reminderTimes: (item.reminderTimes || []).map((r: any) => ({
            time: safeFormatTime(r.time),
            mealContext: r.mealContext || "no_preference",
            frequencyType: r.frequencyType || "daily",
            daysOfWeek: r.daysOfWeek || [],
            interval: r.interval || 1,
          })),
          prescriptions: popPrescriptions,
          prescriptionIds: rawIds,
          notificationOverrides: item.notificationOverrides || {
            medicine_expiry: { inApp: true, email: true },
            batch_recall: { inApp: true, email: true },
            dose_reminder: { inApp: true, email: false },
          },
        });
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Failed to load medicine:", err);
        toast.error("Medicine not found in your library.");
        router.push("/customer/cabinet");
      } finally {
        if (fetchAbortRef.current === controller) {
          setLoading(false);
        }
      }
    };

    const loadLogs = async () => {
      try {
        const logs = await getDosageLogs(id);
        setDosageLogs(logs);
      } catch (err) {
        console.error("Failed to load logs:", err);
      }
    };

    loadData();
    loadLogs();
    return () => fetchAbortRef.current?.abort();
  }, [id, router]);

  const handleSave = async (
    updatedData?:
      | Partial<typeof formData & { images: string[] }>
      | React.MouseEvent,
    isPartial: boolean = false,
  ) => {
    if (!id) return;
    setIsSaving(true);

    const isDirectCall = updatedData && !(updatedData as any).nativeEvent;

    // Handle partial updates (e.g., prescriptions, images) immediately and exclusively
    if (isPartial && isDirectCall) {
      const partialData = updatedData as Partial<
        typeof formData & { images: string[] }
      >;
      try {
        await updateCabinetItem(id, partialData as any);
        toast.success("Treatment plan updated!");

        // Sync local state
        const medicineUpdate = { ...partialData } as any;
        if (medicineUpdate.expiryDate instanceof Date) {
          medicineUpdate.expiryDate = medicineUpdate.expiryDate.toISOString();
        }

        setMedicine((prev) =>
          prev ? ({ ...prev, ...medicineUpdate } as any) : null,
        );
        setFormData((prev) => ({ ...prev, ...partialData }));
      } catch (err: any) {
        toast.error("Failed to save changes.");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const actualData = isDirectCall
      ? { ...formData, ...(updatedData as any) }
      : formData;

    try {
      const today = new Date();
      const mappedReminders = (actualData.reminderTimes || []).map((r: any) => {
        const [hours, minutes] = r.time.split(":").map(Number);
        const date = new Date(today);
        date.setHours(hours, minutes, 0, 0);
        return {
          time: date.toISOString(),
          mealContext: r.mealContext || "no_preference",
          frequencyType: r.frequencyType || "daily",
          daysOfWeek: r.daysOfWeek || [],
          interval: r.interval || 1,
        };
      });

      const { prescriptions, ...sanitizedData } = actualData;

      const payload = {
        ...sanitizedData,
        reminderTimes: mappedReminders as any,
        images: (updatedData as any)?.images || medicine?.images,
        expiryDate:
          actualData.expiryDate instanceof Date
            ? actualData.expiryDate.toISOString()
            : actualData.expiryDate,
      };

      await updateCabinetItem(id, payload as any);
      toast.success("Treatment plan updated!");

      // Sync local state
      setMedicine((prev) =>
        prev
          ? ({
              ...prev,
              ...actualData,
              expiryDate:
                actualData.expiryDate instanceof Date
                  ? actualData.expiryDate.toISOString()
                  : actualData.expiryDate,
            } as any)
          : null,
      );

      if (isDirectCall) {
        setFormData((prev) => ({ ...prev, ...updatedData }));
      }
    } catch (err: any) {
      toast.error("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTakeDose = async () => {
    if (!id || !medicine) return;
    try {
      const res = await markDoseTaken(id);
      const isLate = !res.wasPunctual;

      setMedicine((prev) =>
        prev
          ? ({
              ...prev,
              currentQuantity: res.currentQuantity,
              lastDoseTaken: res.lastDoseTaken,
            } as any)
          : null,
      );
      setFormData((prev) => ({
        ...prev,
        currentQuantity: res.currentQuantity,
      }));

      // Refresh logs
      const logs = await getDosageLogs(id);
      setDosageLogs(logs);

      toast.success(isLate ? "Dose recorded (Late)" : "Dose recorded!", {
        description: isLate
          ? `Recorded outside the 3h window.`
          : `Your dose for ${medicine.name} has been recorded.`,
        action: {
          label: "Undo",
          onClick: () => handleUndoDose(),
        },
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record dose");
    }
  };

  const handleUndoDose = async () => {
    if (!id || !medicine) return;
    try {
      const res = await undoDose(id);
      setMedicine((prev) =>
        prev
          ? ({
              ...prev,
              currentQuantity: res.currentQuantity,
              lastDoseTaken: res.lastDoseTaken,
            } as any)
          : null,
      );
      setFormData((prev) => ({
        ...prev,
        currentQuantity: res.currentQuantity,
      }));

      // Refresh logs
      const logs = await getDosageLogs(id);
      setDosageLogs(logs);

      toast.success("Dose undone", {
        description: `Inventory restored to ${res.currentQuantity}`,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to undo dose");
    }
  };

  const prefDefaults = {
    medicine_expiry: { inApp: true, email: true },
    batch_recall: { inApp: true, email: true },
    dose_reminder: { inApp: true, email: false },
  };

  const handleNotificationOverride = (
    type: string,
    field: "inApp" | "email" | "leadTimeMinutes",
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      notificationOverrides: {
        ...prev.notificationOverrides,
        [type]: {
          ...(prev.notificationOverrides?.[type] || {
            inApp: true,
            email:
              prefDefaults[type as keyof typeof prefDefaults]?.email ?? true,
          }),
          [field]: value,
        },
      },
    }));
  };

  const isDoseRecentlyTaken = useMemo(() => {
    if (!medicine?.lastDoseTaken) return false;
    const lastTakenDate = new Date(medicine.lastDoseTaken);
    if (isNaN(lastTakenDate.getTime())) return false;
    const lastTaken = lastTakenDate.getTime();
    const now = new Date().getTime();
    const window = 4 * 60 * 60 * 1000; // 4 hour status persistence
    return now - lastTaken < window;
  }, [medicine?.lastDoseTaken]);

  const lastTakenText = useMemo(() => {
    if (!medicine?.lastDoseTaken) return null;
    const lastTaken = new Date(medicine.lastDoseTaken);
    if (isNaN(lastTaken.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastTaken.getTime();
    const diffMins = Math.floor(diffMs / 1000 / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return format(lastTaken, "MMM d");
  }, [medicine?.lastDoseTaken]);

  const isOccurrenceOnDay = (reminder: any, date: Date): boolean => {
    const freq = reminder.frequencyType || "daily";
    if (freq === "daily") return true;

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    let anchor: Date;
    if (typeof reminder.time === "string" && /^\d{2}:\d{2}$/.test(reminder.time)) {
      // If it's just HH:mm, use today as the anchor date
      const [h, m] = reminder.time.split(":").map(Number);
      anchor = new Date();
      anchor.setHours(h, m, 0, 0);
    } else {
      anchor = new Date(reminder.time);
    }
    
    if (isNaN(anchor.getTime())) return false;
    anchor.setHours(0, 0, 0, 0);

    if (target.getTime() < anchor.getTime()) return false;

    if (freq === "weekly") {
      return reminder.daysOfWeek?.includes(target.getDay());
    }

    if (freq === "interval_days") {
      const diffMs = target.getTime() - anchor.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return diffDays % (reminder.interval || 1) === 0;
    }

    if (freq === "interval_months") {
      if (target.getDate() !== anchor.getDate()) return false;
      const monthDiff =
        target.getFullYear() * 12 +
        target.getMonth() -
        (anchor.getFullYear() * 12 + anchor.getMonth());
      return monthDiff % (reminder.interval || 1) === 0;
    }
    return false;
  };

  const nextDoseInfo = useMemo(() => {
    if (!medicine?.reminderTimes || medicine.reminderTimes.length === 0) {
      return null;
    }

    const now = new Date();

    const occurrences = medicine.reminderTimes
      .map((r) => {
        let checkDate = new Date(now);
        let found = false;
        let iterations = 0;

        while (!found && iterations < 90) {
          if (isOccurrenceOnDay(r, checkDate)) {
            let reminderDate: Date;
            if (typeof r.time === "string" && /^\d{2}:\d{2}$/.test(r.time)) {
              const [h, m] = r.time.split(":").map(Number);
              reminderDate = new Date();
              reminderDate.setHours(h, m, 0, 0);
            } else {
              reminderDate = new Date(r.time);
            }

            if (isNaN(reminderDate.getTime())) {
              iterations++;
              checkDate.setDate(checkDate.getDate() + 1);
              continue;
            }

            const occurrence = new Date(checkDate);
            occurrence.setHours(
              reminderDate.getHours(),
              reminderDate.getMinutes(),
              0,
              0,
            );

            // If it's today and already passed, look for tomorrow or next valid day
            if (
              checkDate.toDateString() === now.toDateString() &&
              isBefore(occurrence, now)
            ) {
              checkDate.setDate(checkDate.getDate() + 1);
              iterations++;
              continue;
            }

            return {
              date: occurrence,
              mealContext: r.mealContext || "no_preference",
            };
          }
          checkDate.setDate(checkDate.getDate() + 1);
          iterations++;
        }
        return null;
      })
      .filter((occ): occ is NonNullable<typeof occ> => occ !== null);

    if (occurrences.length === 0) return null;

    const sorted = [...occurrences].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
    const next = sorted[0];

    const diffMins = differenceInMinutes(next.date, now);
    const diffHours = differenceInHours(next.date, now);

    let remainingText = "";
    if (diffHours > 0) {
      remainingText = `In ${diffHours}h ${diffMins % 60}m`;
    } else {
      remainingText = `In ${diffMins}m`;
    }

    const isToday =
      format(next.date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
    const isTomorrow =
      format(next.date, "yyyy-MM-dd") === format(addDays(now, 1), "yyyy-MM-dd");

    return {
      time: format(next.date, "p"),
      dayText: isToday
        ? "Today"
        : isTomorrow
          ? "Tomorrow"
          : format(next.date, "MMM d"),
      remainingText,
      mealContext:
        next.mealContext === "no_preference"
          ? "No meal preference"
          : next.mealContext
              .replace("_", " ")
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" "),
    };
  }, [medicine?.reminderTimes]);

  const handlePrescriptionChange = async (
    newIds: string[],
    newObjects: any[],
  ) => {
    const formattedObjects = newObjects.map((p) => ({
      url: p.url,
      label: p.label || "Prescription",
      uploadedAt: p.createdAt || p.uploadedAt || new Date().toISOString(),
    }));

    const nextFormData = {
      ...formData,
      prescriptionIds: newIds,
      prescriptions: formattedObjects,
    };

    setFormData(nextFormData);
  };

  const handlePrescriptionConfirm = async (
    newIds: string[],
    newObjects: any[],
  ) => {
    // On confirm, we save immediately to the backend as requested
    const formattedObjects = newObjects.map((p) => ({
      url: p.url,
      label: p.label || "Prescription",
      uploadedAt: p.createdAt || p.uploadedAt || new Date().toISOString(),
    }));

    const updatePayload = {
      prescriptionIds: newIds,
    };

    await handleSave(updatePayload, true);
    setIsPrescriptionDialogOpen(false);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const urls = await uploadImages(Array.from(files));
      const updatedImages = [...(medicine?.images || []), ...urls];
      await handleSave({ images: updatedImages }, true);
      toast.success("Images updated.");
    } catch (error) {
      toast.error("Failed to upload images.");
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const removePrescription = (url: string) => {
    const updated = formData.prescriptions.filter((p) => p.url !== url);
    const updatedIds = medicine?.prescriptionIds?.filter(
      (id: string, idx: number) => medicine.prescriptions?.[idx]?.url !== url,
    );
    setFormData((prev) => ({
      ...prev,
      prescriptions: updated,
      prescriptionIds: updatedIds || [],
    }));
  };

  const removeImage = async (url: string) => {
    const updated = (medicine?.images || []).filter((img) => img !== url);
    await handleSave({ images: updated }, true);
  };

  const addReminder = () => {
    setFormData((prev) => ({
      ...prev,
      reminderTimes: [
        ...prev.reminderTimes,
        {
          time: "19:00",
          mealContext: "no_preference",
          frequencyType: "daily",
          daysOfWeek: [1, 2, 3, 4, 5],
          interval: 1,
        },
      ],
    }));
  };

  const updateReminder = (
    index: number,
    updates: Partial<{
      time: string;
      mealContext: string;
      frequencyType: string;
      daysOfWeek: number[];
      interval: number;
    }>,
  ) => {
    const newReminders = [...formData.reminderTimes];
    newReminders[index] = { ...newReminders[index], ...updates } as any;
    setFormData((prev) => ({ ...prev, reminderTimes: newReminders }));
  };

  const removeReminder = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      reminderTimes: prev.reminderTimes.filter((_, i) => i !== index),
    }));
  };

  const handleRefill = async (newTotal: number, updatePackSize?: number) => {
    if (!id) return;
    try {
      const payload: any = { currentQuantity: newTotal };
      if (updatePackSize) payload.totalQuantity = updatePackSize;

      await updateCabinetItem(id, payload);
      setMedicine((prev) => (prev ? { ...prev, ...payload } : null));
      setFormData((prev) => ({ ...prev, ...payload }));
      setIsRefillDialogOpen(false);
      toast.success("Inventory refilled!", {
        description: `New stock: ${newTotal} ${medicine?.unit || "units"}`,
      });
    } catch (err) {
      toast.error("Failed to update inventory.");
    }
  };

  const handleToggleStatus = async () => {
    if (!id || !medicine) return;
    const newStatus = medicine.status === "inactive" ? "active" : "inactive";
    try {
      await updateCabinetItem(id, { status: newStatus });
      setMedicine((prev) =>
        prev ? ({ ...prev, status: newStatus } as any) : null,
      );
      toast.success(
        newStatus === "inactive"
          ? "Medicine deactivated"
          : "Medicine reactivated",
        {
          description:
            newStatus === "inactive"
              ? "Reminders are now suppressed."
              : "Reminders are now active.",
        },
      );
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!medicine) return null;

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col space-y-4 sm:space-y-6">
      <PageHeader
        title={medicine.name}
        description={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold">{medicine.brand}</span>
            {!medicine.isUserAdded && (
              <>
                <span className="text-muted-foreground/30 hidden sm:inline">
                  •
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] border-primary/20 bg-primary/5 text-primary/70 rounded-full h-5 px-2"
                >
                  Batch: #{medicine.batchNumber}
                </Badge>
              </>
            )}
            {formData.notes && (
              <>
                <span className="text-muted-foreground/30 hidden sm:inline">
                  •
                </span>
                <p className="font-medium italic opacity-70 truncate max-w-md">
                  Note:{" "}
                  {formData.notes.length > 60
                    ? formData.notes.substring(0, 60) + "..."
                    : formData.notes}
                </p>
              </>
            )}
          </div>
        }
        stats={
          <div className="flex items-center gap-2">
            {!medicine.isUserAdded && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold text-[10px] shrink-0">
                Authentic
              </Badge>
            )}
            {medicine.status === "inactive" && (
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground border-none font-bold text-[10px] shrink-0"
              >
                Inactive
              </Badge>
            )}
          </div>
        }
        backHref="/customer/cabinet"
        actions={
          <div className="flex flex-col gap-4 w-full sm:w-[280px]">
            {/* Secondary Management Row */}
            <div className="flex items-center justify-end gap-2">
              {medicine.lastDoseTaken && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleUndoDose}
                      className="rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 w-10 transition-colors shrink-0"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo last dose</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setRefillValue(
                        (medicine?.currentQuantity || 0) +
                          (medicine?.totalQuantity || 0),
                      );
                      setIsRefillDialogOpen(true);
                    }}
                    className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 h-10 px-4 transition-colors shrink-0 font-black text-xs gap-2"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Refill</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refill inventory</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleToggleStatus}
                    className={cn(
                      "rounded-full transition-all active:scale-95 shrink-0 px-3 h-10 flex gap-2 border-border/50",
                      medicine.status === "inactive"
                        ? "bg-primary/5 text-primary border-primary/20"
                        : "hover:bg-muted text-muted-foreground",
                    )}
                  >
                    {medicine.status === "inactive" ? (
                      <>
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        <span className="font-bold text-xs">Activate</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                        <span className="font-bold text-xs">Deactivate</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {medicine.status === "inactive"
                    ? "Show in schedule"
                    : "Hide from schedule"}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Primary Action Row */}
            <Button
              onClick={handleTakeDose}
              disabled={isDoseRecentlyTaken}
              className={cn(
                "w-full rounded-full shadow-lg gap-3 h-12 font-black transition-all text-sm active:scale-[0.98]",
                isDoseRecentlyTaken
                  ? "bg-muted text-muted-foreground border-border"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20",
              )}
            >
              {isDoseRecentlyTaken ? (
                <Clock className="h-5 w-5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              )}
              {isDoseRecentlyTaken ? "Dose Recorded" : "Mark as taken"}
            </Button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 overflow-hidden pb-4 sm:pb-0">
        {/* Main Content Column */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar pr-1 pb-16 sm:pb-8">
          {/* Adherence Hero */}
          <Card className="p-6 rounded-3xl border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Flame className="h-32 w-32 text-primary" />
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
              <div className="flex-1 space-y-4 w-full text-center md:text-left">
                {!nextDoseInfo ? (
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                      Dose Schedule
                    </h3>
                    <div className="flex items-baseline gap-2 justify-center md:justify-start">
                      <span className="text-2xl font-black tracking-tight text-muted-foreground/40 italic">
                        No reminders set
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-primary/60 mb-1">
                      Next Dosage
                    </h3>
                    <div className="flex items-baseline gap-2 justify-center md:justify-start">
                      <span className="text-4xl font-black tracking-tight">
                        {nextDoseInfo.dayText}
                      </span>
                      <span className="text-2xl font-bold text-muted-foreground">
                        at
                      </span>
                      <span className="text-4xl font-black text-primary">
                        {nextDoseInfo.time}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {nextDoseInfo && (
                    <>
                      <Badge
                        variant="outline"
                        className="rounded-full bg-background border-primary/10 font-bold px-3 py-1"
                      >
                        <Clock className="h-3 w-3 mr-1.5 text-primary" />
                        {nextDoseInfo.remainingText}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="rounded-full bg-background border-primary/10 font-bold px-3 py-1"
                      >
                        <Activity className="h-3 w-3 mr-1.5 text-primary" />
                        {nextDoseInfo.mealContext}
                      </Badge>
                    </>
                  )}
                  {medicine.currentStreak !== undefined &&
                    medicine.currentStreak > 0 && (
                      <Badge className="rounded-full bg-orange-500/10 text-orange-600 border-orange-200 font-black px-3 py-1 animate-pulse">
                        <Flame className="h-3 w-3 mr-1.5 fill-current" />
                        {medicine.currentStreak} Day Streak
                      </Badge>
                    )}
                </div>
              </div>

              <div className="h-32 w-px bg-primary/10 hidden md:block" />

              <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-2">
                <div className="text-center md:text-right">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                    Current Stock
                  </h3>
                  <p
                    className={cn(
                      "text-4xl font-black tracking-tighter",
                      (medicine.currentQuantity || 0) < 5
                        ? "text-destructive"
                        : "text-foreground",
                    )}
                  >
                    {medicine.currentQuantity}
                    <span className="text-sm font-bold text-muted-foreground ml-1">
                      {medicine.unit || "units"}
                    </span>
                  </p>
                </div>
                {(medicine.currentQuantity || 0) < 5 && (
                  <Badge className="bg-destructive/10 text-destructive border-none font-black text-[10px] animate-pulse">
                    <AlertCircle className="h-3 w-3 mr-1" /> Low Stock
                  </Badge>
                )}
              </div>

              {medicine.lastDoseTaken && (
                <>
                  <div className="h-32 w-px bg-primary/10 hidden md:block" />
                  <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-2">
                    <div className="text-center md:text-right">
                      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                        Last Recorded
                      </h3>
                      <p className="text-4xl font-black tracking-tighter text-foreground">
                        {format(new Date(medicine.lastDoseTaken), "p")}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground opacity-60 mt-0.5">
                        {format(
                          new Date(medicine.lastDoseTaken),
                          "MMM d, yyyy",
                        )}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="p-4 sm:p-6 lg:p-8 rounded-3xl border-border/50 bg-card/50 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8 relative z-10">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Bell
                  className="h-5 w-5 sm:h-6 sm:w-6 text-primary"
                  aria-hidden="true"
                />
                Dose management
              </h2>
              <div className="flex gap-2">
                {/* Refill button moved to header actions */}
              </div>
            </div>

            <Tabs defaultValue="schedule" className="w-full relative z-10 mt-2">
              <TabsList className="w-full flex justify-start sm:w-auto sm:inline-flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mb-6 sm:mb-8 bg-muted/30 p-1 rounded-2xl h-12 border border-border/40 gap-1">
                <TabsTrigger
                  value="schedule"
                  className="rounded-xl font-bold text-xs sm:text-sm h-10 data-[state=active]:shadow-xl data-[state=active]:bg-background gap-2 transition-all whitespace-nowrap px-4"
                >
                  <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="hidden sm:inline">Schedule</span>
                  <span className="sm:hidden">Plan</span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-xl font-bold text-xs sm:text-sm h-10 data-[state=active]:shadow-xl data-[state=active]:bg-background gap-2 transition-all whitespace-nowrap px-4"
                >
                  <History
                    className="h-4 w-4 text-primary"
                    aria-hidden="true"
                  />
                  History
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="rounded-xl font-bold text-xs sm:text-sm h-10 data-[state=active]:shadow-xl data-[state=active]:bg-background gap-2 transition-all whitespace-nowrap px-4"
                >
                  <FileText
                    className="h-4 w-4 text-primary"
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">Details & Media</span>
                  <span className="sm:hidden">Media</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="history"
                className="space-y-4 animate-in fade-in-50 duration-300"
              >
                {dosageLogs.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center bg-muted/5 rounded-3xl border-2 border-dashed border-primary/5">
                    <History
                      className="h-8 w-8 text-muted-foreground/20 mb-3"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-bold text-muted-foreground/40">
                      No dosage history found.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dosageLogs.slice(0, 20).map((log) => (
                      <div
                        key={log._id}
                        className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-primary/5"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center",
                              log.wasPunctual
                                ? "bg-emerald-500/10"
                                : "bg-amber-500/10",
                            )}
                          >
                            {log.wasPunctual ? (
                              <CheckCircle2
                                className="h-5 w-5 text-emerald-500"
                                aria-hidden="true"
                              />
                            ) : (
                              <AlertCircle
                                className="h-5 w-5 text-amber-600"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-sm text-foreground">
                                Dose Recorded
                              </p>
                              {!log.wasPunctual && (
                                <Badge
                                  variant="outline"
                                  className="text-[8px] font-black h-4 px-1.5 rounded-md border-none bg-amber-500/10 text-amber-600"
                                >
                                  Late
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground opacity-70">
                              {format(new Date(log.timestamp), "PPPP 'at' p")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-black rounded-lg border-primary/10 bg-background"
                          >
                            -1 {medicine.unit || "unit"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="schedule"
                className="animate-in fade-in-50 duration-300"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 pb-4">
                  {/* Left Column: Reminders */}
                  <div className="space-y-6 lg:h-0 lg:min-h-full flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-black text-foreground flex items-center gap-2">
                          <Bell className="h-4 w-4 text-primary" />
                          Smart Reminders
                        </Label>
                        <p className="text-[10px] font-bold text-muted-foreground opacity-60">
                          Schedule your daily intake times
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addReminder}
                        className="h-8 text-xs font-bold hover:bg-primary/5 text-primary rounded-full px-3"
                      >
                        <Plus className="h-3 w-3 mr-1" aria-hidden="true" /> Add
                      </Button>
                    </div>

                    <div className="space-y-3 pr-2 flex-1 overflow-y-auto custom-scrollbar">
                      {formData.reminderTimes.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center bg-muted/5 rounded-3xl border-2 border-dashed border-primary/5">
                          <Clock
                            className="h-8 w-8 text-muted-foreground/20 mb-3"
                            aria-hidden="true"
                          />
                          <p className="text-xs font-bold text-muted-foreground/40 italic">
                            No reminders set for this medicine
                          </p>
                        </div>
                      ) : (
                        formData.reminderTimes.map((r, idx) => {
                          const isInvalid =
                            !r.time || !/^\d{2}:\d{2}$/.test(r.time);
                          return (
                            <Card
                              key={idx}
                              className={cn(
                                "p-4 sm:p-5 rounded-[2rem] border shadow-sm transition-all hover:shadow-md",
                                isInvalid
                                  ? "border-destructive/50 bg-destructive/5"
                                  : "border-border/50 bg-card/50",
                              )}
                            >
                              <div className="flex flex-col gap-5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                      <Clock className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <p className="font-black text-sm text-foreground">
                                        Reminder #{idx + 1}
                                      </p>
                                      <p className="text-[10px] font-bold text-muted-foreground opacity-60">
                                        Set dose time and frequency
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeReminder(idx)}
                                    className="h-9 w-9 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase px-1">
                                      Intake Time
                                    </Label>
                                    <Input
                                      type="time"
                                      className="h-11 rounded-xl bg-muted/30 border-none font-black text-sm focus:ring-1 focus:ring-primary/20"
                                      value={r.time}
                                      onChange={(e) =>
                                        updateReminder(idx, {
                                          time: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase px-1">
                                      Meal Context
                                    </Label>
                                    <Select
                                      value={r.mealContext}
                                      onValueChange={(val) =>
                                        updateReminder(idx, {
                                          mealContext: val,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-none font-bold text-xs focus:ring-1 focus:ring-primary/20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl">
                                        <SelectItem value="no_preference">
                                          No Preference
                                        </SelectItem>
                                        <SelectItem value="before_meal">
                                          Before Meal
                                        </SelectItem>
                                        <SelectItem value="after_meal">
                                          After Meal
                                        </SelectItem>
                                        <SelectItem value="with_meal">
                                          With Meal
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-border/20">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-0.5">
                                      <Label className="text-[10px] font-black text-muted-foreground uppercase px-1">
                                        Frequency
                                      </Label>
                                      <Select
                                        value={r.frequencyType || "daily"}
                                        onValueChange={(val) =>
                                          updateReminder(idx, {
                                            frequencyType: val,
                                          })
                                        }
                                      >
                                        <SelectTrigger className="h-11 rounded-xl bg-background border-border/40 font-black text-xs min-w-[160px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                          <SelectItem value="daily">
                                            Every Day
                                          </SelectItem>
                                          <SelectItem value="weekly">
                                            Specific Days
                                          </SelectItem>
                                          <SelectItem value="interval_days">
                                            Day Interval
                                          </SelectItem>
                                          <SelectItem value="interval_months">
                                            Month Interval
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {(r.frequencyType === "interval_days" ||
                                      r.frequencyType ===
                                        "interval_months") && (
                                      <div className="flex items-center gap-2 pr-2">
                                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase">
                                          Every
                                        </span>
                                        <Input
                                          type="number"
                                          min={1}
                                          max={365}
                                          className="h-11 w-16 rounded-xl bg-background border-border/40 font-black text-center text-sm"
                                          value={r.interval || 1}
                                          onChange={(e) =>
                                            updateReminder(idx, {
                                              interval:
                                                parseInt(e.target.value) || 1,
                                            })
                                          }
                                        />
                                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase">
                                          {r.frequencyType === "interval_days"
                                            ? "Days"
                                            : "Months"}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {r.frequencyType === "weekly" && (
                                    <div className="flex justify-between gap-1 pt-2">
                                      {["S", "M", "T", "W", "T", "F", "S"].map(
                                        (day, dIdx) => {
                                          const isSelected =
                                            r.daysOfWeek?.includes(dIdx);
                                          return (
                                            <button
                                              key={dIdx}
                                              type="button"
                                              onClick={() => {
                                                const current =
                                                  r.daysOfWeek || [];
                                                const next = isSelected
                                                  ? current.filter(
                                                      (d) => d !== dIdx,
                                                    )
                                                  : [...current, dIdx];
                                                updateReminder(idx, {
                                                  daysOfWeek: next,
                                                });
                                              }}
                                              className={cn(
                                                "h-9 flex-1 rounded-xl border text-[10px] font-black transition-all",
                                                isSelected
                                                  ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
                                                  : "bg-background border-border/40 text-muted-foreground hover:border-primary/20",
                                              )}
                                            >
                                              {day}
                                            </button>
                                          );
                                        },
                                      )}
                                    </div>
                                  )}

                                  {r.frequencyType &&
                                    r.frequencyType !== "daily" && (
                                      <p className="text-[9px] font-bold text-muted-foreground/50 italic px-1 flex items-center gap-1">
                                        <Activity className="h-2.5 w-2.5" />
                                        {r.frequencyType === "weekly"
                                          ? "Reminder only triggers on selected days."
                                          : `Calculated relative to ${medicine.isUserAdded ? "the setup date" : "the batch enrollment date"}.`}
                                      </p>
                                    )}
                                </div>
                              </div>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Inventory & Dosage */}
                  <div className="space-y-8 lg:border-l lg:pl-8 lg:border-border/40">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <Label className="text-sm font-black text-foreground flex items-center gap-2">
                            <Pill className="h-4 w-4 text-primary" />
                            Inventory & Dosage
                          </Label>
                          <p className="text-[10px] font-bold text-muted-foreground opacity-60">
                            Manage your stock and standard dose
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                            Dose per intake
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              placeholder="e.g. 1"
                              className="pl-10 h-12 rounded-full border-border bg-muted/30 focus-visible:ring-primary/20 font-bold"
                              value={formData.dosage || ""}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  dosage: Math.max(
                                    0,
                                    e.target.value === ""
                                      ? 0
                                      : Number(e.target.value),
                                  ),
                                }))
                              }
                            />
                            <p className="px-3 mt-1.5 text-[9px] font-black text-muted-foreground/40 italic flex items-center gap-1">
                              <ShieldCheck className="h-2.5 w-2.5" />
                              Automatically deducted from total quantity on
                              every intake
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                              Current
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              className="h-12 rounded-full border-border bg-muted/30 focus-visible:ring-primary/20 font-black text-center"
                              value={formData.currentQuantity}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  currentQuantity: Math.max(
                                    0,
                                    Number(e.target.value),
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                              Capacity
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              className="h-12 rounded-full border-border bg-muted/30 focus-visible:ring-primary/20 font-black text-center"
                              value={formData.totalQuantity}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  totalQuantity: Math.max(
                                    0,
                                    Number(e.target.value),
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                              Unit
                            </Label>
                            <Select
                              value={formData.unit}
                              onValueChange={(val) =>
                                setFormData((prev) => ({ ...prev, unit: val }))
                              }
                            >
                              <SelectTrigger className="h-12 rounded-full border-border bg-muted/30 focus:ring-primary/20 focus:ring-offset-0 font-bold w-full">
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-border/50">
                                {[
                                  "tablets",
                                  "capsules",
                                  "pills",
                                  "mg",
                                  "ml",
                                  "doses",
                                  "units",
                                ].map((u) => (
                                  <SelectItem
                                    key={u}
                                    value={u}
                                    className="rounded-lg cursor-pointer"
                                  >
                                    {u.charAt(0).toUpperCase() + u.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                            Medication expiry date
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-medium h-12 rounded-full border-border bg-muted/30 focus:ring-primary/20",
                                  !formData.expiryDate &&
                                    "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon
                                  className="mr-2 h-4 w-4 text-primary"
                                  aria-hidden="true"
                                />
                                {formData.expiryDate ? (
                                  format(formData.expiryDate, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 rounded-2xl border-border shadow-xl"
                              align="start"
                            >
                              <CalendarComponent
                                mode="single"
                                selected={formData.expiryDate}
                                onSelect={(date) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    expiryDate: date,
                                  }))
                                }
                                initialFocus
                                className="rounded-2xl"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                            Notes & observations
                          </Label>
                          <Textarea
                            placeholder="Take after meal..."
                            className="min-h-[80px] rounded-2xl border-border bg-muted/30 focus-visible:ring-primary/20 font-medium resize-none p-4"
                            value={formData.notes}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                notes: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="pt-6 border-t border-border/50">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shadow-sm border border-orange-500/20">
                              <Bell className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-foreground">
                                Notification preferences
                              </h3>
                              <p className="text-[10px] font-bold text-muted-foreground opacity-70">
                                Override global alerts for this medicine
                              </p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {[
                              {
                                key: "dose_reminder",
                                label: "Dose Reminders",
                                desc: "Alerts for scheduled times",
                                hasLeadTime: true,
                              },
                              {
                                key: "medicine_expiry",
                                label: "Expiry Alerts",
                                desc: "Alerts before this batch expires",
                              },
                            ].map((pref) => (
                              <div
                                key={pref.key}
                                className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-4"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <Label className="text-xs font-black">
                                      {pref.label}
                                    </Label>
                                    <p className="text-[10px] font-medium text-muted-foreground/70">
                                      {pref.desc}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-[8px] font-black uppercase text-muted-foreground/40">
                                        In-App
                                      </span>
                                      <Switch
                                        checked={
                                          formData.notificationOverrides[
                                            pref.key
                                          ]?.inApp ?? true
                                        }
                                        onCheckedChange={(checked) =>
                                          handleNotificationOverride(
                                            pref.key,
                                            "inApp",
                                            checked,
                                          )
                                        }
                                        className="scale-75 data-[state=checked]:bg-primary"
                                      />
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-[8px] font-black uppercase text-muted-foreground/40">
                                        Email
                                      </span>
                                      <Switch
                                        checked={
                                          formData.notificationOverrides[
                                            pref.key
                                          ]?.email ?? true
                                        }
                                        onCheckedChange={(checked) =>
                                          handleNotificationOverride(
                                            pref.key,
                                            "email",
                                            checked,
                                          )
                                        }
                                        className="scale-75 data-[state=checked]:bg-primary"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {pref.hasLeadTime && (
                                  <div className="flex items-center justify-between pt-3 border-t border-border/20">
                                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase">
                                      Notification lead time
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        className="w-16 h-8 text-xs font-black text-center rounded-xl bg-background border-border/40"
                                        value={
                                          formData.notificationOverrides[
                                            pref.key
                                          ]?.leadTimeMinutes ?? 0
                                        }
                                        onChange={(e) =>
                                          handleNotificationOverride(
                                            pref.key,
                                            "leadTimeMinutes",
                                            parseInt(e.target.value) || 0,
                                          )
                                        }
                                      />
                                      <span className="text-[10px] font-bold text-muted-foreground/40">
                                        min before
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="details"
                className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-300"
              >
                <input
                  type="file"
                  ref={imageInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  multiple
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-4 sm:p-6 rounded-[1.5rem] border border-border/50">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">
                      Prescribing doctor
                    </Label>
                    <div className="relative">
                      <Stethoscope
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        placeholder="e.g. Dr. Jane Doe"
                        className="pl-10 h-11 rounded-full border-border bg-background font-medium"
                        value={formData.doctorName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            doctorName: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">
                      Clinical composition
                    </Label>
                    <div className="relative">
                      <Pill className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={
                          medicine.isUserAdded
                            ? "e.g. Paracetamol 500mg"
                            : "Verified composition"
                        }
                        className="pl-10 h-11 rounded-full border-border bg-background font-medium"
                        value={formData.composition}
                        readOnly={!medicine.isUserAdded}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            composition: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator className="my-2 opacity-50" />

                {/* Prescriptions & Documents Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <FileText
                        className="h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                      <span>Prescriptions</span>
                    </label>

                    <Button
                      variant="outline"
                      onClick={() => setIsPrescriptionDialogOpen(true)}
                      className="h-10 sm:h-9 rounded-full gap-2 text-sm sm:text-xs border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-colors font-medium px-4"
                    >
                      <Plus
                        className="h-4 w-4 sm:h-3 sm:w-3"
                        aria-hidden="true"
                      />
                      <span>
                        {(formData.prescriptionIds?.length ?? 0) > 0
                          ? "Manage attachments"
                          : "Attach prescription"}
                      </span>
                    </Button>
                  </div>

                  <PrescriptionSelector
                    open={isPrescriptionDialogOpen}
                    onOpenChange={setIsPrescriptionDialogOpen}
                    selectedIds={formData.prescriptionIds || []}
                    onChange={handlePrescriptionChange}
                    onConfirm={handlePrescriptionConfirm}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formData.prescriptions.map((p, idx) => (
                      <div
                        key={idx}
                        className="group/doc relative flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all shadow-sm gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <FileText className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {p.label}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium truncate">
                              Uploaded{" "}
                              {new Date(p.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {/* Actions are always visible on mobile, hover visible on desktop */}
                        <div className="flex items-center gap-1 self-end sm:self-auto opacity-100 sm:opacity-0 sm:group-hover/doc:opacity-100 transition-opacity bg-muted/50 sm:bg-transparent rounded-lg p-1 sm:p-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg sm:rounded-full hover:bg-primary/10 text-primary"
                            aria-label="View document"
                            onClick={() =>
                              setPreviewDoc({ url: p.url, label: p.label })
                            }
                          >
                            <Eye
                              className="h-4 w-4 sm:h-3.5 sm:w-3.5"
                              aria-hidden="true"
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePrescription(p.url)}
                            className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg sm:rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Remove prescription"
                          >
                            <Trash2
                              className="h-4 w-4 sm:h-3.5 sm:w-3.5"
                              aria-hidden="true"
                            />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {formData.prescriptions.length === 0 && (
                      <div className="sm:col-span-2">
                        <EmptyState
                          compact
                          icon={FileText}
                          title="Your vault is empty"
                          description="No prescriptions are linked to this medicine yet."
                          className="rounded-2xl border-dashed border-border"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-6 sm:my-8 opacity-50" />

                {/* Packaging Photos Section */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                        <ImageIcon
                          className="h-4 w-4 text-primary"
                          aria-hidden="true"
                        />
                        Images
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium">
                        Keep photographic proof of original packaging
                      </p>
                    </div>
                    <Button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isUploadingImage}
                      variant="outline"
                      className="rounded-full w-full sm:w-auto px-5 border-border hover:bg-muted gap-2 h-12 sm:h-9 font-semibold text-sm sm:text-xs"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Capture photo
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {medicine.images?.map((img, idx) => (
                      <div
                        key={idx}
                        className="group/img relative aspect-square rounded-2xl overflow-hidden border border-border shadow-sm group hover:border-primary/30 transition-all bg-card flex flex-col"
                      >
                        <img
                          src={resolveMediaUrl(img)}
                          alt={`Packaging ${idx}`}
                          className="w-full h-full object-cover sm:group-hover/img:scale-105 transition-transform duration-500"
                        />

                        {/* Always visible Action Footer on Mobile, Overlay on Desktop */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover/img:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setPreviewDoc({
                                url: img,
                                label: `Packaging Photo ${idx + 1}`,
                              })
                            }
                            className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg bg-white/20 backdrop-blur-md text-white hover:bg-white/40 border border-white/10"
                            aria-label="View image"
                          >
                            <Eye
                              className="h-4 w-4 sm:h-3.5 sm:w-3.5"
                              aria-hidden="true"
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeImage(img)}
                            className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg bg-destructive/20 backdrop-blur-md text-white hover:bg-destructive/80 border border-white/10"
                            aria-label="Remove image"
                          >
                            <Trash2
                              className="h-4 w-4 sm:h-3.5 sm:w-3.5"
                              aria-hidden="true"
                            />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!medicine.images || medicine.images.length === 0) && (
                      <div className="col-span-full py-8 sm:py-12 flex flex-col items-center justify-center text-center bg-muted/30 rounded-2xl border border-dashed border-border">
                        <ImageIcon
                          className="h-8 w-8 mb-2 text-muted-foreground/50"
                          aria-hidden="true"
                        />
                        <p className="text-xs font-semibold text-muted-foreground">
                          No Images added yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-6 px-2">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground shadow-inner border border-border/50">
                      <Clock className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground opacity-60 mb-0.5">
                        Added to library
                      </p>
                      <p className="text-sm font-bold">
                        {medicine.createdAt
                          ? format(new Date(medicine.createdAt), "PPP")
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {!medicine.isUserAdded && medicine.salt && (
                    <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                      <p className="text-[10px] font-black text-muted-foreground opacity-60 text-left sm:text-right">
                        Blockchain verification
                      </p>
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white font-bold text-xs h-10 transition-all shadow-sm px-4"
                      >
                        <Link href={`/verify?salt=${medicine.salt}`}>
                          View immutable proof
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {isDirty && (
            <div className="flex justify-end animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Button
                onClick={() => handleSave()}
                disabled={
                  isSaving ||
                  formData.reminderTimes.some(
                    (r) => !r.time || !/^\d{2}:\d{2}$/.test(r.time),
                  )
                }
                className="rounded-xl sm:rounded-full w-full sm:w-auto px-8 shadow-lg shadow-primary/20 gap-2 h-14 sm:h-12 font-bold text-base transition-all"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" aria-hidden="true" />
                )}
                {formData.reminderTimes.some(
                  (r) => !r.time || !/^\d{2}:\d{2}$/.test(r.time),
                )
                  ? "Correct time errors"
                  : "Save changes"}
              </Button>
            </div>
          )}

          <DocumentViewerDialog
            open={!!previewDoc}
            onOpenChange={(open) => !open && setPreviewDoc(null)}
            document={previewDoc}
          />
        </div>
      </div>
      {/* Refill Wizard Dialog */}
      <ResponsiveDialog
        open={isRefillDialogOpen}
        onOpenChange={setIsRefillDialogOpen}
      >
        <ResponsiveDialogContent className="sm:max-w-md rounded-3xl">
          <ResponsiveDialogHeader className="px-6 pt-8">
            <ResponsiveDialogTitle className="text-2xl font-black flex items-center gap-3">
              <Zap className="h-6 w-6 text-primary" />
              Inventory Refill
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="p-4 space-y-4">
            <div className="flex flex-col items-center justify-center p-4 sm:p-5 bg-primary/5 rounded-3xl border border-primary/10 space-y-3 sm:space-y-4">
              {/* Calculation Context - Ultra Compact */}
              <div className="flex items-center gap-6 text-muted-foreground/30">
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-tighter opacity-60">
                    Current
                  </p>
                  <p className="text-lg font-black text-foreground/80">
                    {medicine?.currentQuantity || 0}
                  </p>
                </div>
                <Plus className="h-3 w-3 opacity-30 shrink-0" />
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-tighter opacity-60">
                    Pack Size
                  </p>
                  <p className="text-lg font-black text-foreground/80">
                    {medicine?.totalQuantity || 0}
                  </p>
                </div>
              </div>

              {/* Centered Result Stepper - Compacted */}
              <div className="w-full max-w-[240px] space-y-2">
                <div className="flex flex-col items-center">
                  <Label className="text-[9px] font-black text-primary/60 uppercase text-center tracking-[0.2em] mb-1">
                    Target Stock
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    className="h-10 w-10 rounded-xl border-primary/10 bg-muted/20 hover:bg-primary/10 text-primary transition-all active:scale-90"
                    onClick={() => setRefillValue((v) => Math.max(0, v - 1))}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>

                  <div className="flex-1 relative">
                    <Input
                      id="refill-input"
                      type="number"
                      min={0}
                      value={refillValue}
                      onChange={(e) =>
                        setRefillValue(Math.max(0, Number(e.target.value)))
                      }
                      className="h-12 rounded-xl border-primary/20 bg-background font-black text-2xl text-center focus-visible:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    className="h-10 w-10 rounded-xl border-primary/10 bg-muted/20 hover:bg-primary/10 text-primary transition-all active:scale-90"
                    onClick={() => setRefillValue((v) => v + 1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[9px] font-bold text-muted-foreground/30 text-center italic">
                  Calculated automatically
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/10 rounded-2xl">
              <div className="flex-1">
                <p className="text-xs font-black">Change the pack size?</p>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Save as default for future refills
                </p>
              </div>
              <Switch
                id="update-pack-size"
                onCheckedChange={(checked) => {
                  const val = document.getElementById(
                    "update-pack-size-input",
                  ) as HTMLInputElement;
                  if (checked) val?.parentElement?.classList.remove("hidden");
                  else val?.parentElement?.classList.add("hidden");
                }}
              />
            </div>

            <div className="hidden space-y-2 animate-in slide-in-from-top-2 duration-200">
              <Label className="text-xs text-muted-foreground ml-1">
                New Default Pack Size
              </Label>
              <Input
                id="update-pack-size-input"
                type="number"
                defaultValue={medicine?.totalQuantity}
                className="h-12 rounded-2xl border-primary/10 bg-muted/20 font-black"
              />
            </div>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter className="p-6 pt-0">
            <Button
              className="w-full h-14 rounded-full text-lg shadow-xl shadow-primary/20"
              onClick={() => {
                const input = document.querySelector(
                  'input[type="number"]',
                ) as HTMLInputElement;
                const result = refillValue || Number(input.value);
                const packSwitch = document.getElementById(
                  "update-pack-size",
                ) as HTMLInputElement;
                const newPackInput = document.getElementById(
                  "update-pack-size-input",
                ) as HTMLInputElement;

                handleRefill(
                  result,
                  packSwitch?.getAttribute("aria-checked") === "true"
                    ? Number(newPackInput?.value)
                    : undefined,
                );
              }}
            >
              Confirm Refill
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
