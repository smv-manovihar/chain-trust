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
  ShieldCheck,
  Smartphone,
  ChevronRight,
  TrendingUp,
  History
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

export default function CustomerDashboard() {
  const { user } = useAuth();
  
  // Mock data for the overview
  const nextDose = {
    name: "Amoxicillin",
    time: "2:00 PM",
    remaining: "1h 15m",
  };

  const recentScans = [
    { id: 1, name: "Amoxicillin 500mg Batch #X-102", status: "Authentic", date: "2 hours ago" },
    { id: 2, name: "Vitamin D3 Gold", status: "Authentic", date: "Yesterday" },
  ];

  return (
    <div className="space-y-6 lg:space-y-10 max-w-6xl mx-auto">
      {/* Hero Header: Safety & Next Action */}
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="flex-1 p-6 lg:p-8 border-none bg-gradient-to-br from-primary/10 via-background to-primary/5 shadow-2xl shadow-primary/5 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Pill className="h-40 w-40 text-primary rotate-12" />
          </div>
          
          <div className="relative z-10">
            <Badge className="mb-4 bg-primary/20 text-primary border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Next Dose Reminder</Badge>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tighter mb-2">
              {nextDose.name} 500mg
            </h1>
            <div className="flex items-center gap-4 text-muted-foreground mb-8">
              <span className="flex items-center gap-2 font-bold bg-background/50 backdrop-blur px-3 py-1.5 rounded-2xl border border-primary/10">
                <Clock className="h-4 w-4 text-primary" /> {nextDose.time}
              </span>
              <span className="text-sm font-medium">Coming up in <span className="text-foreground font-black">{nextDose.remaining}</span></span>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl h-12 px-8 font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5" size="lg">
                <CheckCircle2 className="mr-2 h-5 w-5" /> Mark as Taken
              </Button>
              <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold bg-background/50 backdrop-blur" size="lg" asChild>
                <Link href="/customer/cabinet">Full List</Link>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="w-full md:w-[320px] p-6 lg:p-8 flex flex-col justify-between border-primary/10 bg-card/50 backdrop-blur-sm rounded-[2.5rem]">
          <div>
            <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6">
              <ShieldCheck className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2">Trust Certified</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All <span className="text-foreground font-bold">12 medicines</span> in your cabinet have been verified via blockchain.
            </p>
          </div>
          <Button variant="link" className="h-auto p-0 justify-start mt-6 text-primary font-black uppercase text-xs tracking-widest group" asChild>
            <Link href="/customer/cabinet">
              View Safety Report <ChevronRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </Card>
      </div>

      {/* Grid: Attention Needed & Metrics */}
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-10">
        
        {/* Alerts & Reminders */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" /> Need Attention
            </h3>
            <Badge variant="outline" className="rounded-full border-primary/20 text-primary py-0.5">2 New Alerts</Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-5 border-amber-500/20 bg-amber-500/5 rounded-3xl group hover:bg-amber-500/10 transition-colors cursor-default">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-400 text-sm mb-1">Refill Required</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">Vitamin D3 supply will run out in 3 days. Order now to avoid disruption.</p>
                  <Button size="sm" variant="outline" className="rounded-xl h-8 text-[10px] font-black uppercase tracking-wider border-amber-500/30 bg-background/50">Order Now</Button>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-primary/20 bg-primary/5 rounded-3xl group hover:bg-primary/10 transition-colors cursor-default">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-primary text-sm mb-1">Check-up Slotted</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">Your medication review with Dr. Sarah is tomorrow at 10:00 AM.</p>
                  <Button size="sm" variant="outline" className="rounded-xl h-8 text-[10px] font-black uppercase tracking-wider border-primary/30 bg-background/50">Add to Calendar</Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Verification Stats Section */}
          <div className="pt-4">
            <Card className="p-6 lg:p-8 bg-muted/30 border-dashed border-2 border-border/50 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6 text-center md:text-left">
                <div className="h-16 w-16 rounded-full bg-background border-4 border-primary flex items-center justify-center text-xl font-black shadow-inner">
                  85%
                </div>
                <div>
                  <h4 className="font-bold text-lg">Adherence Rate</h4>
                  <p className="text-sm text-muted-foreground italic">You're doing better than 70% of members!</p>
                </div>
              </div>
              <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold bg-background shadow-sm border-primary/20" asChild>
                <Link href="/customer/cabinet/history">
                  <TrendingUp className="mr-2 h-4 w-4 text-primary" /> View detailed trends
                </Link>
              </Button>
            </Card>
          </div>
        </section>

        {/* Sidebar: Recent Activity */}
        <section className="space-y-6">
          <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Recent Scans
          </h3>
          
          <div className="space-y-3">
            {recentScans.map((scan) => (
              <Card key={scan.id} className="p-4 rounded-2xl border-border/50 bg-card/30 hover:bg-muted/50 transition-colors cursor-default">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="text-xs font-bold truncate max-w-[150px]">{scan.name}</h5>
                  <Badge className="bg-green-500/10 text-green-500 border-none text-[8px] px-1.5 py-0">Authentic</Badge>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                  <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> Mobile Scan</span>
                  <span>{scan.date}</span>
                </div>
              </Card>
            ))}
            
            <Button variant="ghost" className="w-full rounded-2xl text-xs font-bold text-muted-foreground hover:text-primary transition-colors py-6 border border-dashed border-border group" asChild>
              <Link href="/verify">
                <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" /> 
                Scan New Medicine
              </Link>
            </Button>
          </div>
        </section>

      </div>
    </div>
  );
}

import { Plus } from "lucide-react";
