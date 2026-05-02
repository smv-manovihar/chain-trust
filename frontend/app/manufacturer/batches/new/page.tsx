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
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createBatch,
  getBatch,
  updateBatch,
  deleteBatch,
} from "@/api/batch.api";
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
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";
import { hashSHA256 } from "@/lib/crypto-utils";
import { useWizardPersistence } from "@/hooks/use-wizard-persistence";

interface CatalogueProduct {
  _id: string;
  name: string;
  productId: string;
  category: string;
  brand: string;
  price: number;
  images: string[];
}

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function CreateBatchWizard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(() => {
    const s = searchParams.get("step");
    return s ? parseInt(s) : 1;
  });

  // Sync step to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", step.toString());
    const queryString = params.toString();
    if (queryString !== searchParams.toString()) {
      router.replace(`${pathname}?${queryString}`, { scroll: false });
    }
  }, [step, pathname, router, searchParams]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [txInFlight, setTxInFlight] = useState(false);
  const [registerProgress, setRegisterProgress] = useState(0);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  const {
    address: walletAddress,
    connect: connectWallet,
    status: walletStatus,
  } = useWeb3();
  const isConnecting = walletStatus === "connecting";

  // Data
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  // Form States with Persistence (FIX-003)
  const {
    wizardData: selectedProduct,
    setWizardData: setSelectedProduct,
    clearWizardPersistence: clearProductPersistence,
  } = useWizardPersistence<CatalogueProduct | null>(
    "ct_new_batch_product",
    null,
  );

  const [productSearch, setProductSearch] = useState("");
  const debouncedSearch = useDebounce(productSearch, 500);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const {
    wizardData: batchData,
    setWizardData: setBatchData,
    clearWizardPersistence: clearBatchPersistence,
  } = useWizardPersistence(
    "ct_new_batch_data",
    {
      batchNumber: "",
      quantity: "",
      manufactureDate: new Date() as Date | undefined,
      expiryDate: undefined as Date | undefined,
      description: "",
    },
    {
      onLoad: (data) => {
        if (data.manufactureDate)
          data.manufactureDate = new Date(data.manufactureDate);
        if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);
      },
    },
  );

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

  const syncWizardState = async (nextStep: number) => {
    if (!resumeId) return;
    try {
      await updateBatch(resumeId, {
        wizardState: {
          step: nextStep,
          selectedProduct,
          batchData,
        },
      });
    } catch (err) {
      console.error("Failed to sync wizard state", err);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (id && !successId) {
      setResumeId(id);
      setResumeLoading(true);
      // Fetch the pending batch to populate form using standardized API client
      getBatch(id)
        .then((data) => {
          if (data.batch && data.batch.status === "pending") {
            const state = data.batch.wizardState || {};
            if (state.selectedProduct)
              setSelectedProduct(state.selectedProduct);
            if (state.batchData) {
              const bd = state.batchData;
              setBatchData({
                ...bd,
                manufactureDate: bd.manufactureDate
                  ? new Date(bd.manufactureDate)
                  : undefined,
                expiryDate: bd.expiryDate ? new Date(bd.expiryDate) : undefined,
              });
            }
            setStep(state.step || 1);
            toast.info("Resuming pending enrollment...");
          }
        })
        .catch((err) => console.error("Failed to resume batch", err))
        .finally(() => setResumeLoading(false));
    }
  }, []);

  const filteredProducts = products;

  const handleCreate = async () => {
    if (txInFlight && !error) return;
    setLoading(true);
    setTxInFlight(true);
    setError("");
    setRegisterProgress(10);

    try {
      if (!selectedProduct) throw new Error("No product template selected.");

      let batchId = resumeId;
      let targetSalt = "";

      // Step 1: Prepare salt (re-deriving or fetching)
      if (!resumeId) {
        // This case should ideally not happen now with early initiation,
        // but kept as fallback.
        const saltInput = `${selectedProduct.productId}-${batchData.batchNumber}-${Date.now()}-${crypto.getRandomValues(new Uint8Array(8)).join("")}`;
        targetSalt = hashSHA256(saltInput);
      } else {
        // We have a draft, we need a salt. Let's generate it now if it's the final commit
        const saltInput = `${selectedProduct.productId}-${batchData.batchNumber}-${Date.now()}-${crypto.getRandomValues(new Uint8Array(8)).join("")}`;
        targetSalt = hashSHA256(saltInput);

        // Update the draft with full details before blockchain
        await updateBatch(resumeId, {
          ...batchData,
          manufactureDate: batchData.manufactureDate ? new Date(batchData.manufactureDate).toISOString() : undefined,
          expiryDate: batchData.expiryDate ? new Date(batchData.expiryDate).toISOString() : undefined,
          quantity: parseInt(batchData.quantity),
          batchSalt: targetSalt,
        });
      }

      setRegisterProgress(40);
      if (!walletAddress) {
        setLoading(false);
        return connectWallet();
      }

      // Step 2: Blockchain Transaction
      setRegisterProgress(60);
      const txResult = await registerBatchOnChain(
        {
          productId: selectedProduct.productId,
          productName: selectedProduct.name,
          brand: selectedProduct.brand,
          batchNumber: batchData.batchNumber,
          batchSalt: targetSalt,
          manufactureDate: Math.floor(
            new Date(batchData.manufactureDate!).getTime() / 1000,
          ),
          expiryDate: batchData.expiryDate
            ? Math.floor(new Date(batchData.expiryDate).getTime() / 1000)
            : 0,
          quantity: parseInt(batchData.quantity),
        },
        walletAddress!,
      );

      // Step 3: Finalize status in backend
      setRegisterProgress(90);
      await updateBatch(batchId!, {
        status: "completed",
        blockchainHash: txResult.transactionHash || txResult.blockHash,
        wizardState: {}, // Clear wizard state on success
      });

      setRegisterProgress(100);
      setSuccessId(batchId!);
      toast.success("Batch successfully committed to blockchain.");

      // FIX-003: Clear persistence on success
      clearProductPersistence();
      clearBatchPersistence();

      // Clean up the resume query
      window.history.replaceState(null, "", window.location.pathname);
      setTxInFlight(false);
    } catch (err: any) {
      // MetaMask User Denied Transaction (Code 4001) or other cancellations
      if (err.code === 4001 || err.message?.toLowerCase().includes("user denied")) {
        setError("Transaction cancelled by user.");
        toast.info("Transaction cancelled.");
        setTxInFlight(false); // Allow immediate retry
      } else if (err.message?.toLowerCase().includes("timeout")) {
        // Unexpected RPC or provider timeout
        setError("Blockchain connection timed out. Please check your wallet's activity before retrying.");
        toast.warning("Connection timeout. Verify status in your wallet.");
      } else {
        setError(err.message || "Failed to create batch.");
        toast.error(err.message || "Enrollment suspended. You can resume later.");
        setTxInFlight(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      if (resumeId) {
        await deleteBatch(resumeId);
      }
      toast.success("Batch draft discarded.");
      clearProductPersistence();
      clearBatchPersistence();
      router.push("/manufacturer/batches");
    } catch (err: any) {
      toast.error("Failed to discard draft.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    if (step === 1) {
      if (!selectedProduct) {
        toast.error("Please select a product template first.");
        return;
      }

      // Step 1 -> 2: Initiate DB record (FIX-001)
      if (!resumeId) {
        try {
          const pendingBatch = await createBatch({
            productRef: selectedProduct._id,
            status: "pending",
            wizardState: { step: 2, selectedProduct },
          });
          const id = pendingBatch.batch._id;
          setResumeId(id);
          window.history.replaceState(null, "", `?id=${id}`);
        } catch (err: any) {
          toast.error("Failed to initiate draft.");
          return;
        }
      }
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

    const next = step + 1;
    setStep(next);
    syncWizardState(next);
  };

  const prevStep = () => {
    const prev = step - 1;
    setStep(prev);
    syncWizardState(prev);
  };

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
      <div className="max-w-md mx-auto mt-20">
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
              To enroll product batches, authenticate with a Web3 wallet to
              securely sign the transaction.
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
              <Link href="/manufacturer/batches">Cancel</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (successId) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6">
        <Card className="p-8 space-y-6 flex flex-col items-center">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
            <Check className="h-10 w-10" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Batch Created</h1>
            <p className="text-muted-foreground mt-2">
              Batch {batchData.batchNumber} is now registered on the public
              ledger.
            </p>
          </div>
          <div className="flex flex-col w-full gap-3 pt-4 border-t border-border/40">
            <Button asChild className="w-full gap-2 rounded-full h-11">
              <Link href={`/manufacturer/batches/${successId}`}>
                <QrCode className="h-4 w-4" aria-hidden="true" /> Print Evidence
                Sheet
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="w-full rounded-full h-11"
            >
              <Link href="/manufacturer/batches">Done</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 pb-20 flex-1 min-h-0">
      {/* Header & Steps */}
      <div className="flex items-center gap-4 px-1">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="rounded-full flex-shrink-0 active:scale-95 transition-all"
        >
          <Link href="/manufacturer/batches">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Create New Batch
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
                    <h2 className="text-lg font-semibold">Select Product</h2>
                    <p className="text-sm text-muted-foreground">
                      Target medical SKU for this production run
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-10 h-11 rounded-full"
                      />
                    </div>
                    <CategoryFilter
                      selectedCategories={selectedCategories}
                      onCategoryChange={setSelectedCategories}
                      className="gap-2 px-3 shrink-0 rounded-full h-11"
                      align="end"
                    />
                  </div>
                  <ScrollArea className="h-[250px] sm:h-[300px] border rounded-lg overflow-hidden bg-muted/20">
                    <div className="p-2 space-y-1">
                      {productsLoading ? (
                        <div className="flex h-32 items-center justify-center">
                          <Loader2
                            className="h-6 w-6 animate-spin text-muted-foreground"
                            aria-hidden="true"
                          />
                        </div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="p-8 text-center space-y-4">
                          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Package className="h-6 w-6" aria-hidden="true" />
                          </div>
                          <div className="max-w-[200px] mx-auto">
                            <p className="text-sm font-semibold">
                              No Products Found
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              You must create a product first before you can
                              initiate a production batch for it.
                            </p>
                          </div>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="gap-2 rounded-full active:scale-95 transition-all"
                          >
                            <Link href="/manufacturer/products/new">
                              <Plus className="h-4 w-4" aria-hidden="true" />{" "}
                              Add Product
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
                                <Package
                                  className="w-full h-full p-2 opacity-30"
                                  aria-hidden="true"
                                />
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
                              <Check
                                className="h-4 w-4 text-primary shrink-0"
                                aria-hidden="true"
                              />
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
                    <h2 className="text-lg font-semibold">Batch Metadata</h2>
                    <p className="text-sm text-muted-foreground">
                      Production run identifiers and regulatory dates
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
                        className="rounded-full h-11"
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
                        className="rounded-full h-11"
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
                              "w-full justify-start text-left font-normal h-11 rounded-full",
                              !batchData.manufactureDate &&
                                "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                            {batchData.manufactureDate ? (
                              format(new Date(batchData.manufactureDate), "PPP")
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
                              "w-full justify-start text-left font-normal h-11 rounded-full",
                              !batchData.expiryDate && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                            {batchData.expiryDate ? (
                              format(new Date(batchData.expiryDate), "PPP")
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
                    <h2 className="text-lg font-semibold">
                      Blockchain Deployment
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Secure cryptographic enrollment on the public ledger
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
                          Batch number
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
                          {batchData.quantity
                            ? parseInt(batchData.quantity).toLocaleString()
                            : "—"}{" "}
                          Units
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Manufactured
                        </p>
                        <p className="text-sm font-medium">
                          {batchData.manufactureDate
                            ? format(new Date(batchData.manufactureDate), "PPP")
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/10 text-primary flex items-start gap-3">
                    <Boxes
                      className="h-5 w-5 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
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
                          animate={{ width: `${registerProgress}%` }}
                          className="h-full bg-primary"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground font-medium">
                        <span>Writing to blockchain...</span>
                        <span>{registerProgress}%</span>
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
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={loading}
                className="rounded-full h-10 px-6 active:scale-95 transition-all"
              >
                Back
              </Button>
            ) : (
              <div /> // Spacer
            )}

            <div className="flex items-center gap-3">
              {resumeId && !successId && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      disabled={loading}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full h-10 px-4 active:scale-95 transition-all"
                    >
                      Cancel Draft
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl border-border/40">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Discard Batch Draft?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your work on this batch
                        run. This action is irreversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full">
                        Continue Editing
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancel}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
                      >
                        Discard Draft
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {step < 3 ? (
                <Button
                  onClick={nextStep}
                  className="gap-2 rounded-full h-10 px-8 active:scale-95 transition-all"
                >
                  Next <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={loading || (txInFlight && !error)}
                  className={cn(
                    "gap-2 rounded-full h-10 px-8 active:scale-95 transition-all",
                    txInFlight && error && "bg-amber-500 hover:bg-amber-600",
                  )}
                >
                  {loading ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : txInFlight && error ? (
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  )}
                  {loading
                    ? "Processing..."
                    : txInFlight && error
                      ? "Retry (Check Wallet)"
                      : "Create Batch"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
