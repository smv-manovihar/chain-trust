"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, ShieldPlus, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function TeamManagementPage() {
  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="mb-10 px-1">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter leading-none">
          Team Management
        </h1>
        <p className="text-muted-foreground text-sm font-medium mt-2 italic flex items-center gap-2">
          <ShieldPlus className="w-3.5 h-3.5 text-primary" />
          Manage authorized personnel and logistical access levels.
        </p>
      </div>

      <Card className="rounded-[3rem] border-none bg-card/40 backdrop-blur-md shadow-2xl overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-8 sm:p-10 border-b border-border/10 gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-xl font-black tracking-tighter">
                Authorized Nodes
              </CardTitle>
            </div>
            <CardDescription className="text-[10px] tracking-tight opacity-60 ml-10">
              Company-wide access control list
            </CardDescription>
          </div>
          <Button className="rounded-full h-12 px-6 bg-primary shadow-xl shadow-primary/20 font-bold tracking-tight gap-2 w-full sm:w-auto">
            <UserPlus className="h-4 w-4" />
            Invite Personnel
          </Button>
        </CardHeader>
        <CardContent className="p-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 px-8 text-center border-2 border-dashed rounded-[2.5rem] bg-muted/5 border-border/20 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

            <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 relative">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-ping" />
            </div>

            <h3 className="font-bold text-2xl tracking-tighter mb-2">
              Registry Empty
            </h3>
            <p className="text-sm text-muted-foreground font-medium mb-8 max-w-sm leading-relaxed italic">
              Authorize team members to manage supply chain logistics and
              broadcast cryptographic proofs to the ledger.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Button
                variant="outline"
                className="rounded-full h-14 px-8 font-bold tracking-tight border-border/40 hover:bg-muted/10 gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Send Invitation
              </Button>
            </div>
          </motion.div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="p-8 rounded-[2.5rem] border-none bg-card/40 backdrop-blur-md shadow-sm space-y-4">
          <h4 className="text-[10px] tracking-tight text-primary font-black">
            Security Protocol
          </h4>
          <p className="text-xs font-medium leading-relaxed italic text-muted-foreground">
            All personnel actions are logged and cryptographically linked to the
            manufacturer node. Use multi-factor authentication for
            high-clearance roles.
          </p>
        </Card>
        <Card className="p-8 rounded-[2.5rem] border-none bg-card/40 backdrop-blur-md shadow-sm space-y-4">
          <h4 className="text-[10px] tracking-tight text-primary font-black">
            Role Management
          </h4>
          <p className="text-xs font-medium leading-relaxed italic text-muted-foreground">
            Define custom permissions for logistics managers, auditors, and
            production heads to maintain operational integrity.
          </p>
        </Card>
      </div>
    </div>
  );
}
