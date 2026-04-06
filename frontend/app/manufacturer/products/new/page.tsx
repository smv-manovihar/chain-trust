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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProduct, getProduct, updateProduct } from "@/api/product.api";
import { uploadImages } from "@/api/upload.api";
import { resolveMediaUrl } from "@/lib/media-url";
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
import { useWizardPersistence } from "@/hooks/use-wizard-persistence";

export default function NewProductWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const {
    address: walletAddress,
    connect: connectWallet,
    status: walletStatus,
  } = useWeb3();
  const isConnecting = walletStatus === "connecting";

  // Form State with Persistence (FIX-003)
  const {
    wizardData: form,
    setWizardData: setForm,
    clearWizardPersistence,
    isWizardDataLoaded,
  } = useWizardPersistence(
    "ct_new_product_wizard",
    {
      name: "",
      productId: "",
      categories: [] as string[],
      brand: "",
      price: "",
      description: "",
      composition: "",
      unit: "pills",
      images: [] as File[],
      imageAccessLevel: "public" as
        | "public"
        | "verified_only"
        | "internal_only",
      customerVisibleImages: [] as number[],
    },
    {
      excludeFields: ["images"],
    },
  );

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);

  const syncWizardState = async (nextStep: number) => {
    if (!resumeId) return;
    try {
      await updateProduct(resumeId, {
        wizardState: {
          step: nextStep,
          form,
        },
      });
    } catch (err) {
      console.error("Failed to sync wizard state", err);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (id) {
      setResumeId(id);
      // Fetch pending product
      getProduct(id)
        .then((data) => {
          if (data.product && data.product.status === "pending") {
            const state = data.product.wizardState || {};
            if (state.form) {
              setForm(state.form);
            } else if (data.product) {
              updateForm({
                name: data.product.name,
                productId: data.product.productId,
                categories: data.product.categories || [],
                brand: data.product.brand,
                composition: data.product.composition || "",
                unit: data.product.unit || "pills",
              });
            }
            setStep(state.step || 1);
            toast.info("Resuming pending product catalog...");
          }
        })
        .catch((err) => console.error("Failed to resume product", err));
    }
  }, []);

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
    setSaving(true);
    try {
      let productIdToUpdate = resumeId;

      // Step 1: Create pending record if not already resuming
      if (!productIdToUpdate) {
        const pendingProduct = await createProduct({
          ...form,
          price: parseFloat(form.price) || 0,
          images: [], // No images yet
          status: "pending",
        });
        productIdToUpdate = pendingProduct.product._id;
        setResumeId(productIdToUpdate);
        window.history.replaceState(null, "", `?id=${productIdToUpdate}`);
      }

      // Step 2: Upload images
      let imageUrls: string[] = [];
      if (form.images.length > 0) {
        setUploading(true);
        imageUrls = await uploadImages(form.images);
        setUploading(false);
      }

      // Step 3: Finalize status
      await updateProduct(productIdToUpdate!, {
        ...form,
        price: parseFloat(form.price) || 0,
        status: "completed",
        images: imageUrls,
        wizardState: {}, // Clear state on success
      });

      toast.success("Product successfully registered.");
      clearWizardPersistence(); // FIX-003: Clear persistence on success
      window.history.replaceState(null, "", window.location.pathname);
      router.push("/manufacturer/products");
    } catch (err: any) {
      toast.error(
        err.message || "Failed to create product. You can resume later.",
      );
    } finally {
      setSaving(false);
    }
  };

  const [products, setProducts] = useState<any[]>([]);

  const canGoToStep = (targetStep: number) => {
    if (targetStep <= step) return true;
    if (targetStep === 2)
      return (
        form.name &&
        form.productId &&
        form.categories.length > 0 &&
        form.brand &&
        form.composition
      );
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

  const nextStep = async () => {
    if (step === 1) {
      if (
        !form.name ||
        !form.brand ||
        form.categories.length === 0 ||
        !form.composition ||
        !form.unit
      ) {
        toast.error("Please fill in basic details.");
        return;
      }

      // Step 1 -> 2: Initiate DB record (FIX-001)
      if (!resumeId) {
        try {
          const pending = await createProduct({
            name: form.name,
            brand: form.brand,
            categories: form.categories,
            composition: form.composition,
            unit: form.unit,
            status: "pending",
            wizardState: { step: 2, form },
          });
          const id = pending.product._id;
          setResumeId(id);
          window.history.replaceState(null, "", `?id=${id}`);
        } catch (err: any) {
          toast.error("Failed to initiate draft.");
          return;
        }
      }
    }

    const next = step + 1;
    setStep(next);
    syncWizardState(next);
  };

  const prevStep = () => {
    const prev = step - 1;
    setStep(prev);
    syncWizardState(prev);
  };

  if (!walletAddress) {
    return (
      <div className="max-w-md mx-auto mt-20 flex-1 min-h-0">
        <Card className="p-8 text-center space-y-6">
          <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center relative">
            <Wallet className="h-10 w-10 text-primary" aria-hidden="true" />
            <div className="absolute top-0 right-0 h-4 w-4 bg-destructive rounded-full" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              Wallet Connection Required
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              To enroll products on the ledger, you must authenticate with a
              Web3 wallet to sign the transaction.
            </p>
          </div>
          <div className="space-y-3 pt-4 border-t border-border/40">
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full gap-2 rounded-full h-11"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" aria-hidden="true" />
              )}
              Connect Wallet
            </Button>
            <Button
              variant="outline"
              asChild
              className="w-full rounded-full h-11"
            >
              <Link href="/manufacturer/products">Cancel</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 pb-20 flex-1 min-h-0">
      {/* Header & Progress */}
      <div className="flex items-center gap-4 px-1">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="rounded-full flex-shrink-0"
        >
          <Link href="/manufacturer/products">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Add New Product
          </h1>
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
          <Button
            key={i}
            variant="ghost"
            onClick={() => {
              if (canGoToStep(i)) setStep(i);
              else toast.error("Complete current phase first.");
            }}
            aria-label={`Go to Step ${i}`}
            className={cn(
              "h-1.5 p-0 flex-1 rounded-full transition-all duration-500 min-w-0 hover:bg-transparent",
              i <= step ? "bg-primary" : "bg-muted",
              canGoToStep(i)
                ? "cursor-pointer"
                : "cursor-not-allowed opacity-50",
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
                    <p className="text-sm text-muted-foreground">
                      Product Identity and Categorization
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Product Name</Label>
                      <Input
                        placeholder="e.g. Amoxicillin 500mg"
                        value={form.name}
                        onChange={(e) => updateForm({ name: e.target.value })}
                        className="rounded-full h-11"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Product ID (SKU/UPC)</Label>
                      <Input
                        placeholder="e.g. NDC-12345"
                        value={form.productId}
                        onChange={(e) =>
                          updateForm({ productId: e.target.value.toUpperCase() })
                        }
                        className="rounded-full h-11 font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Composition / Active Ingredients</Label>
                      <Input
                        placeholder="e.g. Paracetamol 500mg"
                        value={form.composition}
                        onChange={(e) =>
                          updateForm({ composition: e.target.value })
                        }
                        className="rounded-full h-11"
                      />
                    </div>
                    <div className="space-y-2 flex flex-col justify-end">
                      <Label className="mb-2">Categories</Label>
                      <CategoryFilter
                        selectedCategories={form.categories}
                        onCategoryChange={(cats) =>
                          updateForm({ categories: cats })
                        }
                        canManage={true}
                        placeholder="Select categories..."
                        className="w-full justify-between h-auto min-h-[44px] px-4 py-2 rounded-full border-border/40"
                        align="start"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Brand / manufacturer</Label>
                      <Input
                        placeholder="e.g. PharmaCorp"
                        value={form.brand}
                        onChange={(e) => updateForm({ brand: e.target.value })}
                        className="rounded-full h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Standard unit (Dose type)</Label>
                      <Select
                        value={form.unit}
                        onValueChange={(val) => updateForm({ unit: val })}
                      >
                        <SelectTrigger className="w-full h-11 rounded-full px-4">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tablets">Tablets</SelectItem>
                          <SelectItem value="capsules">Capsules</SelectItem>
                          <SelectItem value="pills">Pills</SelectItem>
                          <SelectItem value="mg">mg</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="doses">Doses</SelectItem>
                          <SelectItem value="units">Units</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold">Specifications</h2>
                    <p className="text-sm text-muted-foreground">
                      Pricing and descriptive protocol
                    </p>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2 sm:w-1/2">
                      <Label>Price (USDT equivalent)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={form.price}
                        onChange={(e) => updateForm({ price: e.target.value })}
                        className="rounded-full h-11"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Enter formulation details, dosage instructions..."
                        value={form.description}
                        onChange={(e) =>
                          updateForm({ description: e.target.value })
                        }
                        className="min-h-[160px] resize-none rounded-[1.5rem] p-4 shadow-inner"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold">Visual Identity</h2>
                    <p className="text-sm text-muted-foreground">
                      Upload product packaging imagery
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {form.images.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-lg overflow-hidden group border border-border"
                      >
                        <img
                          src={
                            typeof file === "string"
                              ? resolveMediaUrl(file)
                              : URL.createObjectURL(file)
                          }
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-destructive"
                          aria-label="Remove image"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => {
                            const isVisible =
                              form.customerVisibleImages.includes(idx);
                            updateForm({
                              customerVisibleImages: isVisible
                                ? form.customerVisibleImages.filter(
                                    (i) => i !== idx,
                                  )
                                : [...form.customerVisibleImages, idx],
                            });
                          }}
                          className={cn(
                            "absolute bottom-2 right-2 p-1.5 rounded-full transition-all border",
                            form.customerVisibleImages.includes(idx)
                              ? "bg-primary text-white border-primary"
                              : "bg-black/60 text-white/70 border-white/20 hover:bg-black/80",
                          )}
                          title={
                            form.customerVisibleImages.includes(idx)
                              ? "Visible to Customers"
                              : "Hidden from Customers"
                          }
                        >
                          {form.customerVisibleImages.includes(idx) ? (
                            <Check className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    ))}
                    <Label
                      htmlFor="img-up"
                      className={cn(
                        "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors",
                        uploading && "opacity-50 pointer-events-none",
                      )}
                    >
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <Plus className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                      )}
                      <span className="text-xs text-muted-foreground mt-2 font-medium">
                        Upload
                      </span>
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

                  <div className="space-y-4 pt-4 border-t border-border/40">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <Label className="text-sm font-bold">
                          Image Access Level
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Control who can view these product images
                        </p>
                      </div>
                      <div className="flex bg-muted/50 p-1.5 rounded-full border border-border/50 w-full sm:w-auto">
                        {(
                          ["public", "verified_only", "internal_only"] as const
                        ).map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() =>
                              updateForm({ imageAccessLevel: level })
                            }
                            className={cn(
                              "px-4 py-2 text-[10px] font-bold rounded-full transition-all flex-1 sm:flex-none",
                              form.imageAccessLevel === level
                                ? "bg-background text-primary shadow-sm border border-border/50"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {level.replace("_", " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 text-muted-foreground">
                    <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-sm">
                      Provide high-quality images. Consumers use these
                      specifically to verify physical authenticity against real
                      packaging.
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
                className="rounded-full h-10 px-8"
              >
                Back
              </Button>
            ) : (
              <div /> // Spacer
            )}

            {step < 3 ? (
              <Button
                onClick={nextStep}
                className="gap-2 rounded-full h-10 px-8"
              >
                Next <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 rounded-full h-10 px-8"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {saving ? "Saving..." : "Create Product"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
