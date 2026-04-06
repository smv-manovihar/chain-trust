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
      <Card className="group relative overflow-hidden rounded-[2.5rem] border-primary/5 bg-card/40 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 h-full flex flex-col">
        {/* Header Area */}
        <div className="p-6 pb-0 flex items-start justify-between">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0 transition-transform duration-500">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary transition-all active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-500 transition-all active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 pt-5 flex-1 flex flex-col">
          <h3 className="font-black text-xl tracking-tight text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors">
            {prescription.label}
          </h3>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground opacity-70">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{prescription.doctorName || "Unknown Doctor"}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground opacity-70">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {prescription.issuedDate
                  ? format(new Date(prescription.issuedDate), "MMMM d, yyyy")
                  : "Issue date unknown"}
              </span>
            </div>
          </div>

          {prescription.notes && (
            <div className="mt-4 p-3 bg-primary/5 rounded-2xl border border-primary/5 min-h-[64px]">
              <div className="flex gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground font-medium italic line-clamp-2">
                  {prescription.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Area */}
        <div className="p-6 pt-0 mt-auto">
          <div className="pt-4 border-t border-primary/5">
            <Button 
              variant="outline" 
              onClick={() => setIsLinkedMedsOpen(true)}
              className="w-full h-11 rounded-2xl border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 backdrop-blur-sm justify-between px-4 transition-all active:scale-[0.98] shadow-sm"
              disabled={prescription.itemCount === 0}
            >
              <span className="text-[11px] font-black text-primary flex items-center gap-2">
                <Package className="h-3.5 w-3.5" />
                Show Medicines
              </span>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-[10px] font-black px-2 shadow-sm">
                {prescription.itemCount || 0}
              </Badge>
            </Button>
            <LinkedMedications 
              medications={prescription.linkedMedications} 
              open={isLinkedMedsOpen}
              onOpenChange={setIsLinkedMedsOpen}
            />
          </div>
        </div>
      </Card>
    );
  }

  // Mobile/Tablet List Variant (Card based)
  return (
    <Card className="group relative overflow-hidden rounded-[2rem] border-primary/5 bg-card/40 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0 group-hover:rotate-6 transition-transform">
        <FileText className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-black text-base tracking-tight truncate group-hover:text-primary transition-colors">
          {prescription.label}
        </h3>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[100px]">{prescription.doctorName || "Unknown Provider"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60">
            <Calendar className="h-3 w-3" />
            <span>{prescription.issuedDate ? format(new Date(prescription.issuedDate), "MMM d, yy") : "No Date"}</span>
          </div>
        </div>
      </div>

      <div className="w-full sm:w-48 shrink-0">
        <Button 
          variant="outline" 
          onClick={() => setIsLinkedMedsOpen(true)}
          className="w-full h-11 rounded-2xl border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 backdrop-blur-sm justify-between px-4 transition-all active:scale-[0.98] shadow-sm"
          disabled={prescription.itemCount === 0}
        >
          <span className="text-[11px] font-black text-primary flex items-center gap-2">
            <Package className="h-3.5 w-3.5" />
            Show Medicines
          </span>
          <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-[10px] font-black px-2 shadow-sm">
            {prescription.itemCount || 0}
          </Badge>
        </Button>
        <LinkedMedications 
          medications={prescription.linkedMedications} 
          open={isLinkedMedsOpen}
          onOpenChange={setIsLinkedMedsOpen}
        />
      </div>

      <div className="flex items-center gap-1 ml-auto shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary transition-all active:scale-95"
          onClick={onView}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl hover:bg-red-50 text-red-500 transition-all active:scale-95"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
