"use client";

import React, { useState } from "react";
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
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Fingerprint
} from "lucide-react";
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

export function AddManualMedicineDialog({ onSuccess }: AddManualMedicineDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<File[]>([]);

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
      setSelectedImages(Array.from(e.target.files));
    }
  };

  const handlePrescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedPrescriptions(Array.from(e.target.files));
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removePrescription = (index: number) => {
    setSelectedPrescriptions(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ManualMedicineValues) => {
    setIsLoading(true);
    try {
      // 1. Upload images and prescriptions if any
      let uploadedImageUrls: string[] = [];
      let uploadedPrescriptionUrls: string[] = [];

      if (selectedImages.length > 0) {
        uploadedImageUrls = await uploadImages(selectedImages);
      }

      if (selectedPrescriptions.length > 0) {
        uploadedPrescriptionUrls = await uploadImages(selectedPrescriptions);
      }

      // 2. Format prescriptions for the backend
      const prescriptions = uploadedPrescriptionUrls.map((url, index) => ({
        url,
        label: selectedPrescriptions[index].name,
        uploadedAt: new Date().toISOString(),
      }));

      // 3. Save to cabinet
      await addToCabinet({
        ...data,
        productId: `manual-${Date.now()}`, 
        isUserAdded: true,
        medicineCode: data.medicineCode || "N/A",
        composition: data.composition,
        expiryDate: data.expiryDate ? data.expiryDate.toISOString() : undefined as any,
        images: uploadedImageUrls,
        prescriptions,
      });

      toast.success("Added to My Medicines", {
        description: "Your manual entry has been saved with attachments."
      });
      setIsOpen(false);
      form.reset();
      setSelectedImages([]);
      setSelectedPrescriptions([]);
      onSuccess();
    } catch (error: any) {
      toast.error("Failed to add", {
        description: error.message || "Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full gap-2 border-primary/20 hover:bg-primary/5">
          <Plus className="h-4 w-4" />
          <span>Add Manual Entry</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-background/80 backdrop-blur-xl border-zinc-800">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Pill className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">Manual Medicine Entry</DialogTitle>
          <DialogDescription className="text-center">
            Add a medicine manually if it's not from our verified list.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medicine Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Pill className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="e.g. Paracetamol" className="pl-10" {...field} />
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
                  <FormLabel>Brand / Manufacturer</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Package className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="e.g. GSK, Pfizer" className="pl-10" {...field} />
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
                  <FormLabel>Composition / Molecules</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <FlaskConical className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="e.g. Paracetamol 500mg, Caffeine 30mg" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="medicineCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medicine Code (Identity)</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Fingerprint className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Code on pack" className="pl-10" {...field} />
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
                    <FormLabel className="mb-2">Expiry Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal h-10 rounded-xl bg-muted/20 border-primary/5",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
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

            {/* Packaging Image Upload */}
            <div className="space-y-2">
              <FormLabel>Packaging Images</FormLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                 {selectedImages.map((file, i) => (
                    <div key={i} className="relative group grayscale hover:grayscale-0 transition-all border border-primary/20 rounded-lg p-1">
                        <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-[10px] overflow-hidden truncate">
                           {file.name}
                        </div>
                        <button type="button" onClick={() => removeImage(i)} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                 ))}
              </div>
              <FormControl>
                <div className="relative overflow-hidden group">
                  <Input type="file" multiple accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <Button variant="outline" className="w-full border-dashed rounded-xl gap-2 font-medium bg-muted/20 hover:bg-muted/40">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <span>Upload Photos</span>
                  </Button>
                </div>
              </FormControl>
            </div>

            {/* Prescription Upload */}
            <div className="space-y-2">
              <FormLabel>Prescription Documents</FormLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                 {selectedPrescriptions.map((file, i) => (
                    <div key={i} className="relative group border border-blue-500/20 rounded-lg p-2 bg-blue-500/5 transition-all w-full flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                           <FileText className="h-3 w-3 text-blue-500 shrink-0" />
                           <span className="text-[10px] truncate">{file.name}</span>
                        </div>
                        <button type="button" onClick={() => removePrescription(i)} className="text-muted-foreground hover:text-destructive">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                 ))}
              </div>
              <FormControl>
                <div className="relative overflow-hidden group">
                  <Input type="file" multiple accept=".pdf,image/*" onChange={handlePrescriptionChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <Button variant="outline" className="w-full border-dashed rounded-xl gap-2 font-medium bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>Attach Prescription</span>
                  </Button>
                </div>
              </FormControl>
            </div>

            <DialogFooter className="pt-4 mt-2">
              <Button type="submit" className="w-full h-12 rounded-xl" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Artifacts...
                  </>
                ) : "Save Manual Item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
