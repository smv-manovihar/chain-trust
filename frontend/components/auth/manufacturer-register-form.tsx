"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { AuthLayout } from "@/components/layout/auth-layout";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";

const manufacturerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(2, "Address is required"),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().min(2, "Postal Code is required"),
  country: z.string().min(2, "Country is required"),
  companyName: z.string().min(2, "Company Name is required"),
  industry_registration: z.string().min(2, "License No is required"),
  website: z.string().min(2, "Website is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ManufacturerFormValues = z.infer<typeof manufacturerSchema>;

export function ManufacturerRegisterForm() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");
  const router = useRouter();
  const { register } = useAuth();

  const form = useForm<ManufacturerFormValues>({
    resolver: zodResolver(manufacturerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phoneNumber: "",
      address: "",
      city: "",
      country: "",
      postalCode: "",
      companyName: "",
      industry_registration: "",
      website: "",
    },
    mode: "onChange",
  });

  const { trigger } = form;
  const totalSteps = 3;

  const handleNext = async () => {
    let fieldsToValidate: (keyof ManufacturerFormValues)[] = [];

    if (step === 1) {
      fieldsToValidate = ["name", "email", "password", "confirmPassword"];
    } else if (step === 2) {
      fieldsToValidate = ["phoneNumber", "address", "city", "postalCode", "country"];
    } else if (step === 3) {
      fieldsToValidate = ["companyName", "industry_registration", "website"];
    }

    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      if (step === 3) {
        await form.handleSubmit(onSubmit)();
      } else {
        setStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const onSubmit = async (data: ManufacturerFormValues) => {
    setIsLoading(true);
    setServerError("");

    try {
      const redirectPath = await register({
        ...data,
        role: "manufacturer",
      });
      router.push(redirectPath);
    } catch (err: any) {
      setServerError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Partner With Us"
      subtitle="Join the leading supply chain integrity network to secure your product authenticity."
    >
      <div className="flex flex-col space-y-2 text-center mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Corporate Application
        </h1>
        <p className="text-sm text-muted-foreground">
          Step {step} of {totalSteps}: {step === 1 ? "Admin Contact" : step === 2 ? "Office Address" : "Business Details"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Full Name</FormLabel>
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
                    <FormLabel>Corporate Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@company.com" {...field} />
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
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corporate Phone Number</FormLabel>
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
                    <FormLabel>Headquarters Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Pharma Blvd" {...field} />
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
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
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
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs">
                  Company Verification Requirements
                </span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registered Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Pfizer Inc." {...field} />
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
                    <FormLabel>Medical License or Tax ID</FormLabel>
                    <FormControl>
                      <Input placeholder="FDA-1234..." {...field} />
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
                    <FormLabel>Corporate Website</FormLabel>
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

            {step < totalSteps ? (
              <Button type="button" onClick={handleNext} className="w-full">
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Submitting Application..." : "Submit Application"}
              </Button>
            )}
          </div>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already approved?{" "}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Sign In
        </Link>
      </p>

      <p className="text-center text-sm text-muted-foreground mt-2">
        Not a manufacturer?{" "}
        <Link href="/register" className="text-primary font-semibold hover:underline">
          Customer Portal
        </Link>
      </p>
    </AuthLayout>
  );
}
