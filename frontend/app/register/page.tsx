"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { AuthLayout } from "@/components/auth-layout";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import EmailVerificationModal from "@/components/email-verification/email-verification-modal";

// Schema definition
const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    role: z.enum(["customer", "manufacturer"]),
    phone_number: z.string().min(10, "Phone number must be at least 10 digits"),
    // Address fields - optional for customer, required for manufacturer
    address: z.string().optional(),
    city: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    // Manufacturer specific fields
    company_name: z.string().optional(),
    industry_registration: z.string().optional(),
    website: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    if (data.role === "manufacturer") {
      if (!data.address)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Address is required",
          path: ["address"],
        });
      if (!data.city)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "City is required",
          path: ["city"],
        });
      if (!data.postal_code)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Postal Code is required",
          path: ["postal_code"],
        });
      if (!data.country)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Country is required",
          path: ["country"],
        });
      if (!data.company_name)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Company Name is required",
          path: ["company_name"],
        });
      if (!data.industry_registration)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "License No is required",
          path: ["industry_registration"],
        });
      if (!data.website)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Website is required",
          path: ["website"],
        });
    }
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [serverError, setServerError] = useState("");
  const router = useRouter();
  const { register } = useAuth();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "customer",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone_number: "",
      address: "",
      city: "",
      country: "",
      postal_code: "",
      company_name: "",
      industry_registration: "",
      website: "",
    },
    mode: "onChange",
  });

  const { watch, setValue, trigger } = form;
  const role = watch("role");
  const totalSteps = role === "manufacturer" ? 3 : 2;

  const handleNext = async () => {
    let fieldsToValidate: (keyof RegisterFormValues)[] = [];

    if (step === 1) {
      fieldsToValidate = [
        "name",
        "email",
        "password",
        "confirmPassword",
        "role",
      ];
    } else if (step === 2) {
      fieldsToValidate = ["phone_number"];
      if (role === "manufacturer") {
        fieldsToValidate.push("address", "city", "postal_code", "country");
      }
    }

    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      // If customer is at step 2, we are done, so submit instead of next
      if (role === "customer" && step === 2) {
        await form.handleSubmit(onSubmit)();
      } else {
        setStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setServerError("");

    try {
      const payload: any = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        phone_number: data.phone_number,
        address: data.address,
        city: data.city,
        country: data.country,
        postal_code: data.postal_code,
      };

      if (data.role === "manufacturer") {
        payload.company_name = data.company_name;
        payload.industry_registration = data.industry_registration;
        payload.website = data.website;
      }

      const redirectUrl = await register(payload);
      setSuccess(true);
      // We could redirect here or let the success state handle it (which shows verification modal)
      // The current flow shows a success screen, so we might not need redirectUrl immediately
      // unless we want to skip the success screen.
      // Given the implementation, let's keep success screen but maybe store redirectUrl?
      // Actually, standard flow upon register is verification, so redirectUrl might be for after verification.
      // But for now, let's just complete the register call.
    } catch (err: any) {
      setServerError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <AuthLayout
          title="Verify Your Email"
          subtitle="We've sent a verification code to your email address."
        >
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                Account Created Successfully!
              </h2>
              <p className="text-muted-foreground text-sm">
                Please check your email and verify your account to continue.
              </p>
            </div>

            <div className="w-full space-y-3">
              <Button
                onClick={() => setShowVerificationModal(true)}
                className="w-full"
              >
                Verify Email
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          </div>
        </AuthLayout>

        <EmailVerificationModal
          email={form.getValues("email")}
          isOpen={showVerificationModal}
          onOpenChange={setShowVerificationModal}
          onSuccess={() => router.push("/login")}
        />
      </div>
    );
  }

  return (
    <AuthLayout
      title="Start Your Journey"
      subtitle="Join our growing community of manufacturers and customers securing the pharmaceutical supply chain."
    >
      <div className="flex flex-col space-y-2 text-center mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Step {step} of {totalSteps}:{" "}
          {step === 1
            ? "Account Details"
            : step === 2
              ? "Contact Info"
              : "Business Details"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <Tabs
                value={role}
                onValueChange={(v) =>
                  setValue("role", v as "customer" | "manufacturer")
                }
                className="w-full mb-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="customer">Customer</TabsTrigger>
                  <TabsTrigger value="manufacturer">Manufacturer</TabsTrigger>
                </TabsList>
              </Tabs>

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

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Address {role === "customer" && "(Optional)"}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        City {role === "customer" && "(Optional)"}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Postal Code {role === "customer" && "(Optional)"}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Country {role === "customer" && "(Optional)"}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 3 && role === "manufacturer" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs">
                  Manufacturer Details
                </span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="industry_registration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry Registration (License No)</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {serverError && (
            <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm animate-in fade-in zoom-in-95">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{serverError}</p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="w-full"
                disabled={isLoading}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}

            {step < totalSteps && !(role === "customer" && step === 2) ? (
              <Button type="button" onClick={handleNext} className="w-full">
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={
                  role === "customer" && step === 2
                    ? handleNext
                    : form.handleSubmit(onSubmit)
                }
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            )}
          </div>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
