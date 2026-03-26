"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Check,
  Package,
  QrCode,
  Loader2,
  Search,
  ArrowLeft,
  ArrowRight,
  Zap,
  Wallet,
  Boxes,
  Plus,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createBatch } from "@/api/batch.api";
import { listProducts } from "@/api/product.api";
import { CategoryFilter } from "@/components/manufacturer/category-filter";
import { registerBatchOnChain } from "@/api/web3-client";
import { useWeb3 } from "@/contexts/web3-context";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media-url";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";

interface CatalogueProduct {
  _id: string;
  name: string;
  productId: string;
  category: string;
  brand: string;
  price: number;
  images: string[];
}

export default function CreateBatchWizard() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mintProgress, setMintProgress] = useState(0);
  const [successId, setSuccessId] = useState<string | null>(null);

  const {
    address: walletAddress,
    connect: connectWallet,
    status: walletStatus,
  } = useWeb3();
  const isConnecting = walletStatus === "connecting";

  // Data
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] =
    useState<CatalogueProduct | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const debouncedSearch = useDebounce(productSearch, 500);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Form
  const [batchData, setBatchData] = useState({
    batchNumber: "",
    quantity: "",
    manufactureDate: new Date() as Date | undefined,
    expiryDate: undefined as Date | undefined,
    description: "",
  });

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    setProductsLoading(true);
    listProducts({
      search: debouncedSearch,
      categories:
        selectedCategories.length > 0
          ? selectedCategories.join(",")
          : undefined,
    })
      .then((res) => {
        setProducts(res.products || []);
      })
      .catch((err) => console.error("Failed to load products", err))
      .finally(() => setProductsLoading(false));
  }, [debouncedSearch, selectedCategories]);

  const filteredProducts = products;

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    setMintProgress(20);

    try {
      if (!selectedProduct) throw new Error("No product template selected.");
      const encoder = new TextEncoder();
      const saltInput = `${selectedProduct.productId}-${batchData.batchNumber}-${Date.now()}-${crypto.getRandomValues(new Uint8Array(8)).join("")}`;
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(saltInput),
      );
      const batchSalt = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      setMintProgress(40);
      if (!walletAddress) throw new Error("Wallet disconnect detected.");

      setMintProgress(60);
      const txResult = await registerBatchOnChain(
        {
          productId: selectedProduct.productId,
          productName: selectedProduct.name,
          brand: selectedProduct.brand,
          batchNumber: batchData.batchNumber,
          batchSalt: batchSalt,
          manufactureDate: Math.floor(
            batchData.manufactureDate!.getTime() / 1000,
          ),
          expiryDate: batchData.expiryDate
            ? Math.floor(batchData.expiryDate.getTime() / 1000)
            : 0,
          quantity: parseInt(batchData.quantity),
        },
        walletAddress!,
      );

      setMintProgress(90);
      const savedBatch = await createBatch({
        productRef: selectedProduct._id,
        batchNumber: batchData.batchNumber,
        quantity: parseInt(batchData.quantity),
        manufactureDate: batchData.manufactureDate!.toISOString(),
        expiryDate: batchData.expiryDate
          ? batchData.expiryDate.toISOString()
          : undefined,
        description: batchData.description,
        batchSalt,
        blockchainHash: txResult.transactionHash || txResult.blockHash,
      });

      setMintProgress(100);
      setSuccessId(savedBatch.batch._id);
      toast.success("Batch created successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to create batch.");
      toast.error(err.message || "Cryptographic commit failed.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !selectedProduct) {
      toast.error("Please select a product template first.");
      return;
    }
    if (
      step === 2 &&
      (!batchData.batchNumber ||
        !batchData.quantity ||
        !batchData.manufactureDate ||
        !batchData.expiryDate)
    ) {
      toast.error("Please fill in all mandatory details.");
      return;
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const canGoToStep = (targetStep: number) => {
    if (targetStep <= step) return true;
    if (targetStep === 2) return selectedProduct !== null;
    if (targetStep === 3)
      return (
        selectedProduct !== null &&
        batchData.batchNumber !== "" &&
        batchData.quantity !== "" &&
        batchData.manufactureDate !== undefined &&
        batchData.expiryDate !== undefined
      );
    return false;
  };

  if (!walletAddress) {
    return (
      <div className="max-w-md mx-auto mt-20 animate-in fade-in zoom-in-95 duration-500">
        <Card className="p-8 text-center space-y-6">
          <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center relative">
            <Wallet className="h-10 w-10 text-primary" />
            <div className="absolute top-0 right-0 h-4 w-4 bg-destructive rounded-full" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              Wallet Connection Required
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              To enroll product batches, authenticate with a Web3 wallet to
              securely sign the transaction.
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
              <Link href="/manufacturer/batches">Cancel</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (successId) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <Card className="p-8 space-y-6 flex flex-col items-center">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
            <Check className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Batch Created</h1>
            <p className="text-muted-foreground mt-2">
              Batch {batchData.batchNumber} is now registered on the public
              ledger.
            </p>
          </div>
          <div className="flex flex-col w-full gap-3 pt-4 border-t border-border/40">
            <Button asChild className="w-full gap-2">
              <Link href={`/manufacturer/batches/${successId}`}>
                <QrCode className="h-4 w-4" /> Print Evidence Sheet
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/manufacturer/batches">Done</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 pb-20 animate-in fade-in flex-1 min-h-0">
      {/* Header & Steps */}
      <div className="flex items-center gap-4 px-1">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="rounded-full flex-shrink-0"
        >
          <Link href="/manufacturer/batches">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Create New Batch
          </h1>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {walletAddress.substring(0, 6)}...{walletAddress.substring(38)} •
            Connected
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
                    <h2 className="text-lg font-semibold">Select Product</h2>
                    <p className="text-sm text-muted-foreground">
                      Choose a template to base this batch on.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <CategoryFilter
                      selectedCategories={selectedCategories}
                      onCategoryChange={setSelectedCategories}
                      className="gap-2 px-3 shrink-0"
                      align="end"
                    />
                  </div>
                  <ScrollArea className="h-[250px] sm:h-[300px] border rounded-lg overflow-hidden bg-muted/20">
                    <div className="p-2 space-y-1">
                      {productsLoading ? (
                        <div className="flex h-32 items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="p-8 text-center space-y-4">
                          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Package className="h-6 w-6" />
                          </div>
                          <div className="max-w-[200px] mx-auto">
                            <p className="text-sm font-semibold">
                              No products found
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              You must create a product first before you can
                              initiate a production batch for it.
                            </p>
                          </div>
                          <Button asChild variant="outline" size="sm" className="gap-2">
                            <Link href="/manufacturer/products/new">
                              <Plus className="h-4 w-4" /> Add Product
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        filteredProducts.map((p) => (
                          <div
                            key={p._id}
                            onClick={() => setSelectedProduct(p)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                              selectedProduct?._id === p._id
                                ? "border-primary bg-primary/10"
                                : "border-transparent hover:bg-muted/50",
                            )}
                          >
                            <div className="h-10 w-10 rounded-md bg-muted overflow-hidden shrink-0 border border-border/50">
                              {p.images?.[0] ? (
                                <img
                                  src={resolveMediaUrl(p.images[0])}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-full h-full p-2 opacity-30" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate">
                                {p.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {p.productId}
                              </p>
                            </div>
                            {selectedProduct?._id === p._id && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold">Batch Details</h2>
                    <p className="text-sm text-muted-foreground">
                      Specify the production metrics.
                    </p>
                  </div>
                  {selectedProduct && (
                    <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border/50">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Target Template
                        </p>
                        <p className="font-semibold text-sm">
                          {selectedProduct.name}
                        </p>
                      </div>
                      <Badge variant="outline" className="opacity-70">
                        {selectedProduct.productId}
                      </Badge>
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Batch Number</Label>
                      <Input
                        placeholder="e.g. BATCH-001"
                        value={batchData.batchNumber}
                        onChange={(e) =>
                          setBatchData((prev) => ({
                            ...prev,
                            batchNumber: e.target.value,
                          }))
                        }
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity (Units)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 5000"
                        value={batchData.quantity}
                        onChange={(e) =>
                          setBatchData((prev) => ({
                            ...prev,
                            quantity: e.target.value,
                          }))
                        }
                      />
                    </div>

                    {/* V9 COMPATIBLE MANUFACTURE DATE */}
                    <div className="space-y-2 flex flex-col">
                      <Label className="mb-1">Manufacture Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !batchData.manufactureDate &&
                                "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {batchData.manufactureDate ? (
                              format(batchData.manufactureDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 overflow-hidden"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={batchData.manufactureDate}
                            onSelect={(date) =>
                              setBatchData((prev) => ({
                                ...prev,
                                manufactureDate: date,
                              }))
                            }
                            captionLayout="dropdown"
                            startMonth={new Date(2000, 0)}
                            endMonth={new Date(currentYear, 11)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* V9 COMPATIBLE EXPIRY DATE */}
                    <div className="space-y-2 flex flex-col">
                      <Label className="mb-1">Expiry Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !batchData.expiryDate && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {batchData.expiryDate ? (
                              format(batchData.expiryDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 overflow-hidden"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={batchData.expiryDate}
                            onSelect={(date) =>
                              setBatchData((prev) => ({
                                ...prev,
                                expiryDate: date,
                              }))
                            }
                            captionLayout="dropdown"
                            startMonth={new Date(currentYear - 5, 0)}
                            endMonth={new Date(currentYear + 20, 11)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold">Review & Submit</h2>
                    <p className="text-sm text-muted-foreground">
                      Verify the details before committing to the blockchain.
                    </p>
                  </div>

                  <div className="p-6 rounded-xl bg-muted/30 border border-border/50 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Product
                        </p>
                        <p className="text-sm font-medium">
                          {selectedProduct?.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Batch Number
                        </p>
                        <p className="text-sm font-medium">
                          {batchData.batchNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Quantity
                        </p>
                        <p className="text-sm font-medium">
                          {parseInt(batchData.quantity).toLocaleString()} Units
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Manufactured
                        </p>
                        <p className="text-sm font-medium">
                          {batchData.manufactureDate
                            ? format(batchData.manufactureDate, "PPP")
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/10 text-primary flex items-start gap-3">
                    <Boxes className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed">
                      By committing this batch, you authorize the generation of{" "}
                      {batchData.quantity || "0"} unique cryptographic
                      signatures. This action is permanently recorded on the
                      ledger.
                    </p>
                  </div>

                  {loading && (
                    <div className="space-y-2 pt-2">
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${mintProgress}%` }}
                          className="h-full bg-primary"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground font-medium">
                        <span>Writing to blockchain...</span>
                        <span>{mintProgress}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Bar */}
          <div className="flex justify-between items-center pt-8 mt-8 border-t border-border/40">
            {step > 1 ? (
              <Button variant="outline" onClick={prevStep} disabled={loading}>
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
                onClick={handleCreate}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {loading ? "Processing..." : "Create Batch"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
