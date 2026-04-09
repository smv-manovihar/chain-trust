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
import { User, Bell, Shield, Loader2, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
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
  updateNotificationPreferences,
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
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export default function CustomerSettingsPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<any>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        address: user.address || "",
        city: user.city || "",
        postalCode: user.postalCode || "",
        country: user.country || "",
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

  const handlePrefToggle = async (
    key: string,
    channel: "inApp" | "email",
    enabled: boolean,
  ) => {
    if (!notificationPrefs) return;

    const newPrefs = {
      ...notificationPrefs,
      [key]: {
        ...notificationPrefs[key],
        [channel]: enabled,
      },
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

  const handleLeadTimeChange = async (key: string, minutes: number) => {
    if (!notificationPrefs || !notificationPrefs[key]) return;

    const newPrefs = {
      ...notificationPrefs,
      [key]: {
        ...notificationPrefs[key],
        leadTimeMinutes: minutes,
      },
    };

    setNotificationPrefs(newPrefs);
    try {
      await updateNotificationPreferences(newPrefs);
      toast.success("Lead time updated");
    } catch (error) {
      toast.error("Failed to update lead time");
      setNotificationPrefs(notificationPrefs);
    }
  };

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    setIsLoading(true);
    try {
      await updateProfile(data);
      await refreshUser();
      toast.success("Profile Updated", {
        description: "Your personal information has been saved.",
      });
    } catch (error: any) {
      toast.error("Update Failed", {
        description: "We couldn't save your changes. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentTab = searchParams.get("tab") || "general";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="My Account"
        description="Manage your personal details, security preferences, and account activity."
      />

      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
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
            value="advanced"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 sm:px-6 whitespace-nowrap shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
          >
            <AlertCircle className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 outline-none">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-6"
          >
            <Card className="border border-border overflow-hidden rounded-[2rem] shadow-sm">
              <CardHeader className="bg-muted/30 pb-8">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl font-black tracking-tight">
                    Personal Profile
                  </CardTitle>
                </div>
                <CardDescription className="text-sm font-medium">
                  Update your basic information and contact details
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
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-muted-foreground/70 px-1">
                              Full Name
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
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-muted-foreground/70 px-1">
                              Email Address
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled
                                className="bg-muted/50 rounded-xl h-12 border-dashed font-medium"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-muted-foreground/70 px-1">
                              Phone Number
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
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-muted-foreground/70 px-1">
                              City
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
                    </div>

                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 pt-6 border-t border-border/50">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-muted-foreground/70 px-1">
                              Street Address
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="123 Main St"
                                className="rounded-xl h-12 bg-muted/10 font-medium"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold text-muted-foreground/70 px-1">
                                Postal Code
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="rounded-xl h-12 bg-muted/10 font-bold"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold text-muted-foreground/70 px-1">
                                Country
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
                      </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-border mt-8">
                      <Button
                        disabled={isLoading}
                        className="rounded-full w-full sm:w-auto px-10 h-12 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-xs sm:text-[10px] font-bold"
                      >
                        {isLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Update Profile
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent
          value="security"
          className="space-y-6 outline-none"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-6"
          >
            <GoogleConnection redirectPath="/customer/settings" />
            <PasswordSettings />

            <Card className="border border-border opacity-50 bg-muted/[0.02]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg font-black">
                    Privacy Controls
                  </CardTitle>
                </div>
                <CardDescription>
                  Coming soon: biometric login and identity masking features.
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 outline-none">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-6"
          >
            <Card className="border border-border rounded-[2rem] overflow-hidden shadow-sm">
              <CardHeader className="bg-muted/30 pb-8">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <Bell className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl font-black tracking-tight">
                    Notification Hub
                  </CardTitle>
                </div>
                <CardDescription className="text-sm font-medium">
                  Customize how and where you receive critical medicine alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {/* Desktop view: Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/5">
                        <th className="text-left py-6 px-8 text-xs font-black uppercase tracking-widest text-muted-foreground/60 w-full">
                          Alert Type
                        </th>
                        <th className="py-6 px-6 text-xs font-black uppercase tracking-widest text-muted-foreground/60 text-center">
                          In-App
                        </th>
                        <th className="py-6 px-8 text-xs font-black uppercase tracking-widest text-muted-foreground/60 text-center">
                          Email
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {[
                        {
                          key: "batch_recall",
                          label: "Safety Recalls",
                          desc: "Immediate alerts if a medicine is recalled.",
                        },
                        {
                          key: "medicine_expiry",
                          label: "Expiry Alerts",
                          desc: "Notifications before your medicine expires.",
                        },
                        {
                          key: "dose_reminder",
                          label: "Dose Reminders",
                          desc: "Daily schedule tracking reminders.",
                          hasLeadTime: true,
                        },
                        {
                          key: "low_stock",
                          label: "Low Stock",
                          desc: "Alerts when your stock drops below threshold.",
                        },
                        {
                          key: "system",
                          label: "System Updates",
                          desc: "New features and security improvements.",
                        },
                      ].map((type) => (
                        <tr
                          key={type.key}
                          className="group hover:bg-muted/5 transition-colors"
                        >
                          <td className="py-6 px-8">
                            <div className="space-y-1">
                              <Label className="text-sm font-black">
                                {type.label}
                              </Label>
                              <p className="text-xs text-muted-foreground/70 font-medium max-w-sm line-clamp-1 group-hover:line-clamp-none transition-all">
                                {type.desc}
                              </p>
                              {type.hasLeadTime && (
                                <div className="pt-2 flex items-center gap-3">
                                  <Label className="text-[10px] font-black uppercase text-muted-foreground/50">Notify me</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min={0}
                                      value={notificationPrefs?.[type.key]?.leadTimeMinutes || 0}
                                      onChange={(e) => handleLeadTimeChange(type.key, parseInt(e.target.value) || 0)}
                                      className="w-16 h-7 text-[10px] font-bold rounded-lg bg-muted/30 border-none text-center"
                                    />
                                    <span className="text-[10px] font-bold text-muted-foreground/40">min before dose</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-6 px-6">
                            <div className="flex justify-center">
                              <Switch
                                checked={
                                  notificationPrefs?.[type.key]?.inApp || false
                                }
                                onCheckedChange={(checked) =>
                                  handlePrefToggle(type.key, "inApp", checked)
                                }
                                disabled={prefsLoading || !notificationPrefs}
                                className="scale-90 data-[state=checked]:bg-primary"
                              />
                            </div>
                          </td>
                          <td className="py-6 px-8">
                            <div className="flex justify-center">
                              <Switch
                                checked={
                                  notificationPrefs?.[type.key]?.email || false
                                }
                                onCheckedChange={(checked) =>
                                  handlePrefToggle(type.key, "email", checked)
                                }
                                disabled={prefsLoading || !notificationPrefs}
                                className="scale-90 data-[state=checked]:bg-primary"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile view: Stacked cards */}
                <div className="md:hidden divide-y divide-border/50">
                  {[
                    {
                      key: "batch_recall",
                      label: "Safety Recalls",
                      desc: "Immediate alerts if a medicine is recalled.",
                    },
                    {
                      key: "medicine_expiry",
                      label: "Expiry Alerts",
                      desc: "Notifications before your medicine expires.",
                    },
                    {
                      key: "dose_reminder",
                      label: "Dose Reminders",
                      desc: "Daily schedule tracking reminders.",
                      hasLeadTime: true,
                    },
                    {
                      key: "low_stock",
                      label: "Low Stock",
                      desc: "Alerts when your stock drops below threshold.",
                    },
                    {
                      key: "system",
                      label: "System Updates",
                      desc: "New features and security improvements.",
                    },
                  ].map((type) => (
                    <div key={type.key} className="p-6 space-y-4">
                      <div className="space-y-1">
                        <Label className="text-base font-black">
                          {type.label}
                        </Label>
                        <p className="text-xs text-muted-foreground/70 font-medium leading-relaxed">
                          {type.desc}
                        </p>
                      </div>

                      {type.hasLeadTime && (
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/10">
                          <Label className="text-[10px] font-black uppercase text-primary/60">Lead Time</Label>
                          <div className="flex items-center gap-2">
                             <Input
                                type="number"
                                min={0}
                                value={notificationPrefs?.[type.key]?.leadTimeMinutes || 0}
                                onChange={(e) => handleLeadTimeChange(type.key, parseInt(e.target.value) || 0)}
                                className="w-14 h-8 text-xs font-black rounded-xl bg-background border-primary/20 text-center"
                              />
                              <span className="text-[10px] font-bold text-muted-foreground/50">min</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase text-muted-foreground/50">In-App</span>
                            <Switch
                              checked={notificationPrefs?.[type.key]?.inApp || false}
                              onCheckedChange={(checked) => handlePrefToggle(type.key, "inApp", checked)}
                              disabled={prefsLoading || !notificationPrefs}
                              className="scale-90 data-[state=checked]:bg-primary"
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase text-muted-foreground/50">Email</span>
                            <Switch
                              checked={notificationPrefs?.[type.key]?.email || false}
                              onCheckedChange={(checked) => handlePrefToggle(type.key, "email", checked)}
                              disabled={prefsLoading || !notificationPrefs}
                              className="scale-90 data-[state=checked]:bg-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent
          value="advanced"
          className="space-y-6 outline-none"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-6"
          >
            <DangerZoneSettings role="customer" />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
