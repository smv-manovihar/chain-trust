"use client";

import React, { useState } from "react";
import { 
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Loader2, 
  Upload, 
  CheckCircle2, 
  X,
  Stethoscope,
  Calendar as CalendarIcon,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { uploadImages } from "@/api/upload.api";
import { uploadPrescription } from "@/api/customer.api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PrescriptionUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (prescription: any) => void;
}

export function PrescriptionUploadDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: PrescriptionUploadDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [issuedDate, setIssuedDate] = useState<Date | undefined>(new Date());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto-set label if empty
      if (!label) {
        setLabel(file.name.split('.')[0]);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !label) {
      toast.error("Label and file are required");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Upload file and get URL
      const urls = await uploadImages([selectedFile]);
      const url = urls[0];

      // 2. Register in the pool
      const prescription = await uploadPrescription({
        url,
        label,
        doctorName,
        issuedDate: issuedDate?.toISOString() || new Date().toISOString(),
      });

      toast.success("Prescription uploaded", {
        description: `"${label}" has been added to your pool.`
      });

      onSuccess(prescription);
      handleReset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Upload failed", {
        description: error.message || "Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setLabel("");
    setDoctorName("");
    setIssuedDate(new Date());
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="w-full sm:max-w-md h-auto sm:h-auto bg-background/95 backdrop-blur-md border-zinc-800 sm:rounded-[2rem] p-0 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 w-full">
          <div className="px-6 py-8 space-y-6 overflow-x-hidden w-full">
            <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-2">
              <FileText className="h-6 w-6 text-blue-500" />
            </div>
            <ResponsiveDialogHeader className="p-0">
              <div className="flex items-center justify-center gap-2">
                <ResponsiveDialogTitle className="text-center text-xl font-bold tracking-tight">New prescription</ResponsiveDialogTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary transition-all">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] p-3 rounded-2xl bg-popover/90 backdrop-blur-md border-primary/10 shadow-xl">
                      <p className="text-xs leading-relaxed font-medium">
                        Upload your prescription document (PDF or image) for quick selection later. This allows you to link it to your medications for automated dose tracking.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </ResponsiveDialogHeader>

            <div className="space-y-5 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground ml-1">Prescription label</label>
                <Input 
                   placeholder="e.g. For paracetamol" 
                   value={label} 
                   onChange={(e) => setLabel(e.target.value)} 
                   className="bg-muted/20 border-primary/10 h-11 rounded-xl font-semibold w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground ml-1">Doctor's name (optional)</label>
                <div className="relative w-full">
                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input 
                       placeholder="e.g. Dr. Smith" 
                       value={doctorName} 
                       onChange={(e) => setDoctorName(e.target.value)} 
                       className="pl-10 bg-muted/20 border-primary/10 h-11 rounded-xl font-semibold w-full"
                    />
                </div>
              </div>

              <div className="space-y-2 flex flex-col w-full">
                <label className="text-xs font-semibold text-muted-foreground ml-1">Issued date (optional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-semibold h-11 rounded-xl bg-muted/20 border-primary/10",
                        !issuedDate && "text-muted-foreground"
                      )}
                    >
                      {issuedDate ? format(issuedDate, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={issuedDate}
                      onSelect={setIssuedDate}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 w-full">
                <label className="text-xs font-semibold text-muted-foreground ml-1">Document file</label>
                {!selectedFile ? (
                   <div className="relative overflow-hidden group w-full">
                      <Input type="file" accept=".pdf,image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div className="w-full h-32 border-2 border-dashed border-primary/10 rounded-xl flex flex-col items-center justify-center gap-2 group-hover:bg-primary/5 transition-colors">
                         <Upload className="h-8 w-8 text-muted-foreground" />
                         <p className="text-[10px] text-muted-foreground">PDF, JPG, or PNG (Max 5MB)</p>
                      </div>
                   </div>
                ) : (
                   <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl w-full">
                      <div className="flex items-center gap-3 overflow-hidden">
                         <FileText className="h-5 w-5 text-primary shrink-0" />
                         <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                            <p className="text-[10px] text-muted-foreground">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                         </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} className="h-8 w-8 rounded-full">
                         <X className="h-4 w-4" />
                      </Button>
                   </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <ResponsiveDialogFooter className="p-6 border-t border-white/5 bg-muted/5 shrink-0">
          <Button 
            className="w-full h-12 rounded-xl gap-2 font-bold text-base" 
            onClick={handleUpload} 
            disabled={isLoading || !selectedFile || !label}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Upload & save</span>
              </>
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
