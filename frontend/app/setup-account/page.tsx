"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { setupAccount } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const setupSchema = z
  .object({
    otp: z.string().length(6, "OTP must be 6 digits"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    name: z.string().min(2, "Name is required"),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SetupFormValues = z.infer<typeof setupSchema>;

function SetupAccountForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // const { toast } = useToast(); -> Removed

  const { refreshUser } = useAuth();

  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verifyStep, setVerifyStep] = useState(true); // Step 1: OTP, Step 2: Details

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      otp: "",
      password: "",
      confirmPassword: "",
      name: "",
      phoneNumber: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
    },
  });

  useEffect(() => {
    const uid = searchParams.get("uid");
    const cid = searchParams.get("cid");

    if (!uid || !cid) {
      toast.error("Invalid Link", {
        description: "Missing user or company information.",
      });
      // Optionally redirect to login or show error state
    } else {
      setUserId(uid);
      setCompanyId(cid);
    }
  }, [searchParams]);

  const onSubmit = async (data: SetupFormValues) => {
    if (!userId || !companyId) return;

    setIsLoading(true);
    try {
      await setupAccount({
        userId,
        companyId,
        otp: data.otp,
        password: data.password,
        name: data.name,
        phoneNumber: data.phoneNumber,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
      });

      await refreshUser();

      toast.success("Account Setup Complete", {
        description: "Welcome to ChainTrust!",
      });

      router.push("/manufacturer"); // Or determine dashboard based on role? Usually employees go to manufacturer dashboard.
    } catch (error: any) {
      toast.error("Setup Failed", {
        description: error.message || "Failed to set up account.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpComplete = (value: string) => {
    if (value.length === 6) {
      // Ideally verify OTP with backend here before moving to next step,
      // but for now we verify all at once on submit or just enable the form
      setVerifyStep(false);
    }
  };

  if (!userId || !companyId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">
              Invalid Invitation Link
            </CardTitle>
            <CardDescription>
              Please check your email and try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Set Up Your Account</CardTitle>
          <CardDescription>
            {verifyStep
              ? "Please enter the verification code sent to your email."
              : "Secure your account and complete your profile."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: OTP */}
              <AnimatePresence mode="wait">
                {verifyStep ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4 flex flex-col items-center"
                  >
                    <FormField
                      control={form.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Code</FormLabel>
                          <FormControl>
                            <InputOTP
                              maxLength={6}
                              value={field.value}
                              onChange={(val) => {
                                field.onChange(val);
                                handleOtpComplete(val);
                              }}
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      onClick={() => setVerifyStep(false)}
                      disabled={form.watch("otp").length !== 6}
                      className="w-full"
                    >
                      Verify & Continue
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Create a password"
                                  {...field}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-500" />
                                )}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Confirm your password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 234 567 890" {...field} />
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
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="New York" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Add other optional fields as needed... for brevity keeping it simple */}

                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setVerifyStep(true)}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? "Setting up..." : "Complete Setup"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupAccountPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SetupAccountForm />
    </Suspense>
  );
}
