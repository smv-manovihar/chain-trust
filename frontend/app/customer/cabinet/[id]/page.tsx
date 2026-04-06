"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getCabinetItem,
  updateCabinetItem,
  markDoseTaken,
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
  Calendar,
  ShieldCheck,
  Save,
  Trash2,
  Bell,
  CheckCircle2,
  FileText,
  Plus,
  Image as ImageIcon,
  Eye,
  Stethoscope,
  Package,
  Box,
  Power,
  CircleSlash,
  Calendar as CalendarIcon,
  Activity,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadImages } from "@/api/upload.api";
import { PageHeader } from "@/components/ui/page-header";

import Link from "next/link";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { EmptyState } from "@/components/ui/empty-state";
import { resolveMediaUrl } from "@/lib/media-url";

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
    dosage: "",
    frequency: "",
    notes: "",
    doctorName: "",
    currentQuantity: 0,
    totalQuantity: 0,
    unit: "units",
    reminderTimes: [] as { time: string; mealContext: string }[],
    prescriptions: [] as { url: string; label: string; uploadedAt: string }[],
    prescriptionIds: [] as string[],
  });
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

    const safeFormatTime = (time: any) => {
      if (!time) return "08:00";
      const d = new Date(time);
      return isNaN(d.getTime()) ? "08:00" : format(d, "HH:mm");
    };

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
          })),
        ) ||
      JSON.stringify(formData.prescriptionIds) !==
        JSON.stringify(
          medicine.prescriptionIds?.map((p: any) =>
            typeof p === "string" ? p : p._id,
          ) || [],
        )
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

        const safeFormatTime = (time: any) => {
          if (!time) return "08:00";
          const d = new Date(time);
          return isNaN(d.getTime()) ? "08:00" : format(d, "HH:mm");
        };

        setFormData({
          name: item.name || "",
          brand: item.brand || "",
          composition: item.composition || "",
          medicineCode:
            item.medicineCode ||
            (item.isUserAdded ? "N/A" : item.batchNumber || "VERIFIED"),
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          dosage: item.dosage || "",
          frequency: item.frequency || "",
          doctorName: item.doctorName || "",
          notes: item.notes || "",
          currentQuantity: item.currentQuantity || 0,
          totalQuantity: item.totalQuantity || 0,
          unit: item.unit || "units",
          reminderTimes: (item.reminderTimes || []).map((r: any) => ({
            time: safeFormatTime(r.time),
            mealContext: r.mealContext || "no_preference",
          })),
          prescriptions: popPrescriptions,
          prescriptionIds: rawIds,
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

    loadData();
    return () => fetchAbortRef.current?.abort();
  }, [id, router]);

  const handleSave = async (
    updatedData?:
      | Partial<typeof formData & { images: string[] }>
      | React.MouseEvent,
  ) => {
    if (!id) return;
    setIsSaving(true);

    const isDirectCall = updatedData && !(updatedData as any).nativeEvent;
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
      setFormData((prev) => ({
        ...prev,
        currentQuantity: res.currentQuantity,
      }));
      toast.success("Dose recorded", {
        description: `Remaining: ${res.currentQuantity} ${medicine.unit || "units"}`,
      });
    } catch (err) {
      toast.error("Failed to record dose");
    }
  };

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

    await handleSave(updatePayload);
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
      await handleSave({ images: updatedImages });
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
    await handleSave({ images: updated });
  };

  const addReminder = () => {
    setFormData((prev) => ({
      ...prev,
      reminderTimes: [
        ...prev.reminderTimes,
        { time: "08:00", mealContext: "no_preference" },
      ],
    }));
  };

  const updateReminder = (
    index: number,
    updates: Partial<{ time: string; mealContext: string }>,
  ) => {
    const newReminders = [...formData.reminderTimes];
    newReminders[index] = { ...newReminders[index], ...updates };
    setFormData((prev) => ({ ...prev, reminderTimes: newReminders }));
  };

  const removeReminder = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      reminderTimes: prev.reminderTimes.filter((_, i) => i !== index),
    }));
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
                <span className="text-muted-foreground/30 hidden sm:inline">•</span>
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
                <span className="text-muted-foreground/30 hidden sm:inline">•</span>
                <p className="font-medium italic opacity-70 truncate max-w-md">
                  Note: {formData.notes.length > 60 ? formData.notes.substring(0, 60) + "..." : formData.notes}
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
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              onClick={handleTakeDose}
              className="flex-1 sm:flex-none rounded-full px-5 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 gap-2 h-11 sm:h-10 font-bold transition-all text-xs sm:text-sm active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Mark as taken
            </Button>

            <Button
              variant="outline"
              onClick={handleToggleStatus}
              className={cn(
                "rounded-full px-4 h-11 sm:h-10 font-bold text-[10px] sm:text-xs transition-all active:scale-95 gap-2",
                medicine.status === "inactive"
                  ? "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                  : "border-border/50 hover:bg-muted text-muted-foreground",
              )}
            >
              {medicine.status === "inactive" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Activate
                </>
              ) : (
                <>
                  <Power className="h-3.5 w-3.5" aria-hidden="true" />
                  Deactivate
                </>
              )}
            </Button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 overflow-hidden pb-4 sm:pb-0">
        {/* Main Action & Details Column */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar pr-1 pb-16 sm:pb-8">
          <Card className="p-4 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-border/50 bg-card/50 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8 relative z-10">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" aria-hidden="true" />
                Dose management
              </h2>
            </div>

            <Tabs defaultValue="schedule" className="w-full relative z-10">
              <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 bg-muted/50 p-1.5 rounded-full h-[3.5rem] sm:h-[3rem]">
                <TabsTrigger
                  value="schedule"
                  className="rounded-full font-bold text-sm h-full data-[state=active]:shadow-sm data-[state=active]:bg-background"
                >
                  Schedule
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="rounded-full font-bold text-sm h-full data-[state=active]:shadow-sm data-[state=active]:bg-background"
                >
                  Details & Media
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="schedule"
                className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-300"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-muted-foreground">
                        Standard dosage
                      </Label>
                      <div className="relative">
                        <Pill className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <Input
                          placeholder="e.g. 1 Tablet (500mg)"
                          className="pl-10 h-12 sm:h-10 rounded-full border-border bg-muted/30 focus-visible:ring-primary/20 font-medium"
                          value={formData.dosage}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              dosage: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="space-y-1.5 flex-1 w-full sm:w-1/3">
                        <Label className="text-sm font-semibold text-muted-foreground">
                          Current quantity
                        </Label>
                        <Input
                          type="number"
                          placeholder="Remaining"
                          className="h-12 sm:h-10 rounded-full border-border bg-muted/30 focus-visible:ring-primary/20 font-medium"
                          value={formData.currentQuantity}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              currentQuantity: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5 flex-1 w-full sm:w-1/3">
                        <Label className="text-sm font-semibold text-muted-foreground">
                          Total quantity
                        </Label>
                        <Input
                          type="number"
                          placeholder="Capacity"
                          className="h-12 sm:h-10 rounded-full border-border bg-muted/30 focus-visible:ring-primary/20 font-medium"
                          value={formData.totalQuantity}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              totalQuantity: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5 flex-1 w-full sm:w-1/3">
                        <Label className="text-sm font-semibold text-muted-foreground">
                          Unit
                        </Label>
                        <Select
                          value={formData.unit}
                          onValueChange={(val) =>
                            setFormData((prev) => ({ ...prev, unit: val }))
                          }
                        >
                          <SelectTrigger className="h-12 sm:h-10 rounded-full border-border bg-muted/30 focus:ring-primary/20 focus:ring-offset-0 font-medium w-full">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-border/50">
                            <SelectItem
                              value="tablets"
                              className="rounded-full cursor-pointer"
                            >
                              Tablets
                            </SelectItem>
                            <SelectItem
                              value="capsules"
                              className="rounded-lg cursor-pointer"
                            >
                              Capsules
                            </SelectItem>
                            <SelectItem
                              value="pills"
                              className="rounded-lg cursor-pointer"
                            >
                              Pills
                            </SelectItem>
                            <SelectItem
                              value="mg"
                              className="rounded-lg cursor-pointer"
                            >
                              mg
                            </SelectItem>
                            <SelectItem
                              value="ml"
                              className="rounded-lg cursor-pointer"
                            >
                              ml
                            </SelectItem>
                            <SelectItem
                              value="doses"
                              className="rounded-lg cursor-pointer"
                            >
                              Doses
                            </SelectItem>
                            <SelectItem
                              value="units"
                              className="rounded-lg cursor-pointer"
                            >
                              Units
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <Label className="text-sm font-semibold text-muted-foreground">
                        Medication expiry date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-medium h-12 sm:h-10 rounded-full border-border bg-muted/30 focus:ring-primary/20",
                              !formData.expiryDate && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
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

                    <div className="space-y-2 pt-2">
                      <Label className="text-sm font-semibold text-muted-foreground">
                        Notes & observations
                      </Label>
                      <Textarea
                        placeholder="e.g. Occasional drowsiness, take after meal..."
                        className="min-h-[100px] rounded-2xl border-border bg-muted/30 focus-visible:ring-primary/20 font-medium resize-none p-4"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-2 md:pt-0">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-muted-foreground">
                        Smart reminders
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addReminder}
                        className="h-8 text-xs font-bold hover:bg-primary/5 text-primary rounded-full px-3"
                      >
                        <Plus className="h-3 w-3 mr-1" aria-hidden="true" /> Add reminder
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {formData.reminderTimes.map((r, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-2xl bg-muted/20 border border-border/50 group/item transition-all hover:border-primary/20"
                        >
                          <div className="relative flex-1">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                            <Input
                              type="time"
                              value={r.time}
                              onChange={(e) =>
                                updateReminder(idx, { time: e.target.value })
                              }
                              className="pl-9 h-11 rounded-full border-border bg-background font-bold text-sm"
                            />
                          </div>

                          <Select
                            value={r.mealContext}
                            onValueChange={(val) =>
                              updateReminder(idx, { mealContext: val })
                            }
                          >
                            <SelectTrigger className="h-11 rounded-full border-border bg-background font-medium sm:w-[150px]">
                              <SelectValue placeholder="Meal context" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border/50">
                              <SelectItem value="no_preference">
                                No preference
                              </SelectItem>
                              <SelectItem value="before_meal">
                                Before meal
                              </SelectItem>
                              <SelectItem value="after_meal">
                                After meal
                              </SelectItem>
                              <SelectItem value="with_meal">
                                With meal
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeReminder(idx)}
                            className="h-11 w-11 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                            aria-label="Remove reminder"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {formData.reminderTimes.length === 0 && (
                        <p className="text-xs text-muted-foreground italic p-3 bg-muted/30 rounded-xl border border-dashed border-border text-center">
                          No reminders set for this medicine.
                        </p>
                      )}
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
                      <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
                      <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span>Prescriptions</span>
                    </label>

                    <Button
                      variant="outline"
                      onClick={() => setIsPrescriptionDialogOpen(true)}
                      className="h-10 sm:h-9 rounded-full gap-2 text-sm sm:text-xs border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-colors font-medium px-4"
                    >
                      <Plus className="h-4 w-4 sm:h-3 sm:w-3" aria-hidden="true" />
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
                            <Eye className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePrescription(p.url)}
                            className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg sm:rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Remove prescription"
                          >
                            <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
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
                        <ImageIcon className="h-4 w-4 text-primary" aria-hidden="true" />
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
                            <Eye className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeImage(img)}
                            className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg bg-destructive/20 backdrop-blur-md text-white hover:bg-destructive/80 border border-white/10"
                            aria-label="Remove image"
                          >
                            <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!medicine.images || medicine.images.length === 0) && (
                      <div className="col-span-full py-8 sm:py-12 flex flex-col items-center justify-center text-center bg-muted/30 rounded-2xl border border-dashed border-border">
                        <ImageIcon className="h-8 w-8 mb-2 text-muted-foreground/50" aria-hidden="true" />
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
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-xl sm:rounded-full w-full sm:w-auto px-8 shadow-lg shadow-primary/20 gap-2 h-14 sm:h-12 font-bold text-base transition-all"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" aria-hidden="true" />
                )}
                Save changes
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
    </div>
  );
}
