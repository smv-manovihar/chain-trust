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
  Archive
} from "lucide-react";

export default function CabinetPage() {
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Medicines</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Track your active medications, manage your health status, and receive usage alerts.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-primary hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Active Prescriptions</p>
              <h3 className="text-3xl font-bold">4</h3>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Pill className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Needs Refill Soon</p>
              <h3 className="text-3xl font-bold">1</h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Adherence Rate</p>
              <h3 className="text-3xl font-bold">94%</h3>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl text-green-500">
              <Activity className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Current Medications
            </h2>
            <Button variant="outline" size="sm">Add Medication</Button>
          </div>

          <div className="space-y-4">
            {activeMedications.map((med) => (
              <Card key={med.id} className="p-5 border border-border/50 hover:border-primary/30 transition-all flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-muted rounded-xl shrink-0 mt-1">
                    <Pill className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{med.name}</h3>
                      {med.alert && (
                        <Badge variant="destructive" className="h-5 text-[10px] px-1.5 uppercase">Low Supply</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{med.dosage}</p>
                    
                    <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                      <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                        <Clock className="h-3.5 w-3.5" /> Next: {med.nextDose}
                      </span>
                      <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                        <Archive className="h-3.5 w-3.5" /> {med.remaining} / {med.total} left
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col gap-2 w-full md:w-auto mt-2 md:mt-0">
                  <Button size="sm" className="flex-1 md:w-full gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Taken
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 md:w-full gap-2">
                    <BellRing className="h-4 w-4" /> Remind
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <BellRing className="h-5 w-5 text-primary" />
            Health Alerts
          </h2>
          
          <Card className="p-5 border border-amber-500/30 bg-amber-500/5 shadow-sm">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-400 mb-1">Refill Reminder</h4>
                <p className="text-sm text-muted-foreground mb-3">You have 5 tablets of Vitamin D3 remaining. Recommended to order a refill soon.</p>
                <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-amber-500/30 hover:bg-amber-500/10">Order Refill</Button>
              </div>
            </div>
          </Card>

          <Card className="p-5 border border-primary/20 bg-primary/5 shadow-sm mt-4">
            <div className="flex gap-3">
              <Activity className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-primary mb-1">Health Interaction Scan</h4>
                <p className="text-sm text-muted-foreground">All verified medications in your cabinet have been cross-checked. No negative interactions detected.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
