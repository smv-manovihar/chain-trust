"use client";

import React from "react";
import Link from "next/link";
import { Pill, ShieldCheck, ChevronRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { resolveMediaUrl } from "@/lib/media-url";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";

interface LinkedMedication {
  _id: string;
  name: string;
  brand: string;
  productId: string;
  batchNumber?: string;
  isUserAdded?: boolean;
  images?: string[];
}

interface LinkedMedicationsProps {
  medications: LinkedMedication[];
}

export function LinkedMedications({ medications }: LinkedMedicationsProps) {
  const count = medications?.length || 0;

  if (count === 0) {
    return (
      <div className="flex items-center gap-2 p-3 border border-dashed border-primary/10 rounded-2xl bg-muted/5 opacity-50">
        <Package className="h-4 w-4 text-muted-foreground/50" />
        <p className="text-[10px] font-black uppercase tracking-widest">No linked medications</p>
      </div>
    );
  }

  return (
    <ResponsiveDialog>
      <ResponsiveDialogTrigger asChild>
        <Button variant="outline" className="w-full h-11 rounded-2xl border-primary/10 bg-muted/20 hover:bg-muted/40 justify-between px-4">
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
            <Package className="h-4 w-4" />
            View linked medications
          </span>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px]">
            {count}
          </Badge>
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="w-full sm:max-w-md p-0 overflow-hidden bg-background/95 backdrop-blur-md rounded-t-[2rem] sm:rounded-[2.5rem] border border-primary/10">
        <ResponsiveDialogHeader className="p-6 pb-2">
          <ResponsiveDialogTitle className="text-xl font-bold tracking-tight">Linked Medications</ResponsiveDialogTitle>
          <p className="text-xs text-muted-foreground font-medium">Medications that use this prescription.</p>
        </ResponsiveDialogHeader>
        
        <div className="p-6 pt-2 space-y-2 max-h-[60vh] overflow-y-auto">
          {medications.map((med) => (
            <Link 
              key={med._id} 
              href={`/customer/cabinet/${med._id}`}
              className="group flex items-center gap-3 p-3 rounded-2xl border border-primary/5 bg-background/50 hover:border-primary/20 hover:bg-primary/5 transition-all"
            >
              {med.images && med.images.length > 0 ? (
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-[0.85rem] overflow-hidden shrink-0 shadow-sm border border-primary/10 bg-white">
                  <img src={resolveMediaUrl(med.images[0])} alt={med.name} className="h-full w-full object-cover" crossOrigin="anonymous" />
                </div>
              ) : (
                <div className={cn(
                  "h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-[0.85rem] transition-all duration-300 shrink-0",
                  med.isUserAdded ? "bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                )}>
                  {med.isUserAdded ? <Pill className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold truncate group-hover:text-primary transition-colors">{med.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest truncate">{med.brand}</p>
                  {!med.isUserAdded && (
                    <Badge variant="outline" className="h-3 px-1 text-[7px] uppercase tracking-tighter border-emerald-500/20 text-emerald-600 bg-emerald-500/5">
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
              
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
