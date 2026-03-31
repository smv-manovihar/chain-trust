"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
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
  PlusCircle,
  Stethoscope,
  Calendar,
  Layers
} from "lucide-react";
import { getPrescriptions, deletePrescription } from "@/api/customer.api";
import { PrescriptionUploadDialog } from "./prescription-upload-dialog";
import { DocumentViewerDialog } from "@/components/common/document-viewer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface PrescriptionSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

export function PrescriptionSelector({ 
  selectedIds, 
  onChange, 
  className 
}: PrescriptionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{ url: string; label: string } | null>(null);

  const fetchPrescriptions = async () => {
    setIsLoading(true);
    try {
      const data = await getPrescriptions();
      // API now returns { prescriptions: [], pagination: {} }
      setPrescriptions(data.prescriptions || []);
    } catch (error) {
      toast.error("Failed to load prescriptions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPrescriptions();
    }
  }, [isOpen]);

  const filteredPrescriptions = useMemo(() => {
    if (!Array.isArray(prescriptions)) return [];
    return prescriptions.filter(p => 
      p.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.doctorName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [prescriptions, searchQuery]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleUploadSuccess = (newPrescription: any) => {
    setPrescriptions(prev => [newPrescription, ...prev]);
    // Auto-select the newly uploaded one
    onChange([...selectedIds, newPrescription._id]);
    setIsUploadOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deletePrescription(id);
      setPrescriptions(prev => prev.filter(p => p._id !== id));
      onChange(selectedIds.filter(i => i !== id));
      toast.success("Prescription deleted");
    } catch (error) {
      toast.error("Failed to delete prescription");
    }
  };

  const selectedPrescriptions = Array.isArray(prescriptions) 
    ? prescriptions.filter(p => selectedIds.includes(p._id)) 
    : [];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <span>Prescriptions</span>
            {selectedIds.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-500/10 text-blue-500 border-none px-1.5 h-5 min-w-5 flex items-center justify-center">
                    {selectedIds.length}
                </Badge>
            )}
        </label>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 rounded-lg gap-2 text-xs border-dashed border-primary/20 hover:border-primary/40 bg-primary/5">
              <Plus className="h-3 w-3" />
              <span>{selectedIds.length > 0 ? "Select More" : "Attach Prescription"}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full sm:max-w-xl h-full sm:max-h-[85vh] flex flex-col p-0 border-zinc-800 bg-background/95 backdrop-blur-md sm:rounded-[2.5rem] overflow-hidden">
            <DialogHeader className="p-6 sm:p-8 pb-2">
                <div className="flex flex-row items-center justify-between gap-4">
                      <div className="min-w-0">
                        <DialogTitle className="text-xl font-bold truncate">Select prescriptions</DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                            Attach documents to your medicine.
                        </DialogDescription>
                      </div>
                      <Button onClick={() => setIsUploadOpen(true)} className="gap-2 rounded-xl h-10 px-3 sm:px-4 font-semibold shrink-0">
                        <Plus className="h-4 w-4" />
                        <span className="hidden xs:inline">Upload new</span>
                      </Button>
                </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by label or doctor..." 
                  className="pl-10 bg-muted/20 border-primary/5 rounded-xl h-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 w-full">
              <div className="p-6 overflow-x-hidden w-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Fetching your documents...</p>
                </div>
              ) : filteredPrescriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                    <div className="p-4 bg-muted/20 rounded-full">
                        <Layers className="h-8 w-8 text-muted-foreground" />
                    </div>
                  <p className="text-sm text-muted-foreground">No prescriptions found.</p>
                  <Button variant="outline" onClick={() => setIsUploadOpen(true)} className="rounded-xl font-semibold">
                      Upload your first prescription
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                  {filteredPrescriptions.map((p) => {
                    const isSelected = selectedIds.includes(p._id);
                    return (
                      <div 
                        key={p._id}
                        onClick={() => toggleSelection(p._id)}
                        className={cn(
                          "group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2",
                          isSelected 
                            ? "bg-blue-500/10 border-blue-500/50" 
                            : "bg-muted/10 border-primary/5 hover:border-primary/20 hover:bg-muted/20"
                        )}
                      >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className={cn("h-4 w-4 shrink-0", isSelected ? "text-blue-500" : "text-muted-foreground")} />
                                <span className={cn("text-sm font-semibold truncate", isSelected ? "text-blue-600" : "text-foreground")}>
                                    {p.label}
                                </span>
                            </div>
                            {isSelected && (
                                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                            )}
                        </div>
                        
                        {(p.doctorName || p.issuedDate) && (
                            <div className="space-y-1">
                                {p.doctorName && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        <Stethoscope className="h-3 w-3" />
                                        <span>{p.doctorName}</span>
                                    </div>
                                )}
                                {p.issuedDate && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        <span>{format(new Date(p.issuedDate), "MMM dd, yyyy")}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-full bg-background/80"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewDoc({ url: p.url, label: p.label });
                                }}
                             >
                                <Eye className="h-3 w-3" />
                             </Button>
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-full bg-background/80 text-destructive hover:bg-destructive/10"
                                onClick={(e) => handleDelete(e, p._id)}
                             >
                                <Trash2 className="h-3 w-3" />
                             </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

            <DialogFooter className="p-6 border-t border-white/5 bg-muted/5 shrink-0 mt-auto">
                <Button className="w-full h-12 rounded-xl font-bold text-base" onClick={() => setIsOpen(false)}>
                    Confirm selection ({selectedIds.length})
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selected List Horizontal Scroll */}
      {selectedPrescriptions.length > 0 && (
         <div className="flex flex-wrap gap-2">
            {selectedPrescriptions.map(p => (
                <div key={p._id} className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-blue-500/5 border border-blue-500/20 rounded-xl group transition-colors hover:bg-blue-500/10">
                    <span className="text-[11px] font-medium text-blue-700 truncate max-w-[120px]">{p.label}</span>
                    <div className="flex items-center gap-1">
                        <button 
                            type="button" 
                            onClick={() => setPreviewDoc({ url: p.url, label: p.label })}
                            className="p-1 text-blue-500/60 hover:text-blue-500 transition-colors"
                        >
                            <Eye className="h-3 w-3" />
                        </button>
                        <button 
                            type="button" 
                            onClick={() => toggleSelection(p._id)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            ))}
         </div>
      )}

      {/* Internal Modals */}
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
    </div>
  );
}
