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
  Stethoscope,
  Plus,
  X,
  FileText,
} from "lucide-react";
import { addToCabinet } from "@/api/customer.api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { PrescriptionSelector } from "@/components/prescriptions/prescription-selector";
import { format } from "date-fns";
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
const SECTION_LABEL_CLASSES = "text-sm font-semibold flex items-center gap-2 mb-4 text-foreground/90";

export function SaveMedicineDialog({
  open,
  onOpenChange,
  product,
  qrInput,
}: SaveMedicineDialogProps) {
  const router = useRouter();
  const [displayProduct, setDisplayProduct] = React.useState(product);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrescriptionDialogOpen, setIsPrescriptionDialogOpen] = useState(false);

  React.useEffect(() => {
    if (open && product) {
      setDisplayProduct(product);
    }
  }, [open, product]);

  const [selectedDocs, setSelectedDocs] = useState<any[]>([]);

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
        name: displayProduct?.productName,
        brand: displayProduct?.brand,
        productId: displayProduct?.productId,
        batchNumber: displayProduct?.batchNumber,
        expiryDate: displayProduct?.expiryDate,
        images: displayProduct?.images,
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
      <ResponsiveDialogContent className="sm:max-w-xl p-0 overflow-hidden bg-background">
        <ResponsiveDialogHeader className="p-4 sm:p-6 pb-4 border-b">
          <div className="flex flex-col gap-1">
            <ResponsiveDialogTitle className="flex items-center gap-2 text-xl">
              <BookmarkPlus className="h-5 w-5 text-primary" />
              Save to My Medicines
            </ResponsiveDialogTitle>
            <p className="text-sm text-muted-foreground">
              Configure medication and schedule for {displayProduct?.productName}
            </p>
          </div>
        </ResponsiveDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <ResponsiveDialogBody className="p-4 sm:p-6 space-y-8">
              
              <div className="space-y-4">
                <div className={SECTION_LABEL_CLASSES}>
                  <Clock className={SECTION_ICON_CLASSES} />
                  <span>Schedule & Adherence</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dosage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dosage Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1"
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
                      <FormItem className="col-span-1 sm:col-span-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Dose Reminders</Label>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-8"
                            onClick={() => {
                              const newTime = new Date();
                              newTime.setHours(8, 0, 0, 0);
                              field.onChange([...field.value, { time: newTime, mealContext: 'no_preference' }]);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add Time
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {field.value.length === 0 && (
                            <div className="col-span-full py-6 border border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                              <p className="text-sm text-muted-foreground">No reminders set.</p>
                            </div>
                          )}
                          
                          {field.value.map((reminder, index) => (
                            <div key={index} className="flex gap-2 items-center bg-muted/50 p-2 rounded-lg border">
                              <Input 
                                type="time" 
                                className="h-8 bg-background border-none shadow-none"
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
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                                onClick={() => {
                                  const newVal = [...field.value];
                                  newVal.splice(index, 1);
                                  field.onChange(newVal);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className={SECTION_LABEL_CLASSES}>
                  <Package className={SECTION_ICON_CLASSES} />
                  <span>Stock Management</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="currentQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remaining Units</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
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
                        <FormLabel>Total Pack Units</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
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
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input placeholder="Pills" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className={SECTION_LABEL_CLASSES}>
                  <Stethoscope className={SECTION_ICON_CLASSES} />
                  <span>Prescriptions & Advice</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="doctorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Healthcare Provider</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Dr. Jane Smith" {...field} />
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
                        <div className="flex items-center justify-between mb-2">
                          <FormLabel className="flex items-center gap-2">
                            Prescriptions & Records
                          </FormLabel>
                          {field.value.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsPrescriptionDialogOpen(true)}
                              className="h-8 text-xs font-bold hover:bg-primary/5 text-primary"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add or Change
                            </Button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {field.value.length === 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full h-20 border-dashed border-2 flex flex-col gap-1 rounded-2xl hover:bg-primary/5 hover:border-primary/40 transition-all"
                              onClick={() => setIsPrescriptionDialogOpen(true)}
                            >
                              <div className="flex items-center gap-2 text-primary">
                                <Plus className="h-4 w-4" />
                                <span className="font-bold">Link Digital Prescription</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-medium">
                                Provides verified context for your AI Health Assistant
                              </p>
                            </Button>
                          ) : (
                            <div className="p-4 rounded-2xl border bg-muted/30 flex flex-wrap gap-2">
                              {selectedDocs.map((p: any) => (
                                <Badge 
                                  key={p._id} 
                                  variant="secondary"
                                  role="button"
                                  onClick={() => {
                                    const nextIds = field.value.filter((i: string) => i !== p._id);
                                    field.onChange(nextIds);
                                    setSelectedDocs(prev => prev.filter(d => d._id !== p._id));
                                  }}
                                  className="bg-background border-primary/20 text-primary px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 transition-all group/badge"
                                >
                                  <FileText className="h-3 w-3 opacity-70" />
                                  <span className="truncate max-w-[120px]">{p.label}</span>
                                  <X className="h-3 w-3 opacity-50 group-hover/badge:opacity-100" />
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <PrescriptionSelector
                          open={isPrescriptionDialogOpen}
                          onOpenChange={setIsPrescriptionDialogOpen}
                          selectedIds={field.value}
                          onChange={(ids, objects) => {
                            field.onChange(ids);
                            setSelectedDocs(objects);
                          }}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Storage & Instructions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Store in cool place, take after breakfast..."
                            className="min-h-[80px] resize-none"
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

            <ResponsiveDialogFooter className="p-4 sm:p-6 border-t bg-muted/20">
              <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-4 w-4" />
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
