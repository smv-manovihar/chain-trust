"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  Package,
  Calendar,
  QrCode,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Search,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createBatch } from "@/api/batch.api";
import { listProducts } from "@/api/product.api";
import { getContract, requestExecutionAccounts } from "@/api/web3-client";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media-url";

interface CatalogueProduct {
  _id: string;
  name: string;
  productId: string;
  category: string;
  brand: string;
  price: number;
  images: string[];
}

const steps = [
  { number: 1, title: "Select Product", icon: Package },
  { number: 2, title: "Batch Details", icon: Calendar },
  { number: 3, title: "Review & Mint", icon: QrCode },
];

const totalSteps = steps.length;

export default function EnrollBatchPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Step 1: Product Selection
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] =
    useState<CatalogueProduct | null>(null);
  const [productSearch, setProductSearch] = useState("");

  // Step 2: Batch Details
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [manufactureDate, setManufactureDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await listProducts();
        setProducts(res.products || []);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.productId.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [products, productSearch]);

  const canAdvance = () => {
    if (currentStep === 1) return !!selectedProduct;
    if (currentStep === 2)
      return (
        !!batchNumber &&
        !!quantity &&
        parseInt(quantity) > 0 &&
        !!manufactureDate
      );
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    setError("");
    setUploadProgress(10);

    try {
      // 1. Generate batchSalt
      const encoder = new TextEncoder();
      const saltInput = `${selectedProduct.productId}-${batchNumber}-${Date.now()}-${crypto.getRandomValues(new Uint8Array(16)).join("")}`;
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(saltInput),
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const batchSalt = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      setUploadProgress(30);

      // 2. Deploy / Get contract and Mint on blockchain
      const accounts = await requestExecutionAccounts();
      if (!accounts || accounts.length === 0)
        throw new Error(
          "No Web3 account found. Make sure your blockchain node is running.",
        );
      const deployer = accounts[0];

      const numMfDate = Math.floor(new Date(manufactureDate).getTime() / 1000);
      const numExDate = expiryDate
        ? Math.floor(new Date(expiryDate).getTime() / 1000)
        : 0;

      setUploadProgress(50);

      const { registerBatchOnChain } = await import("@/api/web3-client");
      
      const txResult = await registerBatchOnChain({
        productId: selectedProduct.productId,
        productName: selectedProduct.name,
        brand: selectedProduct.brand,
        batchNumber: batchNumber,
        batchSalt: batchSalt,
        manufactureDate: numMfDate,
        expiryDate: numExDate,
        quantity: parseInt(quantity)
      }, deployer);

      const txHash = txResult.transactionHash || txResult.blockHash;
      setUploadProgress(80);

      // 3. Save to Backend
      const savedBatch = await createBatch({
        productRef: selectedProduct._id,
        batchNumber,
        quantity: parseInt(quantity),
        manufactureDate: new Date(manufactureDate).toISOString(),
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        description,
        batchSalt,
        blockchainHash: txHash,
      });

      setUploadProgress(100);
      setSuccessId(savedBatch.batch._id);
      setCurrentStep(totalSteps + 1);
    } catch (err: any) {
      console.error("Failed to register batch:", err);
      let readableError = err.message;
      if (err.message?.includes("ProductAlreadyExists")) {
        readableError = "Batch number already exists on the blockchain.";
      }
      setError(readableError);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  if (successId) {
    return (
      <div className="max-w-4xl mx-auto w-full text-center space-y-6 pt-12">
        <div className="mx-auto w-20 h-20 bg-green-100/50 text-green-600 rounded-full flex items-center justify-center border border-green-200">
          <Check className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          Batch Registered Successfully!
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Batch <strong>{batchNumber}</strong> ({quantity} units) of{" "}
          <strong>{selectedProduct?.name}</strong> has been minted to the
          blockchain.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button asChild variant="outline" size="lg">
            <Link href="/manufacturer/batches">View All Batches</Link>
          </Button>
          <Button asChild size="lg" className="gap-2">
            <Link href={`/manufacturer/batches/${successId}`}>
              <QrCode className="h-5 w-5" />
              Generate QR Codes
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 max-w-4xl mx-auto w-full">
      <div className="mb-6 flex-none">
        <h1 className="text-3xl font-bold text-foreground">Create New Batch</h1>
        <p className="text-muted-foreground">
          Select a product from your catalogue, set batch details, and mint to
          the blockchain.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-md bg-destructive/10 text-destructive flex items-start gap-3 border border-destructive/20 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-8 relative px-4">
        <div className="absolute left-10 right-10 top-1/2 w-[calc(100%-5rem)] h-0.5 bg-muted -z-10" />
        <div
          className="absolute left-10 top-1/2 h-0.5 bg-primary -z-10 transition-all duration-500 ease-in-out"
          style={{
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
            maxWidth: "calc(100% - 5rem)",
          }}
        />
        <div className="flex items-center justify-between">
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
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 shadow-sm",
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
                    "text-xs font-semibold whitespace-nowrap hidden sm:block",
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

      {/* Step 1: Select Product */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Package className="text-primary h-5 w-5" />
              Select Product
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a product from your catalogue to create a batch for.
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name, SKU, or category..."
              className="pl-9 h-10"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>

          {/* Product Grid */}
          {productsLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="flex-1 min-h-[300px] overflow-y-auto pb-2 pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/10">
              {filteredProducts.map((p) => (
                <Card
                  key={p._id}
                  className={cn(
                    "p-4 cursor-pointer border-2 transition-all hover:shadow-md",
                    selectedProduct?._id === p._id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/40",
                  )}
                  onClick={() => setSelectedProduct(p)}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 border border-border overflow-hidden">
                      {p.images?.[0] ? (
                        <img
                          src={resolveMediaUrl(p.images[0])}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {p.productId}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.brand} · {p.category}
                      </p>
                    </div>
                    {selectedProduct?._id === p._id && (
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-12 border border-dashed rounded-lg border-border">
              <Package className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-foreground font-medium">No products found</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Add a product to your catalogue first.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/manufacturer/products">Go to Products</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Batch Details */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="text-primary h-5 w-5" />
              Batch Details
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Batch for: <strong>{selectedProduct?.name}</strong> (
              {selectedProduct?.productId})
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="batchNumber">
                Batch Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="batchNumber"
                placeholder="e.g. BATCH-2024-X91"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Must be unique.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">
                Total Units <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="e.g. 5000"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Individual QR codes will be generated for each unit.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manufactureDate">
                Manufacture Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="manufactureDate"
                type="date"
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date (optional)</Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              placeholder="Batch-specific notes or instructions..."
              className="resize-none h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 3: Review & Mint */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <QrCode className="text-primary h-5 w-5" />
              Review & Mint
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Confirm the details and submit to the blockchain.
            </p>
          </div>

          <Card className="p-6 border border-border space-y-4">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Product</p>
                <p className="font-semibold text-foreground">
                  {selectedProduct?.name}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {selectedProduct?.productId}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Brand / Category
                </p>
                <p className="font-medium text-foreground">
                  {selectedProduct?.brand} · {selectedProduct?.category}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Batch Number</p>
                <p className="font-mono font-semibold text-primary">
                  {batchNumber}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Units</p>
                <p className="font-semibold text-foreground">
                  {parseInt(quantity).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Manufacture Date
                </p>
                <p className="font-medium text-foreground">{manufactureDate}</p>
              </div>
              {expiryDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Expiry Date</p>
                  <p className="font-medium text-foreground">{expiryDate}</p>
                </div>
              )}
            </div>
          </Card>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-700 dark:text-amber-400">
            <p className="font-semibold">⚠️ Blockchain Transaction</p>
            <p className="mt-1">
              This will create an immutable record on the blockchain. Ensure all
              details are correct.
            </p>
          </div>

          {loading && (
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {uploadProgress < 30
                  ? "Generating secure salt..."
                  : uploadProgress < 60
                    ? "Awaiting blockchain confirmation..."
                    : uploadProgress < 90
                      ? "Saving to database..."
                      : "Finalizing..."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex-none flex justify-between mt-auto pt-4 border-t pb-2">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1 || loading}
        >
          Back
        </Button>

        {currentStep < totalSteps ? (
          <Button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canAdvance()}
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading || !canAdvance()}
            className="gap-2 min-w-[180px]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <QrCode className="h-4 w-4" />
            )}
            {loading ? "Minting..." : "Mint Batch to Blockchain"}
          </Button>
        )}
      </div>
    </div>
  );
}
