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
import { User, Bell, Shield, Wallet, Users, UserPlus, Loader2, LogOut, CheckCircle2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { deleteAccount } from "@/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ManufacturerSettingsPage() {
  const { user, logout, refreshUser, googleLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      await deleteAccount();
      toast.success("Account deleted successfully");
      logout();
    } catch (error) {
      toast.error("Failed to delete account");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and company configuration
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            General Settings
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security & Accounts
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
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
                  <Input id="companyName" defaultValue={user.companyName || "ChainTrust Inc."} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input id="email" defaultValue={user.email} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue={user.phoneNumber || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" defaultValue={user.website || ""} />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Security & Social Linking</CardTitle>
              </div>
              <CardDescription>
                Manage your account security and connected social profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Connected Accounts</h3>
                <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white dark:bg-zinc-800 rounded-full border border-border">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Google Account</p>
                      <p className="text-xs text-muted-foreground">
                        {user.provider === "google" ? `Connected as ${user.email}` : "Enable one-click login"}
                      </p>
                    </div>
                  </div>
                  {user.provider === "google" ? (
                    <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Linked
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="rounded-full gap-2"
                      onClick={() => googleLogin("/manufacturer/settings")}
                      disabled={isLoading}
                    >
                      <FcGoogle className="h-4 w-4" />
                      Connect Google Account
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
                <div className="flex flex-col gap-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out of all devices
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full justify-start gap-2">
                        <Shield className="h-4 w-4" />
                        Delete Manufacturer Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl border-destructive/20 shadow-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-2xl font-black text-destructive">Final Warning</AlertDialogTitle>
                      <AlertDialogDescription className="text-base">
                        This will permanently delete your manufacturer profile, team associations, and access to all batch data. This action is irreversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                      <AlertDialogCancel className="rounded-full">Keep My Account</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        className="bg-destructive hover:bg-destructive/90 rounded-full"
                      >
                        Yes, Delete Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>Company Employees</CardTitle>
                </div>
                <CardDescription>
                  Manage access and assign roles to your team members
                </CardDescription>
              </div>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg bg-muted/10">
                <Users className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-1">No employees added yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Invite team members to help manage your supply chain operations and verify product batches.
                </p>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

