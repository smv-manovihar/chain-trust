"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Plus,
  Loader2,
  Pill,
  FlaskConical,
  Package,
  Image as ImageIcon,
  FileText,
  X,
  Calendar as CalendarIcon,
  Fingerprint,
} from "lucide-react";
// Ensure these API paths match your project
import { addToCabinet } from "@/api/customer.api";
import { uploadImages } from "@/api/upload.api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { PrescriptionSelector } from "./prescription-selector";
import { ScrollArea } from "@/components/ui/scroll-area";

const manualMedicineSchema = z.object({
  name: z.string().min(2, "Medicine name is required"),
  brand: z.string().min(2, "Brand name is required"),
  composition: z.string().min(2, "Composition / molecules are required"),
  medicineCode: z.string().optional(),
  expiryDate: z.date().optional(),
});

type ManualMedicineValues = z.infer<typeof manualMedicineSchema>;

interface AddManualMedicineDialogProps {
  onSuccess: () => void;
}

const SECTION_ICON_CLASSES = "h-4 w-4 text-primary shrink-0";
const SECTION_LABEL_CLASSES =
  "text-xs font-bold text-muted-foreground/80 flex items-center gap-2 mb-3 px-1";

export function AddManualMedicineDialog({
  onSuccess,
}: AddManualMedicineDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState<
    string[]
  >([]);

  const form = useForm<ManualMedicineValues>({
    resolver: zodResolver(manualMedicineSchema),
    defaultValues: {
      name: "",
      brand: "",
      composition: "",
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

  const onSubmit = async (data: ManualMedicineValues) => {
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
      });

      toast.success("Added to My Medicines", {
        description: "Your manual entry has been saved with attachments.",
      });
      setIsOpen(false);
      form.reset();
      setSelectedImages([]);
      setSelectedPrescriptionIds([]);
      onSuccess();
    } catch (error: any) {
      toast.error("Failed to add", {
        description: error.message || "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1 sm:flex-none rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold h-12 px-4 sm:px-6 gap-2">
          <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
          <span>Add Medicine</span>
        </Button>
      </DialogTrigger>
      {/* Mobile Optimizations on DialogContent: 
        1. h-[100dvh] instead of h-full prevents iOS Safari bottom bar clipping 
        2. rounded-none on mobile, rounded-[2.5rem] on desktop
        3. max-w-none on mobile for true edge-to-edge
      */}
      <DialogContent className="w-full max-w-none sm:max-w-xl h-[100dvh] sm:h-[85vh] flex flex-col bg-background/95 sm:bg-background/80 backdrop-blur-3xl border-0 sm:border border-zinc-800 rounded-none sm:rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

        <DialogHeader className="p-5 sm:p-8 pb-3 relative z-10 shrink-0 border-b border-primary/5 sm:border-none mt-2 sm:mt-0">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            Add medicine
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 flex flex-col min-h-0 relative z-10 w-full overflow-hidden"
          >
            <ScrollArea className="flex-1 w-full">
              <div className="px-4 sm:px-10 py-5 sm:py-6 space-y-8 pb-10 overflow-x-hidden">
                <div className="space-y-4">
                  <div className={SECTION_LABEL_CLASSES}>
                    <Pill className={SECTION_ICON_CLASSES} />
                    <span>Medicine details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2 w-full max-w-full overflow-hidden">
                          <FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1">
                            Medicine name
                          </FormLabel>
                          <FormControl>
                            <div className="relative group w-full">
                              <Pill className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
                              <Input
                                placeholder="e.g. Paracetamol, Augmentin..."
                                className="pl-11 h-12 w-full rounded-2xl border-primary/10 bg-muted/30 focus-visible:ring-primary/20 font-semibold transition-all text-base"
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
                      name="brand"
                      render={({ field }) => (
                        <FormItem className="w-full max-w-full overflow-hidden">
                          <FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1">
                            Brand or company
                          </FormLabel>
                          <FormControl>
                            <div className="relative group w-full">
                              <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
                              <Input
                                placeholder="e.g. GSK, Pfizer..."
                                className="pl-11 h-12 w-full rounded-2xl border-primary/10 bg-muted/30 focus-visible:ring-primary/20 font-semibold text-base"
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
                        <FormItem className="w-full max-w-full overflow-hidden">
                          <FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1">
                            Ingredients
                          </FormLabel>
                          <FormControl>
                            <div className="relative group w-full">
                              <FlaskConical className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
                              <Input
                                placeholder="e.g. Paracetamol 500mg"
                                className="pl-11 h-12 w-full rounded-2xl border-primary/10 bg-muted/30 focus-visible:ring-primary/20 font-semibold text-base"
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

                {/* Compliance Section */}
                <div className="space-y-4">
                  <div className={SECTION_LABEL_CLASSES}>
                    <Fingerprint className={SECTION_ICON_CLASSES} />
                    <span>Expiry & tracking</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="medicineCode"
                      render={({ field }) => (
                        <FormItem className="w-full max-w-full overflow-hidden">
                          <FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1">
                            Batch or code
                          </FormLabel>
                          <FormControl>
                            <div className="relative group w-full">
                              <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
                              <Input
                                placeholder="Code on pack"
                                className="pl-11 h-12 w-full rounded-2xl border-primary/10 bg-muted/30 focus-visible:ring-primary/20 font-mono text-sm font-bold"
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
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col w-full max-w-full overflow-hidden">
                          <FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1 mb-[2px]">
                            Expiry date
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <div className="w-full max-w-full">
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-4 text-left font-bold h-12 rounded-2xl bg-muted/30 border-primary/10 hover:bg-muted/40 transition-all text-base",
                                      !field.value && "text-muted-foreground",
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "MMM yyyy")
                                    ) : (
                                      <span className="font-medium opacity-50">
                                        Pick a date
                                      </span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 text-primary opacity-40" />
                                  </Button>
                                </div>
                              </FormControl>
                            </PopoverTrigger>
                            {/* Mobile Popover align adjusted to prevent off-screen overflow */}
                            <PopoverContent
                              className="w-auto p-0 rounded-2xl border-primary/10 overflow-hidden mx-4 sm:mx-0"
                              align="center"
                            >
                              <Calendar
                                mode="single"
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
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="space-y-6 pb-4">
                  <div className={SECTION_LABEL_CLASSES}>
                    <ImageIcon className={SECTION_ICON_CLASSES} />
                    <span>Photos & documents</span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <Label className="text-xs font-bold text-muted-foreground/80 leading-none">
                        Medicine photos
                      </Label>
                      <span className="text-[10px] font-bold text-primary/50">
                        {selectedImages.length} images
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                      {imagePreviews.map((url, i) => (
                        <div
                          key={url}
                          className="relative group aspect-square rounded-2xl overflow-hidden border border-primary/10 shadow-sm animate-in zoom-in-50 duration-300"
                        >
                          <img
                            src={url}
                            alt={`Preview ${i}`}
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-red-500/90 backdrop-blur-md text-white rounded-full p-1.5 sm:opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg scale-90 sm:scale-75 group-hover:scale-100"
                          >
                            <X className="h-4 w-4 sm:h-3 sm:w-3" />
                          </button>
                        </div>
                      ))}

                      <label className="cursor-pointer relative overflow-hidden group aspect-square rounded-2xl border-2 border-dashed border-primary/15 flex flex-col items-center justify-center gap-1 hover:bg-primary/5 hover:border-primary/30 transition-all bg-muted/10">
                        <Input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <div className="p-2.5 bg-primary/5 rounded-xl group-hover:bg-primary/10 transition-colors">
                          <Plus className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-[11px] font-bold text-muted-foreground">
                          Add photo
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-muted/20 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-primary/5 shadow-sm space-y-4">
                    <PrescriptionSelector
                      selectedIds={selectedPrescriptionIds}
                      onChange={setSelectedPrescriptionIds}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Added pb-8 on mobile to ensure it sits safely above the iOS home indicator */}
            <DialogFooter className="p-4 pb-8 sm:p-6 sm:pt-4 shrink-0 border-t border-primary/5 bg-background/80 backdrop-blur-md">
              <Button
                type="submit"
                className="w-full h-14 rounded-2xl shadow-xl shadow-primary/20 font-bold text-base sm:text-lg gap-3 transition-transform hover:scale-[1.02] active:scale-95"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    <span>Save to my medicines</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
