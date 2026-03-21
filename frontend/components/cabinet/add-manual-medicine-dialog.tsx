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
import { Plus, Loader2, Pill, FlaskConical, Package } from "lucide-react";
import { addToCabinet } from "@/api";
import { toast } from "sonner";

const manualMedicineSchema = z.object({
  name: z.string().min(2, "Medicine name is required"),
  brand: z.string().min(2, "Brand name is required"),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

type ManualMedicineValues = z.infer<typeof manualMedicineSchema>;

interface AddManualMedicineDialogProps {
  onSuccess: () => void;
}

export function AddManualMedicineDialog({ onSuccess }: AddManualMedicineDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ManualMedicineValues>({
    resolver: zodResolver(manualMedicineSchema),
    defaultValues: {
      name: "",
      brand: "",
      batchNumber: "",
      expiryDate: "",
    },
  });

  const onSubmit = async (data: ManualMedicineValues) => {
    setIsLoading(true);
    try {
      await addToCabinet({
        ...data,
        productId: `manual-${Date.now()}`, // Salt/Hash placeholder for manual entries
        isUserAdded: true,
        batchNumber: data.batchNumber || "N/A",
      });
      toast.success("Added to My Medicines", {
        description: "Your manual entry has been saved."
      });
      setIsOpen(false);
      form.reset();
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
      <DialogContent className="sm:max-w-md bg-background/80 backdrop-blur-xl border-zinc-800">
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
                      <FlaskConical className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="e.g. GSK" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="batchNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch (Optional)</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Package className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Lot #" className="pl-10" {...field} />
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
                  <FormItem>
                    <FormLabel>Expiry (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-12 rounded-xl" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : "Add to My Medicines"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
