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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Bell,
  Shield,
  Wallet,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { WalletSettings } from "@/components/layout/wallet-settings";
import { GoogleConnection } from "@/components/settings/google-connection";
import { PasswordSettings } from "@/components/settings/password-settings";
import { DangerZoneSettings } from "@/components/settings/danger-zone-settings";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { updateProfile } from "@/api";
import { 
  getNotificationPreferences, 
  updateNotificationPreferences 
} from "@/api/notification.api";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";

const profileSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  phoneNumber: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export default function ManufacturerSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<any>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      companyName: "",
      phoneNumber: "",
      website: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        companyName: user.companyName || "",
        phoneNumber: user.phoneNumber || "",
        website: user.website || "",
      });
    }
  }, [user, form]);

  useEffect(() => {
    const fetchPrefs = async () => {
      setPrefsLoading(true);
      try {
        const prefs = await getNotificationPreferences();
        setNotificationPrefs(prefs);
      } catch (error) {
        console.error("Failed to fetch notification preferences:", error);
      } finally {
        setPrefsLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    setIsLoading(true);
    try {
      await updateProfile(data);
      await refreshUser();
      toast.success("Profile Updated", {
        description: "Your company information has been saved.",
      });
    } catch (error: any) {
      toast.error("Update Failed", {
        description: "We couldn't save your changes. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrefToggle = async (key: string, enabled: boolean) => {
    if (!notificationPrefs) return;
    
    const newPrefs = {
      ...notificationPrefs,
      [key]: { inApp: enabled, email: enabled }
    };
    
    setNotificationPrefs(newPrefs);
    try {
      await updateNotificationPreferences(newPrefs);
      toast.success("Preferences updated");
    } catch (error) {
      toast.error("Failed to update preferences");
      // Revert on failure
      setNotificationPrefs(notificationPrefs);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="My Account"
        description="Configure your corporate identity, security protocols, and blockchain connectivity."
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-8 bg-muted/50 p-1.5 rounded-2xl border border-border/50 h-auto w-full flex justify-start sm:w-auto sm:inline-flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsTrigger
            value="general"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 sm:px-6 whitespace-nowrap shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
          >
            <User className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 sm:px-6 whitespace-nowrap shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
          >
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 sm:px-6 whitespace-nowrap shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="web3"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 sm:px-6 whitespace-nowrap shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
          >
            <Wallet className="h-4 w-4" />
            Web3
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 sm:px-6 whitespace-nowrap shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
          >
            <AlertCircle className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="general"
          className="space-y-6"
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
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onProfileSubmit)}
                  className="space-y-6"
                >
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-muted-foreground/70 px-1">
                            Corporate Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="rounded-xl h-12 bg-muted/10 font-medium"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                        className="bg-muted/50 rounded-xl h-12 border-dashed font-medium"
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-muted-foreground/70 px-1">
                            Contact Phone
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="+1 (555) 000-0000"
                              className="rounded-xl h-12 bg-muted/10 font-medium"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-muted-foreground/70 px-1">
                            Official Website
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://chaintrust.io"
                              className="rounded-xl h-12 bg-muted/10 font-medium"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end pt-6 border-t border-border mt-8">
                    <Button
                      disabled={isLoading}
                      className="rounded-full w-full sm:w-auto px-10 h-12 font-bold text-xs sm:text-[10px] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Profile Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="security"
          className="space-y-6"
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
          className="space-y-6"
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
              <div className="flex items-center justify-between gap-4 py-6">
                <div className="space-y-1">
                  <Label className="text-sm font-bold">Email Summaries</Label>
                  <p className="text-xs text-muted-foreground italic">
                    Daily breakdown of production batches and scan activity.
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.scan_milestone?.inApp || false}
                  onCheckedChange={(checked) => handlePrefToggle('scan_milestone', checked)}
                  disabled={prefsLoading || !notificationPrefs}
                  className="data-[state=checked]:bg-primary shrink-0"
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-6">
                <div className="space-y-1">
                  <Label className="text-sm font-bold">
                    Inventory Warnings
                  </Label>
                  <p className="text-xs text-muted-foreground italic">
                    Instant alerts when batch unit counts drop below 10%.
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.system?.inApp || false}
                  onCheckedChange={(checked) => handlePrefToggle('system', checked)}
                  disabled={prefsLoading || !notificationPrefs}
                  className="data-[state=checked]:bg-primary shrink-0"
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-6">
                <div className="space-y-1">
                  <Label className="text-sm font-bold">Security Alerts</Label>
                  <p className="text-xs text-muted-foreground italic">
                    Notifications for unusual scan velocities or geographic
                    jumps.
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.suspicious_scan?.inApp || false}
                  onCheckedChange={(checked) => handlePrefToggle('suspicious_scan', checked)}
                  disabled={prefsLoading || !notificationPrefs}
                  className="data-[state=checked]:bg-primary shrink-0"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="web3"
          className="space-y-6"
        >
          <WalletSettings />
        </TabsContent>

        <TabsContent
          value="advanced"
          className="space-y-6"
        >
          <DangerZoneSettings role="manufacturer" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
