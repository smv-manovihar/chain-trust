"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Loader2,
  X,
  Plus,
  ArrowLeft,
  ArrowRight,
  Save,
  Pill,
  Package,
  FlaskConical,
  Fingerprint,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  Check,
  Hash,
  Activity,
  Layers,
  Stethoscope,
  AlignLeft,
} from "lucide-react";
import { addToCabinet } from "@/api/customer.api";
import { uploadImages } from "@/api/upload.api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PrescriptionSelector } from "@/components/prescriptions/prescription-selector";
import Link from "next/link";

const medicineSchema = z.object({
  name: z.string().min(2, "Medicine name is required"),
  brand: z.string().min(2, "Brand name is required"),
  composition: z.string().min(2, "Composition / molecules are required"),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").optional(),
  unit: z.string().optional(),
  doctorName: z.string().optional(),
  notes: z.string().optional(),
  medicineCode: z.string().optional(),
  expiryDate: z.date().optional(),
});

type MedicineValues = z.infer<typeof medicineSchema>;

export default function AddMedicinePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState<
    string[]
  >([]);
  const [isPrescriptionDialogOpen, setIsPrescriptionDialogOpen] =
    useState(false);

  const form = useForm<MedicineValues>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      name: "",
      brand: "",
      composition: "",
      dosage: "",
      frequency: "",
      quantity: 30,
      unit: "pills",
      doctorName: "",
      notes: "",
      medicineCode: "",
      expiryDate: undefined,
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedImages((prev) => [...prev, ...newFiles]);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const nextStep = async () => {
    let fields: string[] = [];
    if (step === 1) fields = ["name", "brand", "composition"];
    else if (step === 2) fields = ["dosage", "frequency", "quantity", "unit"];
    else if (step === 3) fields = ["medicineCode", "expiryDate", "doctorName", "notes"];

    const isValid = await form.trigger(fields as any);
    if (isValid) setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const onSubmit = async (data: MedicineValues) => {
    setIsLoading(true);
    try {
      let uploadedImageUrls: string[] = [];
      if (selectedImages.length > 0) {
        uploadedImageUrls = await uploadImages(selectedImages);
      }

      await addToCabinet({
        ...data,
        productId: `manual-${Date.now()}`,
        isUserAdded: true,
        medicineCode: data.medicineCode || "N/A",
        composition: data.composition,
        expiryDate: data.expiryDate
          ? data.expiryDate.toISOString()
          : (undefined as any),
        images: uploadedImageUrls,
        prescriptionIds: selectedPrescriptionIds,
        dosage: data.dosage,
        frequency: data.frequency,
        currentQuantity: data.quantity || 30,
        totalQuantity: data.quantity || 30,
        unit: data.unit,
        doctorName: data.doctorName,
        notes: data.notes,
      });

      toast.success("Medicine Added", {
        description: `${data.name} has been added to your cabinet.`,
      });
      router.push("/customer/cabinet");
    } catch (error: any) {
      toast.error("Failed to add medicine", {
        description: error.message || "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-4 pb-20 flex-1 min-h-0">
      {/* Header & Progress */}
      <div className="flex items-center gap-4 px-1">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="rounded-full flex-shrink-0"
        >
          <Link href="/customer/cabinet">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-3xl font-black tracking-tight truncate">
            Add Medicine
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
            Update your medicine profile in {step}/4 steps
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-muted-foreground opacity-60">
            Phase
          </p>
          <p className="text-xl font-black text-primary">
            0{step}{" "}
            <span className="text-muted-foreground opacity-30">/ 04</span>
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 px-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-500",
              i <= step ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      <Card className="overflow-hidden border-primary/5 bg-card/60 backdrop-blur-md shadow-xl rounded-[2.5rem]">
        <div className="p-6 sm:p-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {step === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <Pill className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black">Identity</h2>
                      <p className="text-xs text-muted-foreground font-medium">
                        Basic medicine identification
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className="text-xs font-black text-muted-foreground/80 ml-1">
                            Medicine name
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Pill className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" aria-hidden="true" />
                              <Input
                                placeholder="e.g. Paracetamol"
                                className="pl-11 h-12 rounded-full border-primary/10 bg-muted/20 focus-visible:ring-primary/20 font-semibold"
                                {...field}
                                autoFocus
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black text-muted-foreground/80 ml-1">
                            Brand / Company
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" aria-hidden="true" />
                              <Input
                                placeholder="e.g. GSK"
                                className="pl-11 h-12 rounded-full border-primary/10 bg-muted/20 focus-visible:ring-primary/20 font-semibold"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="composition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black text-muted-foreground/80 ml-1">
                            Composition
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <FlaskConical className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
                              <Input
                                placeholder="e.g. Paracetamol 500mg"
                                className="pl-11 h-12 rounded-full border-primary/10 bg-muted/20 focus-visible:ring-primary/20 font-semibold"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black">Dosage & Usage</h2>
                      <p className="text-xs text-muted-foreground font-medium">
                        How and when you take this
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="dosage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black text-muted-foreground/80 ml-1">
                            Dosage (e.g. 500mg)
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <FlaskConical className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
                              <Input
                                placeholder="500mg"
                                className="pl-11 h-12 rounded-full border-primary/10 bg-muted/20 focus-visible:ring-primary/20 font-semibold"
                                {...field}
                                autoFocus
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black text-muted-foreground/80 ml-1">
                            Frequency
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" aria-hidden="true" />
                              <Input
                                placeholder="e.g. Twice daily"
                                className="pl-11 h-12 rounded-full border-primary/10 bg-muted/20 focus-visible:ring-primary/20 font-semibold"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black text-muted-foreground/80 ml-1">
                            Quantity
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Layers className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" aria-hidden="true" />
                              <Input
                                type="number"
                                placeholder="30"
                                className="pl-11 h-12 rounded-full border-primary/10 bg-muted/20 focus-visible:ring-primary/20 font-semibold"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black text-muted-foreground/80 ml-1">
                            Unit
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Activity className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" aria-hidden="true" />
                              <Input
                                placeholder="e.g. pills, ml, drops"
                                className="pl-11 h-12 rounded-full border-primary/10 bg-muted/20 focus-visible:ring-primary/20 font-semibold"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <Hash className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black">Tracking & Details</h2>
                      <p className="text-xs text-muted-foreground font-medium">
                        Expiry, medical info, and codes
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="medicineCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black text-muted-foreground/80 ml-1">
                            Medicine code
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" aria-hidden="true" />
                              <Input
                                placeholder="Code on pack"
                                className="pl-11 h-12 rounded-full border-primary/10 bg-muted/20 focus-visible:ring-primary/20 font-mono font-bold"
                                {...field}
                                autoFocus
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs font-black text-muted-foreground/80 ml-1 mb-[3px]">
                            Expiry date
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-4 text-left font-bold h-12 rounded-full bg-muted/20 border-primary/10 hover:bg-muted/30 transition-all",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "MMMM yyyy")
                                  ) : (
                                    <span className="font-medium opacity-50">
                                      Select date
                                    </span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 text-primary opacity-40" aria-hidden="true" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 rounded-[2rem] border-primary/10 overflow-hidden"
                              align="center"
                            >
                              <Calendar
                                mode="single"
                                captionLayout="dropdown"
                                fromYear={new Date().getFullYear()}
                                toYear={new Date().getFullYear() + 15}
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="doctorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black text-muted-foreground/80 ml-1">
                            Doctor name
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" aria-hidden="true" />
                              <Input
                                placeholder="e.g. Dr. Smith"
                                className="pl-11 h-12 rounded-full border-primary/10 bg-muted/20 focus-visible:ring-primary/20 font-semibold"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black text-muted-foreground/80 ml-1">
                            Notes
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <AlignLeft className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" aria-hidden="true" />
                              <Input
                                placeholder="Any additional notes"
                                className="pl-11 h-12 rounded-full border-primary/10 bg-muted/20 focus-visible:ring-primary/20 font-semibold"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <ImageIcon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black">Attachments</h2>
                      <p className="text-xs text-muted-foreground font-medium">
                        Photos and clinical proof
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-xs font-black text-muted-foreground/80 ml-1">
                      Medicine photos
                    </Label>
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3">
                      {imagePreviews.map((url, i) => (
                        <div
                          key={url}
                          className="relative group aspect-square rounded-[2rem] overflow-hidden border border-primary/5 shadow-inner"
                        >
                          <img
                            src={url}
                            alt={`Preview ${i}`}
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove image"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                      <label className="cursor-pointer aspect-square rounded-[2rem] border-2 border-dashed border-primary/10 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary">
                        <Plus className="h-6 w-6" aria-hidden="true" />
                        <span className="text-[10px] font-bold">Add photo</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-primary/5">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-xs font-bold text-muted-foreground/80 ml-1">
                        Clinical proof
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPrescriptionDialogOpen(true)}
                        className="h-8 rounded-full border-dashed border-primary/30 hover:border-primary/50 text-[10px] font-bold px-3"
                      >
                        <Plus className="h-3 w-3 mr-1" aria-hidden="true" /> Attach prescription
                      </Button>
                    </div>

                    <PrescriptionSelector
                      open={isPrescriptionDialogOpen}
                      onOpenChange={setIsPrescriptionDialogOpen}
                      selectedIds={selectedPrescriptionIds}
                      onChange={setSelectedPrescriptionIds}
                    />

                    {selectedPrescriptionIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-4 bg-primary/5 rounded-[1.5rem] border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
                        {selectedPrescriptionIds.map((id) => (
                          <div
                            key={id}
                            className="px-4 py-1.5 bg-background border border-primary/20 rounded-full text-[10px] font-bold text-primary flex items-center gap-2"
                          >
                            <Check className="h-3 w-3" aria-hidden="true" />
                            <span>
                              Prescription ID: {id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Bar */}
              <div className="flex justify-between items-center pt-8 mt-8 border-t border-primary/5">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={prevStep}
                    className="rounded-full font-bold gap-2 px-6"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
                  </Button>
                ) : (
                  <div />
                )}

                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="rounded-full font-bold h-12 px-8 gap-2 shadow-lg shadow-primary/20"
                  >
                    Next <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-full font-bold h-12 px-8 gap-2 shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="h-5 w-5" aria-hidden="true" />
                    )}
                    {isLoading ? "Saving..." : "Complete Profile"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </Card>
    </div>
  );
}
