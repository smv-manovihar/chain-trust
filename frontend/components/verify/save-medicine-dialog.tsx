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
import { Plus, X, Hash, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const saveMedicineSchema = z.object({
  dosage: z.coerce.number().min(0).optional(),
  frequency: z.string().optional(),
  reminderTimes: z.array(z.object({
    time: z.date(),
    mealContext: z.enum(['before_meal', 'after_meal', 'with_meal', 'no_preference'])
  })).default([]),
  currentQuantity: z.coerce
    .number()
    .min(0, "Quantity cannot be negative")
    .optional(),
  totalQuantity: z.coerce
    .number()
    .min(1, "Pack size must be at least 1")
    .optional(),
  unit: z.string().optional(),
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
      currentQuantity: 30,
      totalQuantity: 30,
      unit: "Pills",
      dosage: 1,
      frequency: "Daily",
      reminderTimes: [],
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
        currentQuantity: data.currentQuantity,
        totalQuantity: data.totalQuantity,
        unit: data.unit,
        dosage: data.dosage,
        frequency: data.frequency,
        doctorName: data.doctorName,
        notes: data.notes,
        prescriptionIds: data.prescriptionIds,
        reminderTimes: data.reminderTimes?.map(r => ({
          ...r,
          time: r.time.toISOString()
        })),
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
              {/* Adherence & Schedule Section - NOW FIRST */}
              <div className="space-y-6">
                <div className={SECTION_LABEL_CLASSES}>
                  <Clock className={SECTION_ICON_CLASSES} />
                  <span>Adherence & Schedule</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dosage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground/60 ml-1">
                          Take amount (e.g. 1)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1"
                            className="h-11 rounded-2xl border-primary/10 bg-muted/20 font-bold"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="reminderTimes"
                    render={({ field }) => (
                      <FormItem className="col-span-full space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-black text-foreground/80">Reminder Times</Label>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="rounded-full border-dashed border-primary/30 h-7 px-3 text-[10px] font-black"
                            onClick={() => {
                              const newTime = new Date();
                              newTime.setHours(8, 0, 0, 0);
                              field.onChange([...field.value, { time: newTime, mealContext: 'no_preference' }]);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {field.value.length === 0 && (
                            <div className="col-span-full py-8 border-2 border-dashed border-primary/5 rounded-[2rem] flex flex-col items-center justify-center text-center bg-muted/5">
                              <p className="text-[10px] font-bold text-muted-foreground/40 italic">Set daily reminders to never miss a dose.</p>
                            </div>
                          )}
                          
                          {field.value.map((reminder, index) => (
                            <div key={index} className="flex gap-2 items-center bg-muted/30 p-2 rounded-2xl border border-primary/5">
                              <Input 
                                type="time" 
                                className="h-8 rounded-xl bg-background border-none font-black text-xs p-1"
                                value={format(reminder.time, "HH:mm")}
                                onChange={(e) => {
                                  const [h, m] = e.target.value.split(':');
                                  const newVal = [...field.value];
                                  const d = new Date(reminder.time);
                                  d.setHours(parseInt(h), parseInt(m));
                                  newVal[index].time = d;
                                  field.onChange(newVal);
                                }}
                              />
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  const newVal = [...field.value];
                                  newVal.splice(index, 1);
                                  field.onChange(newVal);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Inventory Section - NOW SECOND */}
              <div className="space-y-4">
                <div className={SECTION_LABEL_CLASSES}>
                  <Package className={SECTION_ICON_CLASSES} />
                  <span>Physical Inventory</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="currentQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground/60 ml-1">
                          Current Stock
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="h-11 rounded-2xl border-primary/10 bg-muted/20 font-black text-base"
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
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground/60 ml-1">
                          Pack Size
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="h-11 rounded-2xl border-primary/10 bg-muted/20 font-black text-base"
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
                      <FormItem className="col-span-2 sm:col-span-1">
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground/60 ml-1">
                          Unit
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Pills"
                            className="h-11 rounded-2xl border-primary/10 bg-muted/20 font-bold"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Medical Context Section */}
              <div className="space-y-4">
                <div className={SECTION_LABEL_CLASSES}>
                  <Stethoscope className={SECTION_ICON_CLASSES} />
                  <span>Prescription & Notes</span>
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="doctorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground/60 ml-1">
                          Prescribing Doctor
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Dr. Jane Smith"
                            className="h-11 rounded-2xl border-primary/10 bg-muted/20 font-semibold"
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
                      <FormItem>
                        <div className="flex items-center justify-between px-1">
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground/60">
                            Attached Documents
                          </FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsPrescriptionDialogOpen(true)}
                            className="h-6 rounded-full text-[10px] font-bold text-primary"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Browse Pool
                          </Button>
                        </div>

                        <PrescriptionSelector
                          open={isPrescriptionDialogOpen}
                          onOpenChange={setIsPrescriptionDialogOpen}
                          selectedIds={field.value}
                          onChange={(ids) => field.onChange(ids)}
                        />

                        {field.value.length > 0 && (
                          <div className="p-3 rounded-2xl bg-primary/5 flex flex-wrap gap-2">
                            {field.value.map((id: string) => (
                              <Badge key={id} variant="secondary" className="bg-background text-[10px] font-black rounded-lg py-1">
                                DOC: {id.slice(-4).toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground/60 ml-1">
                          Advice / Warnings
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Store in cool place, take after breakfast..."
                            className="min-h-[80px] rounded-2xl border-primary/10 bg-muted/20 font-medium text-sm p-4 resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
