"use client";

import React from "react";
import { 
  FileText, 
  User, 
  Calendar, 
  Eye, 
  Trash2, 
  AlertCircle,
  Package
} from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LinkedMedications } from "./linked-medications";

interface Prescription {
  _id: string;
  url: string;
  label: string;
  doctorName?: string;
  issuedDate?: string;
  notes?: string;
  createdAt: string;
  linkedMedications: any[];
  itemCount: number;
}

interface PrescriptionCardProps {
  prescription: Prescription;
  variant: "grid" | "list";
  onView: () => void;
  onDelete: () => void;
}

export function PrescriptionCard({ 
  prescription, 
  variant, 
  onView, 
  onDelete 
}: PrescriptionCardProps) {
  const isGrid = variant === "grid";
  const [isLinkedMedsOpen, setIsLinkedMedsOpen] = React.useState(false);

  if (isGrid) {
    return (
      <Card className="group relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border-primary/5 bg-card/40 backdrop-blur-xl transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 p-5 sm:p-6 flex flex-col gap-4 sm:gap-6 cursor-pointer">
        {/* Glass Background Artifact */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />

        <div className="flex gap-4 items-center relative z-10 w-full shrink-0">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-[0.85rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="font-bold text-base md:text-lg leading-tight group-hover:text-primary transition-colors truncate">
              {prescription.label}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground font-black mt-0.5 opacity-70 truncate">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{prescription.doctorName || "Unknown Provider"}</span>
            </div>
          </div>
        </div>

        {/* Medicines Count / Action */}
        <div className="relative z-10 w-full flex-1">
          <div className="flex justify-between items-end mb-2">
             <span className="text-[10px] font-black text-muted-foreground opacity-60 uppercase tracking-widest">
                Contents
             </span>
             <span className="text-[10px] sm:text-xs font-black text-primary">
                {prescription.itemCount || 0} Medicines
             </span>
          </div>
          <Button 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation();
              setIsLinkedMedsOpen(true);
            }}
            className="w-full h-8 sm:h-9 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
            disabled={prescription.itemCount === 0}
          >
            <span className="text-[10px] sm:text-xs font-black">
              Show Medicines
            </span>
          </Button>
          <LinkedMedications 
            medications={prescription.linkedMedications} 
            open={isLinkedMedsOpen}
            onOpenChange={setIsLinkedMedsOpen}
          />
        </div>

        <div className="flex flex-col gap-2 w-full mt-auto relative z-10 shrink-0">
          <div className="flex items-center gap-2 bg-background/50 border border-border/40 px-3 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold text-muted-foreground overflow-hidden">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">
              Issued: {prescription.issuedDate ? format(new Date(prescription.issuedDate), "MMM d, yyyy") : "No Date"}
            </span>
          </div>
          {prescription.notes && (
            <div className="flex gap-2 bg-primary/5 border border-primary/10 px-3 py-2.5 rounded-xl overflow-hidden">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
              <p className="text-[10px] sm:text-xs font-medium italic text-muted-foreground line-clamp-2">
                {prescription.notes}
              </p>
            </div>
          )}
        </div>

        {/* Card Quick Actions */}
        <div className="flex items-center gap-2 relative z-10 w-full pt-2 shrink-0">
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="h-[2.5rem] sm:h-11 flex-1 rounded-xl text-[11px] sm:text-xs font-black bg-primary/5 hover:bg-primary hover:text-primary-foreground border-primary/20 text-primary transition-all shadow-sm"
          >
            View Document
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-[2.5rem] w-[2.5rem] sm:h-11 sm:w-11 shrink-0 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors border border-transparent hover:border-destructive/20"
            aria-label="Delete Prescription"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  // Mobile/Tablet List Variant (Card based)
  return (
    <Card className="group relative overflow-hidden rounded-[1.5rem] border-primary/5 bg-card/40 backdrop-blur-xl transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer active:scale-[0.98]">
      <div className="flex gap-4 items-center w-full sm:w-[200px] shrink-0">
        <div className="h-12 w-12 rounded-[0.85rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0 transition-transform">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
            {prescription.label}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-black text-muted-foreground opacity-70">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{prescription.doctorName || "Unknown Provider"}</span>
          </div>
        </div>
      </div>

      <div className="w-full sm:flex-1">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-[10px] font-black text-muted-foreground opacity-60">
            Linked Items
          </span>
          <span className="text-[10px] font-black text-primary">
            {prescription.itemCount || 0} Medicines
          </span>
        </div>
        <Button 
          variant="outline" 
          onClick={(e) => {
            e.stopPropagation();
            setIsLinkedMedsOpen(true);
          }}
          className="w-full h-8 rounded-lg border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-black text-[10px] transition-all"
          disabled={prescription.itemCount === 0}
        >
           Show Details
        </Button>
        <LinkedMedications 
          medications={prescription.linkedMedications} 
          open={isLinkedMedsOpen}
          onOpenChange={setIsLinkedMedsOpen}
        />
      </div>

      <div className="flex items-center justify-between w-full sm:w-auto gap-2 shrink-0">
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
          <Calendar className="h-3 w-3 text-primary" aria-hidden="true" />
          {prescription.issuedDate ? format(new Date(prescription.issuedDate), "MMM yyyy") : "No Date"}
        </div>
 
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="h-8 px-3 rounded-lg text-[10px] font-black bg-primary/5 hover:bg-primary hover:text-primary-foreground border-primary/20 text-primary"
          >
            Open
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
