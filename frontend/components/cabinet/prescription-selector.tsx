"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  ResponsiveDialogBody,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Plus,
  Check,
  Eye,
  Trash2,
  Loader2,
  X,
  Stethoscope,
  Calendar,
  Layers,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPrescriptions, deletePrescription } from "@/api/customer.api";
import { PrescriptionUploadDialog } from "./prescription-upload-dialog";
import { DocumentViewerDialog } from "@/components/common/document-viewer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface PrescriptionSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[], objects: any[]) => void;
  onConfirm?: (ids: string[], objects: any[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export function PrescriptionSelector({
  selectedIds,
  onChange,
  onConfirm,
  open,
  onOpenChange,
  className,
}: PrescriptionSelectorProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    label: string;
  } | null>(null);

  const fetchPrescriptions = async () => {
    setIsLoading(true);
    try {
      const data = await getPrescriptions();
      const list = data.prescriptions || [];
      setPrescriptions(list);
    } catch (error) {
      toast.error("Failed to load prescriptions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPrescriptions();
    }
  }, [open]);

  const filteredPrescriptions = useMemo(() => {
    if (!Array.isArray(prescriptions)) return [];
    return prescriptions.filter(
      (p) =>
        p.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [prescriptions, searchQuery]);

  const toggleSelection = (id: string) => {
    let nextIds: string[];
    if (selectedIds.includes(id)) {
      nextIds = selectedIds.filter((i) => i !== id);
    } else {
      nextIds = [...selectedIds, id];
    }

    const nextObjects = prescriptions.filter((p) => nextIds.includes(p._id));
    onChange(nextIds, nextObjects);
  };

  const handleUploadSuccess = (newPrescription: any) => {
    setPrescriptions((prev) => [newPrescription, ...prev]);
    const nextIds = [...selectedIds, newPrescription._id];

    const currentObjects = prescriptions.filter((p) =>
      selectedIds.includes(p._id),
    );
    onChange(nextIds, [newPrescription, ...currentObjects]);
    setIsUploadOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deletePrescription(id);
      const updatedPrescriptions = prescriptions.filter((p) => p._id !== id);
      setPrescriptions(updatedPrescriptions);

      const nextIds = selectedIds.filter((i) => i !== id);
      const nextObjects = updatedPrescriptions.filter((p) =>
        nextIds.includes(p._id),
      );
      onChange(nextIds, nextObjects);
      toast.success("Prescription deleted.");
    } catch (error) {
      toast.error("Failed to delete prescription.");
    }
  };

  const handleConfirm = () => {
    const selectedObjects = prescriptions.filter((p) =>
      selectedIds.includes(p._id),
    );
    if (onConfirm) {
      onConfirm(selectedIds, selectedObjects);
    }
    onOpenChange(false);
  };

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="w-full sm:max-w-3xl bg-background sm:rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <ResponsiveDialogHeader className="p-4 sm:p-6 pb-4 border-b border-border/50 space-y-4">
            <div className="flex items-center gap-2 min-w-0 pr-8">
              <ResponsiveDialogTitle className="text-xl sm:text-2xl font-bold truncate">
                Select prescriptions
              </ResponsiveDialogTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="max-w-[250px] p-3 rounded-[1.25rem] bg-popover/95 backdrop-blur-md shadow-xl"
                  >
                    <p className="text-xs leading-relaxed font-bold">
                      Attach digital prescriptions to your medicine profile to
                      maintain history and share data with healthcare
                      providers.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="relative">
              <Input
                placeholder="Search by label or doctor name..."
                className="pl-10 bg-muted/30 border-border/50 rounded-full h-12 sm:h-10 text-base sm:text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </ResponsiveDialogHeader>

          <ResponsiveDialogBody className="bg-muted/10">
            <div className="p-4 sm:p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Loading your prescriptions...
                  </p>
                </div>
              ) : prescriptions.length === 0 ? (
                <EmptyState
                  compact
                  icon={Layers}
                  title="No prescriptions found"
                  description="Upload your first prescription to link it to your medical history."
                  action={{
                    label: "Upload new",
                    onClick: () => setIsUploadOpen(true),
                  }}
                  className="bg-background border-dashed border-border/50 rounded-[2rem] py-12"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pb-4">
                  {/* Action Card: Upload New */}
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="group flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-colors min-h-[160px] w-full"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-bold text-primary text-sm">
                      Upload new
                    </span>
                  </button>

                  {/* Prescription Cards */}
                  {filteredPrescriptions.map((p) => {
                    const isSelected = selectedIds.includes(p._id);
                    return (
                      <div
                        key={p._id}
                        onClick={() => toggleSelection(p._id)}
                        className={cn(
                          "group relative rounded-[2rem] border transition-all cursor-pointer flex flex-col overflow-hidden min-h-[160px]",
                          isSelected
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "bg-background border-border hover:border-primary/40 hover:shadow-sm",
                        )}
                      >
                        <div className="p-5 flex items-start gap-3 flex-1">
                          <div
                            className={cn(
                              "mt-0.5 flex items-center justify-center shrink-0 h-5 w-5 rounded-full border transition-colors",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-input bg-background group-hover:border-primary/50",
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>

                          <div className="flex flex-col min-w-0 flex-1 space-y-1">
                            <span
                              className={cn(
                                "text-sm font-semibold truncate",
                                isSelected ? "text-primary" : "text-foreground",
                              )}
                            >
                              {p.label}
                            </span>

                            {(p.doctorName || p.issuedDate) && (
                              <div className="flex flex-col gap-1.5 mt-2">
                                {p.doctorName && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">
                                      {p.doctorName}
                                    </span>
                                  </div>
                                )}
                                {p.issuedDate && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                                    <span>
                                      {format(
                                        new Date(p.issuedDate),
                                        "MMM dd, yyyy",
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Row */}
                        <div
                          className="flex items-center justify-end gap-2 px-3 py-2.5 border-t border-border/40 bg-muted/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-9 sm:h-8 px-4 text-sm sm:text-xs font-bold rounded-full"
                            onClick={() =>
                              setPreviewDoc({ url: p.url, label: p.label })
                            }
                          >
                            <Eye className="h-4 w-4 sm:h-3.5 sm:w-3.5 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 sm:h-8 px-4 text-sm sm:text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full"
                            onClick={(e) => handleDelete(e, p._id)}
                          >
                            <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty Search Results */}
                  {prescriptions.length > 0 &&
                    filteredPrescriptions.length === 0 && (
                      <div className="col-span-full py-8 text-center text-muted-foreground font-medium text-sm">
                        No prescriptions match your search.
                      </div>
                    )}
                </div>
              )}
            </div>
          </ResponsiveDialogBody>

          <ResponsiveDialogFooter className="p-4 sm:p-6 border-t border-border/50 bg-background shrink-0 mt-auto">
            <Button
              className="w-full h-12 rounded-full font-bold text-base"
              onClick={handleConfirm}
            >
              Confirm selection ({selectedIds?.length ?? 0})
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <PrescriptionUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={handleUploadSuccess}
      />

      <DocumentViewerDialog
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        document={previewDoc}
      />
    </>
  );
}
