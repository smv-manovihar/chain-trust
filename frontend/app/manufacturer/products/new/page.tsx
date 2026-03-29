"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  X,
  Check,
  ArrowLeft,
  ChevronsUpDown,
  Zap,
  Wallet,
  ShieldAlert,
  Plus,
  Save,
  ArrowRight,
  PlusCircle,
} from "lucide-react";
import { createProduct } from "@/api/product.api";
import { uploadImages } from "@/api/upload.api";
import { toast } from "sonner";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { fetchCategories, Category } from "@/api/category.api";
import { CategoryFilter } from "@/components/manufacturer/category-filter";
import { requestExecutionAccounts } from "@/api/web3-client";
import { useWeb3 } from "@/contexts/web3-context";
import { motion, AnimatePresence } from "framer-motion";

export default function NewProductWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const {
    address: walletAddress,
    connect: connectWallet,
    status: walletStatus,
  } = useWeb3();
  const isConnecting = walletStatus === "connecting";

  // Form State
  const [form, setForm] = useState({
    name: "",
    productId: "",
    categories: [] as string[],
    brand: "",
    price: "",
    description: "",
    composition: "",
    images: [] as File[],
    customerVisibleImages: [] as number[],
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const updateForm = (updates: Partial<typeof form>) =>
    setForm((f) => ({ ...f, ...updates }));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    updateForm({ images: [...form.images, ...files] });
  };

  const removeImage = (index: number) => {
    updateForm({ images: form.images.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!walletAddress) {
      toast.error("Wallet connection required.");
      return;
    }
    setSaving(true);
    try {
      let imageUrls: string[] = [];
      if (form.images.length > 0) {
        setUploading(true);
        imageUrls = await uploadImages(form.images);
        setUploading(false);
      }

      await createProduct({
        ...form,
        price: parseFloat(form.price) || 0,
        images: imageUrls,
        customerVisibleImages: form.customerVisibleImages,
      });

      toast.success("Product created successfully.");
      router.push("/manufacturer/products");
    } catch (err: any) {
      toast.error(err.message || "Failed to create product.");
    } finally {
      setSaving(false);
    }
  };

  const [products, setProducts] = useState<any[]>([]);

  const canGoToStep = (targetStep: number) => {
    if (targetStep <= step) return true;
    if (targetStep === 2)
      return form.name && form.productId && form.categories.length > 0 && form.brand && form.composition;
    if (targetStep === 3)
      return (
        form.name &&
        form.productId &&
        form.categories.length > 0 &&
        form.brand &&
        form.price &&
        form.description
      );
    return false;
  };

  const nextStep = () => {
    if (step === 1 && (!form.name || !form.productId || form.categories.length === 0 || !form.brand || !form.composition)) {
      toast.error("Please fill in all basic details.");
      return;
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  if (!walletAddress) {
    return (
      <div className="max-w-md mx-auto mt-20 animate-in fade-in zoom-in-95 duration-500 flex-1 min-h-0">
        <Card className="p-8 text-center space-y-6">
          <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center relative">
            <Wallet className="h-10 w-10 text-primary" />
            <div className="absolute top-0 right-0 h-4 w-4 bg-destructive rounded-full" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Wallet Connection Required</h2>
            <p className="text-sm text-muted-foreground mt-2">
              To enroll products on the ledger, you must authenticate with a Web3 wallet to sign the transaction.
            </p>
          </div>
          <div className="space-y-3 pt-4 border-t border-border/40">
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full gap-2"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Connect Wallet
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/manufacturer/products">Cancel</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 pb-20 animate-in fade-in flex-1 min-h-0">
      {/* Header & Progress */}
      <div className="flex items-center gap-4 px-1">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="rounded-full flex-shrink-0"
        >
          <Link href="/manufacturer/products">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Add New Product</h1>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {walletAddress.substring(0, 6)}...{walletAddress.substring(38)} • Connected
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">Step</p>
          <p className="text-xl font-medium">
            {step} <span className="text-muted-foreground opacity-50">/ 3</span>
          </p>
        </div>
      </div>

      <div className="flex gap-2 px-1">
        {[1, 2, 3].map((i) => (
          <button
            key={i}
            onClick={() => {
              if (canGoToStep(i)) setStep(i);
              else toast.error("Complete current phase first.");
            }}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-500",
              i <= step ? "bg-primary" : "bg-muted",
              canGoToStep(i) ? "cursor-pointer" : "cursor-not-allowed opacity-50"
            )}
          />
        ))}
      </div>

      <Card className="overflow-hidden border-border/40 shadow-sm">
        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold">Basic Details</h2>
                    <p className="text-sm text-muted-foreground">Product identity and categorization</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Product Name</Label>
                      <Input
                        placeholder="e.g. Amoxicillin 500mg"
                        value={form.name}
                        onChange={(e) => updateForm({ name: e.target.value })}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Product ID (SKU/UPC)</Label>
                      <Input
                        placeholder="e.g. NDC-12345"
                        value={form.productId}
                        onChange={(e) => updateForm({ productId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Composition / Active Ingredients</Label>
                      <Input
                        placeholder="e.g. Paracetamol 500mg"
                        value={form.composition}
                        onChange={(e) => updateForm({ composition: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 flex flex-col justify-end">
                      <Label className="mb-2">Categories</Label>
                      <CategoryFilter
                        selectedCategories={form.categories}
                        onCategoryChange={(cats) => updateForm({ categories: cats })}
                        canManage={true}
                        placeholder="Select categories..."
                        className="w-full justify-between h-auto min-h-[40px] px-3 py-2 rounded-md"
                        align="start"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Brand / Manufacturer</Label>
                      <Input
                        placeholder="e.g. PharmaCorp"
                        value={form.brand}
                        onChange={(e) => updateForm({ brand: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold">Specifications</h2>
                    <p className="text-sm text-muted-foreground">Pricing and descriptive protocol</p>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2 sm:w-1/2">
                      <Label>Price (USDT Equivalent)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={form.price}
                        onChange={(e) => updateForm({ price: e.target.value })}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Enter formulation details, dosage instructions..."
                        value={form.description}
                        onChange={(e) => updateForm({ description: e.target.value })}
                        className="min-h-[160px] resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold">Visual Identity</h2>
                    <p className="text-sm text-muted-foreground">Upload product packaging imagery</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {form.images.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-lg overflow-hidden group border border-border"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            const isVisible = form.customerVisibleImages.includes(idx);
                            updateForm({
                              customerVisibleImages: isVisible
                                ? form.customerVisibleImages.filter(i => i !== idx)
                                : [...form.customerVisibleImages, idx]
                            });
                          }}
                          className={cn(
                            "absolute bottom-2 right-2 p-1.5 rounded-full transition-all border",
                            form.customerVisibleImages.includes(idx)
                              ? "bg-primary text-white border-primary"
                              : "bg-black/60 text-white/70 border-white/20 hover:bg-black/80"
                          )}
                          title={form.customerVisibleImages.includes(idx) ? "Visible to Customers" : "Hidden from Customers"}
                        >
                          {form.customerVisibleImages.includes(idx) ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <ShieldAlert className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))}
                    <Label
                      htmlFor="img-up"
                      className={cn(
                        "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors",
                        uploading && "opacity-50 pointer-events-none"
                      )}
                    >
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <Plus className="h-6 w-6 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground mt-2 font-medium">Upload</span>
                      <input
                        id="img-up"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </Label>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 text-muted-foreground">
                    <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                    <p className="text-sm">
                      Provide high-quality images. Consumers use these specifically to verify physical authenticity against real packaging.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Bar */}
          <div className="flex justify-between items-center pt-8 mt-8 border-t border-border/40">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={prevStep}
              >
                Back
              </Button>
            ) : (
              <div /> // Spacer
            )}

            {step < 3 ? (
              <Button onClick={nextStep} className="gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Create Product"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
