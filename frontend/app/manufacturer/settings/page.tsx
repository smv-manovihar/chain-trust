"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Bell,
  Shield,
  Wallet,
  Loader2,
  Lock,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { WalletSettings } from "@/components/layout/wallet-settings";
import { GoogleConnection } from "@/components/settings/google-connection";
import { PasswordSettings } from "@/components/settings/password-settings";
import { DangerZoneSettings } from "@/components/settings/danger-zone-settings";
import { useState } from "react";

export default function ManufacturerSettingsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="px-1">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter leading-none text-foreground">
          My Account
        </h1>
        <p className="text-muted-foreground text-sm font-medium mt-2 italic px-1">
          Configure your corporate identity, security protocols, and blockchain
          connectivity.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-8 bg-muted/50 p-1 rounded-2xl border border-border/50 h-14 w-full sm:w-auto overflow-x-auto sm:overflow-visible">
          <TabsTrigger
            value="general"
            className="flex items-center gap-2 rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
          >
            <User className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex items-center gap-2 rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
          >
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2 rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="web3"
            className="flex items-center gap-2 rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
          >
            <Wallet className="h-4 w-4" />
            Web3
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="flex items-center gap-2 rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
          >
            <AlertCircle className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="general"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <Card className="border border-border overflow-hidden rounded-[2rem] shadow-sm">
            <CardHeader className="bg-muted/30 pb-8">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <User className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl font-black tracking-tight">
                  Company Profile
                </CardTitle>
              </div>
              <CardDescription className="text-sm font-medium">
                Update your registered corporate information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="companyName"
                    className="text-xs font-bold text-muted-foreground/70 px-1"
                  >
                    Corporate Name
                  </Label>
                  <Input
                    id="companyName"
                    defaultValue={user.companyName || "ChainTrust Inc."}
                    className="rounded-xl h-12 bg-muted/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-bold text-muted-foreground/70 px-1"
                  >
                    Primary Email
                  </Label>
                  <Input
                    id="email"
                    defaultValue={user.email}
                    disabled
                    className="bg-muted/50 rounded-xl h-12 border-dashed"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-xs font-bold text-muted-foreground/70 px-1"
                  >
                    Contact Phone
                  </Label>
                  <Input
                    id="phone"
                    defaultValue={user.phoneNumber || ""}
                    placeholder="+1 (555) 000-0000"
                    className="rounded-xl h-12 bg-muted/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="website"
                    className="text-xs font-bold text-muted-foreground/70 px-1"
                  >
                    Official Website
                  </Label>
                  <Input
                    id="website"
                    defaultValue={user.website || ""}
                    placeholder="https://chaintrust.io"
                    className="rounded-xl h-12 bg-muted/10"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-6 border-t border-border mt-8">
                <Button
                  disabled={isLoading}
                  className="rounded-full px-10 h-12 font-bold text-[10px] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Profile Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="security"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400"
        >
          <GoogleConnection redirectPath="/manufacturer/settings" />
          <PasswordSettings />

          <Card className="border border-border opacity-50 bg-muted/[0.02]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg font-black">
                  Two-Factor Authentication
                </CardTitle>
              </div>
              <CardDescription>
                Coming soon: secure your account with hardware keys or auth
                apps.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent
          value="notifications"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <Card className="border border-border rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-muted/10">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-black">
                  Alert Preferences
                </CardTitle>
              </div>
              <CardDescription>
                Configure how you want to be notified of critical events.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0 divide-y divide-border">
              <div className="flex items-center justify-between py-6">
                <div className="space-y-1">
                  <Label className="text-sm font-bold">Email Summaries</Label>
                  <p className="text-xs text-muted-foreground italic">
                    Daily breakdown of production batches and scan activity.
                  </p>
                </div>
                <Switch
                  defaultChecked
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              <div className="flex items-center justify-between py-6">
                <div className="space-y-1">
                  <Label className="text-sm font-bold">
                    Inventory Warnings
                  </Label>
                  <p className="text-xs text-muted-foreground italic">
                    Instant alerts when batch unit counts drop below 10%.
                  </p>
                </div>
                <Switch
                  defaultChecked
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              <div className="flex items-center justify-between py-6">
                <div className="space-y-1">
                  <Label className="text-sm font-bold">Security Alerts</Label>
                  <p className="text-xs text-muted-foreground italic">
                    Notifications for unusual scan velocities or geographic
                    jumps.
                  </p>
                </div>
                <Switch
                  defaultChecked
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="web3"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-600"
        >
          <WalletSettings />
        </TabsContent>

        <TabsContent
          value="advanced"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700"
        >
          <DangerZoneSettings role="manufacturer" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
