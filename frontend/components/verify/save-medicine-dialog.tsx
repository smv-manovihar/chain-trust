"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
  ResponsiveDialogBody,
} from "@/components/ui/responsive-dialog";
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
  BookmarkPlus,
  Loader2,
  Package,
  Clock,
  Pill,
  Scale,
  CalendarDays,
  ListTodo,
  Stethoscope,
} from "lucide-react";
import { addToCabinet } from "@/api/customer.api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { PrescriptionSelector } from "@/components/prescriptions/prescription-selector";

const saveMedicineSchema = z.object({
  currentQuantity: z.coerce
    .number()
    .min(0, "Quantity cannot be negative")
    .optional(),
  totalQuantity: z.coerce
    .number()
    .min(1, "Total must be at least 1")
    .optional(),
  unit: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  doctorName: z.string().optional(),
  notes: z.string().max(300, "Notes too long").optional(),
  prescriptionIds: z.array(z.string()).default([]),
});

type SaveMedicineValues = z.infer<typeof saveMedicineSchema>;

interface SaveMedicineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  qrInput: string;
}

const SECTION_ICON_CLASSES = "h-4 w-4 text-primary shrink-0";
const SECTION_LABEL_CLASSES =
  "text-xs font-bold text-muted-foreground/80 flex items-center gap-2 mb-3 px-1";

export function SaveMedicineDialog({
  open,
  onOpenChange,
  product,
  qrInput,
}: SaveMedicineDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPrescriptionDialogOpen, setIsPrescriptionDialogOpen] =
    useState(false);

  const form = useForm<SaveMedicineValues>({
    resolver: zodResolver(saveMedicineSchema),
    defaultValues: {
      currentQuantity: undefined,
      totalQuantity: undefined,
      unit: "Pills",
      dosage: "",
      frequency: "",
      doctorName: "",
      notes: "",
      prescriptionIds: [],
    },
  });

  const onSubmit = async (data: SaveMedicineValues) => {
    setIsLoading(true);
    try {
      await addToCabinet({
        name: product?.productName,
        brand: product?.brand,
        productId: product?.productId,
        batchNumber: product?.batchNumber,
        expiryDate: product?.expiryDate,
        images: product?.images,
        salt: qrInput,
        isUserAdded: false,
        currentQuantity: data.currentQuantity || 0,
        totalQuantity: data.totalQuantity || 0,
        unit: data.unit || "Pills",
        dosage: data.dosage,
        frequency: data.frequency,
        doctorName: data.doctorName,
        notes: data.notes,
        prescriptionIds: data.prescriptionIds,
      });

      toast.success("Saved to My Medicines!");
      onOpenChange(false);
      router.push("/customer/cabinet");
    } catch (error: any) {
      toast.error("Failed to save. Try again.", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="w-full max-w-none sm:max-w-xl bg-background/95 sm:bg-background/80 backdrop-blur-3xl border-0 sm:border border-zinc-800 p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

        <ResponsiveDialogHeader className="p-5 sm:p-8 pb-3 relative z-auto shrink-0 border-b border-primary/5 sm:border-none mt-2 sm:mt-0">
          <div className="flex flex-col gap-1">
            <ResponsiveDialogTitle className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookmarkPlus className="h-6 w-6 text-primary" />
              Save to My Medicines
            </ResponsiveDialogTitle>
            <p className="text-sm text-muted-foreground font-medium">
              Configure inventory and schedule for {product?.productName}
            </p>
          </div>
        </ResponsiveDialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 flex flex-col min-h-0 relative z-10 w-full overflow-hidden"
          >
            <ResponsiveDialogBody className="px-4 sm:px-10 py-5 sm:py-6 space-y-8 pb-10 overflow-x-hidden w-full">
              {/* Inventory Section */}
              <div className="space-y-4">
                <div className={SECTION_LABEL_CLASSES}>
                  <Package className={SECTION_ICON_CLASSES} />
                  <span>Inventory tracking</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                  <FormField
                    control={form.control}
                    name="currentQuantity"
                    render={({ field }) => (
                      <FormItem className="w-full max-w-full overflow-hidden">
                        <FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1">
                          Current Amount
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 50"
                            className="h-12 w-full rounded-full border-primary/10 bg-muted/30 focus-visible:ring-primary/20 font-bold text-base"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalQuantity"
                    render={({ field }) => (
                      <FormItem className="w-full max-w-full overflow-hidden">
                        <FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1">
                          Total Pack Size
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 100"
                            className="h-12 w-full rounded-full border-primary/10 bg-muted/30 focus-visible:ring-primary/20 font-bold text-base"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem className="col-span-2 sm:col-span-1 w-full max-w-full overflow-hidden">
                        <FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1">
                          Unit Type
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Pills, mL"
                            className="h-12 w-full rounded-full border-primary/10 bg-muted/30 focus-visible:ring-primary/20 font-semibold text-base"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Dosage & Schedule Section */}
              <div className="space-y-4">
                <div className={SECTION_LABEL_CLASSES}>
                  <Clock className={SECTION_ICON_CLASSES} />
                  <span>Dosage & Schedule</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <FormField
                    control={form.control}
                    name="dosage"
                    render={({ field }) => (
                      <FormItem className="w-full max-w-full overflow-hidden">
                        <FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1">
                          Dosage Amount
                        </FormLabel>
                        <FormControl>
                          <div className="relative group w-full">
                            <Scale className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
                            <Input
                              placeholder="e.g. 1 Tablet"
                              className="pl-12 h-12 w-full rounded-full border-primary/10 bg-muted/30 focus-visible:ring-primary/20 font-semibold text-base"
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
                    name="frequency"
                    render={({ field }) => (
                      <FormItem className="w-full max-w-full overflow-hidden">
                        <FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1">
                          Frequency
                        </FormLabel>
                        <FormControl>
                          <div className="relative group w-full">
                            <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
                            <Input
                              placeholder="e.g. Twice daily after meals"
                              className="pl-12 h-12 w-full rounded-full border-primary/10 bg-muted/30 focus-visible:ring-primary/20 font-semibold text-base"
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

              {/* Prescription Context Section */}
              <div className="space-y-4">
                <div className={SECTION_LABEL_CLASSES}>
                  <Stethoscope className={SECTION_ICON_CLASSES} />
                  <span>Prescription details</span>
                </div>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="doctorName"
                    render={({ field }) => (
                      <FormItem className="w-full max-w-full overflow-hidden">
                        <FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1">
                          Prescribing Doctor
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Dr. Jane Doe"
                            className="h-12 w-full rounded-full border-primary/10 bg-muted/30 focus-visible:ring-primary/20 font-medium text-base"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prescriptionIds"
                    render={({ field }) => (
                      <FormItem className="w-full max-w-full overflow-hidden">
                        <FormControl>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-xs font-semibold text-muted-foreground/70 ml-1">
                                Linked Prescriptions
                              </FormLabel>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setIsPrescriptionDialogOpen(true)
                                }
                                className="h-8 rounded-full border-dashed border-primary/30 hover:border-primary/50 text-[10px] font-bold"
                              >
                                Attach / Manage
                              </Button>
                            </div>

                            <PrescriptionSelector
                              open={isPrescriptionDialogOpen}
                              onOpenChange={setIsPrescriptionDialogOpen}
                              selectedIds={field.value}
                              onChange={(ids) => field.onChange(ids)}
                              className="w-full"
                            />

                            {field.value.length > 0 && (
                              <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10">
                                <p className="text-[10px] font-bold text-primary mb-2 px-1">
                                  Selected attachments
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {field.value.map((id: string) => (
                                    <div
                                      key={id}
                                      className="px-3 py-1 bg-background border border-primary/20 rounded-full text-[10px] font-bold text-primary flex items-center gap-1.5"
                                    >
                                      <ListTodo className="h-3 w-3" />
                                      <span>
                                        ID: {id.slice(-6).toUpperCase()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-4">
                <div className={SECTION_LABEL_CLASSES}>
                  <ListTodo className={SECTION_ICON_CLASSES} />
                  <span>Additional notes</span>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="w-full max-w-full overflow-hidden">
                      <FormControl>
                        <Textarea
                          placeholder="Add any specific instructions, doctor's advice, or side-effect warnings..."
                          className="min-h-[100px] rounded-[1.5rem] border-primary/10 bg-muted/30 focus-visible:ring-primary/20 font-medium text-sm p-4 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ResponsiveDialogBody>

            <ResponsiveDialogFooter className="p-4 pb-8 sm:p-6 sm:pt-4 shrink-0 border-t border-primary/5 bg-background/80 backdrop-blur-md">
              <Button
                type="submit"
                className="w-full h-14 rounded-full shadow-xl shadow-primary/20 font-bold text-base sm:text-lg gap-3 transition-transform hover:scale-[1.02] active:scale-95"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-5 w-5" />
                    <span>Save to My Medicines</span>
                  </>
                )}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
