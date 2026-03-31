"use client";

import React from "react";
import Link from "next/link";
import { Pill, ShieldCheck, ChevronRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface LinkedMedication {
  _id: string;
  name: string;
  brand: string;
  productId: string;
  batchNumber?: string;
  isUserAdded?: boolean;
}

interface LinkedMedicationsProps {
  medications: LinkedMedication[];
}

export function LinkedMedications({ medications }: LinkedMedicationsProps) {
  if (!medications || medications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 border border-dashed border-primary/10 rounded-2xl bg-muted/5 opacity-50">
        <Package className="h-6 w-6 mb-2 text-muted-foreground/30" />
        <p className="text-[10px] font-black uppercase tracking-widest text-center">No linked medications</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
      {medications.map((med) => (
        <Link 
          key={med._id} 
          href={`/customer/cabinet/${med._id}`}
          className="group flex items-center gap-3 p-3 rounded-2xl border border-primary/5 bg-background/50 hover:border-primary/20 hover:bg-primary/5 transition-all"
        >
          <div className={cn(
            "p-2 rounded-xl transition-colors",
            med.isUserAdded ? "bg-zinc-100 text-zinc-500" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white"
          )}>
            {med.isUserAdded ? <Pill className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold truncate group-hover:text-primary transition-colors">{med.name}</h4>
            <div className="flex items-center gap-2">
              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest truncate">{med.brand}</p>
              {!med.isUserAdded && (
                <Badge variant="outline" className="h-3 px-1 text-[7px] uppercase tracking-tighter border-emerald-500/20 text-emerald-600 bg-emerald-500/5">
                  Verified
                </Badge>
              )}
            </div>
          </div>
          
          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ))}
    </div>
  );
}
