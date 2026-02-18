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
import { User, Bell, Shield, Wallet } from "lucide-react";

export default function ManufacturerSettingsPage() {
  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and company configuration
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card className="border border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Company Profile</CardTitle>
            </div>
            <CardDescription>
              Update your company information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" defaultValue="ChainTrust Inc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  defaultValue="MFG-2024-8842"
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" defaultValue="admin@chaintrust.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" defaultValue="+1 (555) 123-4567" />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button>Save Changes</Button>
            </div>
          </CardContent>
        </Card>

        {/* Blockchain Settings */}
        <Card className="border border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>Blockchain Integration</CardTitle>
            </div>
            <CardDescription>
              Manage your connected wallet and gas fee settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-1">
                <span className="font-medium">Connected Wallet</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span className="text-xs font-mono text-muted-foreground">
                    0x71C...9A23
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Disconnect
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoSign">Auto-sign Transactions</Label>
                <Switch id="autoSign" />
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically sign batch creation transactions (requires secure
                enclave enabled)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure how you want to be alerted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Email Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive daily summaries and critical alerts
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Low Stock Warnings</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when batch inventory drops below threshold
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Supply Chain Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Real-time updates on shipment anomalies
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>
              Two-factor authentication and access logs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Button variant="outline">Enable 2FA</Button>
            </div>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start mt-2"
            >
              Sign out of all other devices
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
