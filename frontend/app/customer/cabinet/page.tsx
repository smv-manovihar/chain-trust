"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pill,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Activity,
  BellRing,
  Archive,
  Plus,
  ShieldCheck,
  Smartphone,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

export default function MyMedicinesPage() {
  const { user } = useAuth();
  
  const activeMedications = [
    {
      id: 1,
      name: "Amoxicillin 500mg",
      dosage: "1 capsule 3x daily",
      nextDose: "2:00 PM Today",
      remaining: 12,
      total: 30,
      status: "active",
      alert: false,
    },
    {
      id: 2,
      name: "Vitamin D3",
      dosage: "1 tablet daily",
      nextDose: "8:00 AM Tomorrow",
      remaining: 5,
      total: 60,
      status: "running_low",
      alert: true,
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8 max-w-6xl mx-auto">
      {/* Welcome & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            My Medicines
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Welcome back, {user?.name?.split(" ")[0] || "User"}. You have {activeMedications.length} active prescriptions.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="flex-1 sm:flex-none rounded-full" asChild>
             <Link href="/customer/cabinet/history">History</Link>
           </Button>
           <Button className="flex-1 sm:flex-none rounded-full shadow-lg shadow-primary/20" asChild>
             <Link href="/verify">
               <Plus className="mr-2 h-4 w-4" />
               <span className="hidden sm:inline">Verify New Medicine</span>
               <span className="sm:hidden">Verify</span>
             </Link>
           </Button>
        </div>
      </div>

      {/* High-Level Metrics: Clean & Focused */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="p-4 lg:p-6 border-primary/10 bg-card/40 backdrop-blur-md rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Total Active</p>
              <h3 className="text-3xl font-black tracking-tighter">{activeMedications.length}</h3>
            </div>
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Pill className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 lg:p-6 border-amber-500/10 bg-card/40 backdrop-blur-md rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Low Supply</p>
              <h3 className="text-3xl font-black tracking-tighter text-amber-600">1</h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 lg:p-6 border-green-500/10 bg-green-500/[0.03] backdrop-blur-md rounded-[2rem] shadow-sm lg:col-span-2 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-green-500/10 rounded-2xl text-green-500">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5">Medicine Integrity</p>
              <h3 className="text-xl lg:text-2xl font-black text-green-600 dark:text-green-400">100% Verified</h3>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sync Status</p>
            <p className="text-sm font-medium">Just now</p>
          </div>
        </Card>
      </div>

      {/* Main Content: Tracking & Alerts */}
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Medication List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Tracking
            </h2>
          </div>

          <div className="space-y-4 lg:space-y-5">
            {activeMedications.map((med) => (
              <Card key={med.id} className="p-5 lg:p-6 border-primary/5 bg-card/30 hover:bg-card/60 hover:border-primary/20 transition-all flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center group rounded-[2.5rem]">
                <div className="flex gap-5 items-start lg:items-center">
                  <div className="p-4 bg-primary/5 rounded-[1.5rem] group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shrink-0 shadow-inner">
                    <Pill className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-black text-lg lg:text-xl tracking-tight">{med.name}</h3>
                      {med.alert && (
                        <Badge variant="destructive" className="h-5 text-[9px] px-2 uppercase font-black tracking-widest bg-amber-500 hover:bg-amber-600 border-none">Critical</Badge>
                      )}
                    </div>
                    <p className="text-xs lg:text-sm text-muted-foreground font-bold uppercase tracking-wide">{med.dosage}</p>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <div className="flex items-center gap-2 bg-background/50 border border-primary/10 px-3 py-1.5 rounded-2xl text-[11px] font-black uppercase tracking-tight text-primary">
                        <Clock className="h-3.5 w-3.5" /> {med.nextDose}
                      </div>
                      <div className="flex items-center gap-2 bg-background/50 border border-primary/10 px-3 py-1.5 rounded-2xl text-[11px] font-black uppercase tracking-tight text-muted-foreground">
                        <Archive className="h-3.5 w-3.5" /> {med.remaining} Units Left
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-3 w-full sm:w-36 mt-4 sm:mt-0">
                  <Button className="flex-1 sm:w-full rounded-2xl h-11 font-black uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Taken
                  </Button>
                  <Button variant="outline" className="flex-1 sm:w-full rounded-2xl h-11 font-black uppercase text-[10px] tracking-widest bg-background/50 border-primary/10">
                    <BellRing className="mr-2 h-4 w-4" /> Report
                  </Button>
                </div>
              </Card>
            ))}
            
            {/* Quick Verify Prominent CTA (if list is short or as an anchor) */}
            <Card className="p-6 border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col items-center justify-center text-center rounded-[2rem] group cursor-pointer" asChild>
              <Link href="/verify">
                <div className="p-3 bg-primary/20 rounded-full text-primary group-hover:scale-110 transition-transform mb-3">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-primary">Verify Another Product</h4>
                <p className="text-xs text-muted-foreground max-w-[200px] mt-1">Keep your medicine history up to date and safe.</p>
              </Link>
            </Card>
          </div>
        </div>

        {/* Intelligence Side Sidebar */}
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <BellRing className="h-5 w-5 text-primary" />
              Health Insights
            </h2>
            
            <div className="space-y-4">
              <Card className="p-5 border-amber-500/20 bg-amber-500/5 shadow-sm rounded-2xl">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900 dark:text-amber-400 text-sm mb-1">Refill Soon</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Vitamin D3 supply is reaching critical levels (5 remaining). 
                    </p>
                    <Button variant="outline" size="sm" className="h-8 mt-3 text-[10px] font-black uppercase tracking-wider border-amber-500/30 hover:bg-amber-500/10 rounded-full">
                      Find Pharmacy
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-5 border-primary/20 bg-primary/5 shadow-sm rounded-2xl">
                <div className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-primary text-sm mb-1">Safety Checked</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      No drug interactions found between Amoxicillin and Vitamin D3.
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-5 border-dashed border-primary/20 hover:bg-muted/50 transition-colors cursor-pointer rounded-2xl group">
                <div className="flex items-center justify-between group-hover:translate-x-1 transition-transform">
                   <div className="flex items-center gap-3">
                     <Activity className="h-5 w-5 text-primary" />
                     <span className="text-sm font-bold">Health Trends</span>
                   </div>
                   <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
