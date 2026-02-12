"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight,
  ChevronLeft,
  Upload,
  Check,
  Package,
  Calendar,
  FileText,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AddProductPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const steps = [
    { number: 1, title: "Basic Info", icon: Package },
    { number: 2, title: "Batch Details", icon: Calendar },
    { number: 3, title: "Documentation", icon: FileText },
    { number: 4, title: "Review", icon: Check },
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Add New Product</h1>
        <p className="text-muted-foreground">
          Register a new pharmaceutical product or batch
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted -z-10" />
          <div
            className="absolute left-0 top-1/2 h-0.5 bg-primary -z-10 transition-all duration-500"
            style={{
              width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
            }}
          />

          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep >= step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div
                key={step.number}
                className="flex flex-col items-center gap-2 bg-background px-2"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted text-muted-foreground bg-background",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors duration-300 hidden md:block",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <Card className="p-6 md:p-8 border border-border min-h-[400px]">
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Package className="text-primary h-5 w-5" />
              Basic Information
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="productName">Product Name</Label>
                <Input id="productName" placeholder="e.g. Amoxicillin 500mg" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Product Code</Label>
                <Input id="sku" placeholder="e.g. AMOX-500-001" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="antibiotics">Antibiotics</SelectItem>
                    <SelectItem value="pain-relief">Pain Relief</SelectItem>
                    <SelectItem value="supplements">Supplements</SelectItem>
                    <SelectItem value="chronic">Chronic Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dosage">Dosage Form</Label>
                <Select>
                  <SelectTrigger id="dosage">
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="capsule">Capsule</SelectItem>
                    <SelectItem value="liquid">Liquid/Syrup</SelectItem>
                    <SelectItem value="injection">Injection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Additional product details..."
                  className="h-24"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="text-primary h-5 w-5" />
              Batch Information
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="batchNumber">Batch Number</Label>
                <Input
                  id="batchNumber"
                  placeholder="Generated Automatically"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Will be assigned upon creation
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity (Units)</Label>
                <Input id="quantity" type="number" placeholder="e.g. 50000" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfgDate">Manufacturing Date</Label>
                <Input id="mfgDate" type="date" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expDate">Expiration Date</Label>
                <Input id="expDate" type="date" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location">Manufacturing Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Plant A, Sector 4, Mumbai"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="text-primary h-5 w-5" />
              Compliance & Documentation
            </h2>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">
                  Upload Lab Results
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Drag and drop your PDF test reports here, or click to browse.
                  Required for quality assurance.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 border rounded-md p-4 bg-muted/20">
                  <input
                    type="checkbox"
                    id="gmp"
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="gmp" className="cursor-pointer">
                    GMP Certified
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-md p-4 bg-muted/20">
                  <input
                    type="checkbox"
                    id="fda"
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="fda" className="cursor-pointer">
                    FDA Approved
                  </Label>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Check className="text-primary h-5 w-5" />
              Review & Submit
            </h2>

            <div className="bg-muted/30 p-4 rounded-lg space-y-4 border border-border">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-medium">Amoxicillin 500mg</span>

                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">Antibiotics</span>

                <span className="text-muted-foreground">Batch Size:</span>
                <span className="font-medium">50,000 Units</span>

                <span className="text-muted-foreground">Mfg Date:</span>
                <span className="font-medium">2024-02-14</span>

                <span className="text-muted-foreground">Exp Date:</span>
                <span className="font-medium">2026-02-14</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 bg-yellow-500/10 text-yellow-600 rounded-lg text-sm">
              <div className="h-2 w-2 rounded-full bg-yellow-500 flex-shrink-0" />
              <p>
                This action will generate unique blockchain hashes for all
                units. This process requires gas fees and cannot be undone.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>

        {currentStep < totalSteps ? (
          <Button onClick={handleNext} className="gap-2">
            Next Step <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => alert("Product submitting...")}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Save className="h-4 w-4" /> Register Batch
          </Button>
        )}
      </div>
    </div>
  );
}
