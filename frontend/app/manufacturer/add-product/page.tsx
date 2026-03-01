"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Check,
  Package,
  Calendar,
  Image as ImageIcon,
  Save,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getContract, requestExecutionAccounts } from "@/api/web3-client";
import { uploadImages } from "@/api/upload.api";

export default function AddProductPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form State
  const [productName, setProductName] = useState("");
  const [manufacturerName, setManufacturerName] = useState(""); // ideally from user context
  const [quantity, setQuantity] = useState("");
  const [batchId, setBatchId] = useState(
    `BATCH-${Math.floor(Math.random() * 100000)}`,
  );

  // Image State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const steps = [
    { number: 1, title: "Basic Info", icon: Package },
    { number: 2, title: "Batch Details", icon: Calendar },
    { number: 3, title: "Product Images", icon: ImageIcon },
    { number: 4, title: "Review & Mint", icon: Check },
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 5); // Max 5 images
      setSelectedFiles(files);

      // Cleanup old previews
      previewUrls.forEach((url) => URL.revokeObjectURL(url));

      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setPreviewUrls(newPreviews);
    }
  };

  const handleRegisterBatch = async () => {
    if (!productName || !manufacturerName) {
      setError("Please fill all required fields before submitting.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Upload images to Backend
      const uploadedUrls = await uploadImages(selectedFiles);

      // 2. Interact with Smart Contract
      const accounts = await requestExecutionAccounts();
      if (!accounts || accounts.length === 0)
        throw new Error("No MetaMask accounts found or access denied.");
      const deployer = accounts[0];

      // Convert variables for Smart Contract types
      const numericProductId = Math.floor(
        Math.random() * 1000000000000,
      ).toString();
      const numericBatchNum = batchId.replace(/\D/g, ""); // strip non-numeric
      const nowMs = Math.floor(Date.now() / 1000);

      const { generateSalt, addProductOnChain } =
        await import("@/api/web3-client");
      const saltValue = await generateSalt(numericProductId, manufacturerName);

      const txResult: any = await addProductOnChain(
        {
          name: productName,
          category: "Pharmaceutical",
          brand: manufacturerName,
          productId: numericProductId,
          manufactureDate: nowMs,
          batchNumber: numericBatchNum,
          price: 0,
          saltValue: saltValue,
          imageUrls: uploadedUrls,
        },
        deployer,
      );

      // 3. Send to Backend
      const txHash = txResult.transactionHash || txResult.blockHash;
      await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productName,
          brand: manufacturerName,
          productId: numericProductId,
          price: 0,
          category: "Pharmaceutical",
          batchNumber: numericBatchNum,
          manufactureDate: new Date(nowMs * 1000).toISOString(),
          description: "",
          saltValue,
          blockchainHash: txHash,
        }),
      });

      setSuccess(true);
      setCurrentStep(totalSteps + 1); // Success state
    } catch (err: any) {
      console.error("Failed to register batch:", err);
      setError(err.message || "An error occurred during submission.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-4xl mx-auto w-full text-center space-y-6 pt-12">
        <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <Check className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          Batch Successfully Registered!
        </h1>
        <p className="text-muted-foreground">
          Your new batch <strong>{batchId}</strong> has been minted and secured
          on the blockchain.
        </p>
        <Button onClick={() => window.location.reload()}>
          Register Another Batch
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Add New Product</h1>
        <p className="text-muted-foreground">
          Register a new pharmaceutical product or batch securely on the
          blockchain.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-md bg-destructive/10 text-destructive flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

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
                <Label htmlFor="productName">Product Name *</Label>
                <Input
                  id="productName"
                  placeholder="e.g. Amoxicillin 500mg"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturerName">Manufacturer Name *</Label>
                <Input
                  id="manufacturerName"
                  placeholder="e.g. PharmaCorp Inc."
                  value={manufacturerName}
                  onChange={(e) => setManufacturerName(e.target.value)}
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
                <Label htmlFor="batchNumber">Batch ID</Label>
                <Input id="batchNumber" value={batchId} disabled />
                <p className="text-xs text-muted-foreground">
                  Auto-generated blockchain identifier.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity (Units)</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="e.g. 50000"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ImageIcon className="text-primary h-5 w-5" />
              Product Photographs
            </h2>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <ImageIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">
                  Upload Physical Images
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Take clear pictures of the product from multiple angles. Max 5
                  images.
                </p>
              </div>

              {previewUrls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-4">
                  {previewUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-md overflow-hidden border border-border"
                    >
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ))}
                </div>
              )}
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
                <span className="font-medium">
                  {productName || "Not Provided"}
                </span>

                <span className="text-muted-foreground">Manufacturer:</span>
                <span className="font-medium">
                  {manufacturerName || "Not Provided"}
                </span>

                <span className="text-muted-foreground">Batch ID:</span>
                <span className="font-medium">{batchId}</span>

                <span className="text-muted-foreground">Images:</span>
                <span className="font-medium">
                  {selectedFiles.length} Selected
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 bg-yellow-500/10 text-yellow-600 rounded-lg text-sm border border-yellow-500/20">
              <div className="h-2 w-2 rounded-full bg-yellow-500 flex-shrink-0" />
              <p>
                This action requires a signature from MetaMask. The event will
                be permanently recorded on the blockchain.
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
          disabled={currentStep === 1 || loading}
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
            onClick={handleRegisterBatch}
            disabled={loading}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? "Minting to Blockchain..." : "Register Batch"}
          </Button>
        )}
      </div>
    </div>
  );
}
