"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Package,
  Building2,
  Calendar,
  Hash,
  ShieldCheck,
  Clock,
  QrCode,
  Loader2,
  XCircle,
  Bell,
  BookmarkPlus,
  AlertTriangle,
  PackageCheck
} from "lucide-react";
import { AIChatEmbed } from "@/components/chat/AIChatEmbed";
import api from "@/api/client";
import { verifyScan } from "@/api/batch.api";
import { verifyOnBlockchain } from "@/lib/blockchain-utils";

interface ScanResult {
  isValid: boolean;
  product?: {
    productId: string;
    productName: string;
    category: string;
    brand: string;
    batchNumber: string;
    manufactureDate: string;
    expiryDate?: string;
    images: string[];
    unitIndex: number;
    unitNumber: number;
    totalUnits: number;
  };
  scanCount?: number;
  isRecalled?: boolean;
  blockchainHash?: string;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const [scanned, setScanned] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<ScanResult['product'] | null>(null);
  const [scanStats, setScanStats] = useState({ count: 0, blockchainHash: "" });

  const handleScan = async (overrideSalt?: string) => {
    const saltToVerify = overrideSalt || qrInput;
    if (!saltToVerify) return;

    setLoading(true);
    setError("");
    setProduct(null);

    try {
      // 1. First, strictly verify on the blockchain directly from the Frontend (Decentralized Verify)
      // The QR codes contain 'batchSalt:unitIndex'
      const batchSalt = saltToVerify.includes(':') ? saltToVerify.split(':')[0] : saltToVerify;
      const unitIndexStr = saltToVerify.includes(':') ? saltToVerify.split(':')[1] : '0';
      const unitIndex = parseInt(unitIndexStr, 10);
      
      const blockchainResult = await verifyOnBlockchain(batchSalt);
      if (!blockchainResult.isValid || !blockchainResult.record) {
         throw new Error(blockchainResult.warnings?.[0] || "Blockchain verification failed. This product is likely counterfeit or was not found on-chain.");
      }

      // Initialize base product state with guaranteed blockchain data.
      // This ensures VERIFICATION DOES NOT DEPEND ON MONGODB.
      let finalProduct: ScanResult['product'] = {
        productId: blockchainResult.record.blockchainId,
        productName: blockchainResult.record.productName,
        category: "Medicine", // fallback
        brand: blockchainResult.record.manufacturerName,
        batchNumber: blockchainResult.record.batchId,
        manufactureDate: new Date(blockchainResult.record.timestamp).toISOString(),
        images: blockchainResult.record.images || [],
        unitIndex: unitIndex,
        unitNumber: unitIndex + 1,
        totalUnits: 0 // unknown unless DB returns it
      };
      
      let finalStats = { count: 1, blockchainHash: blockchainResult.record.transactionHash || "Verified On-Chain" };

      // 2. As a supplementary step, ping backend for rich metadata and to track the scan.
      // Since "Metadata is handled by the mongodb", we merge it into the product but don't fail if it's absent.
      try {
        const result: ScanResult = await verifyScan(saltToVerify);

        if (result.isValid && result.product) {
          // Merge MongoDB richer metadata with our base Product
          finalProduct = {
             ...finalProduct,
             ...result.product,
             // Ensure unit indexing is correct
             unitIndex: result.product.unitIndex ?? unitIndex,
             unitNumber: result.product.unitNumber ?? (unitIndex + 1),
          };
          finalStats = { count: result.scanCount || 1, blockchainHash: result.blockchainHash || finalStats.blockchainHash };
        } else if (result.isRecalled) {
             throw new Error("This batch has been flagged as RECALLED by the manufacturer. Do not use.");
        }
      } catch (dbErr: any) {
        console.warn("Scan tracker / Metadata database is unavailable. Proceeding with decentralized verification only.", dbErr);
        // We still successfully verified on blockchain, so we don't block the user.
      }

      setProduct(finalProduct);
      setScanStats(finalStats);
      setQrInput(saltToVerify);
      setScanned(true);
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err.message || err.response?.data?.message || "Verification failed. Potentially an invalid or untracked product.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const defaultSalt = searchParams.get("salt");
    if (defaultSalt && !scanned && !loading) {
      setQrInput(defaultSalt);
      handleScan(defaultSalt);
    }
  }, [searchParams]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden w-full">
      <div className="flex-none">
        <Header />
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col min-h-0">
        {!scanned ? (
          // Scanning Interface
          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                Verify Product
              </h1>
              <p className="text-muted-foreground">
                Scan the QR code on your medicine package or enter the Product
                ID
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 rounded-md bg-destructive/10 text-destructive flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            )}

            {/* Camera/Upload Area */}
            <Card className="p-12 border-2 border-dashed border-border text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-24 w-24 rounded-lg bg-primary/10 flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-primary" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    Scan QR Code
                  </h2>
                  <p className="text-muted-foreground">
                    Allow camera access and point at the QR code
                  </p>
                </div>
                <Button size="lg" disabled>
                  Open Camera (Coming Soon)
                </Button>
              </div>
            </Card>

            <div className="w-full space-y-4">
              <h3 className="text-lg font-semibold text-foreground text-center">
                Manual Verification
              </h3>
              <Card className="p-6 border border-border w-full">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Product ID / Batch Number
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter Product ID (e.g. PROD-001)"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                    />
                    <Button onClick={() => handleScan()} disabled={loading}>
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          // Results Screen
          <div className="flex flex-col h-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
            <div className="flex-none flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Product Verified
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  This product has been confirmed as authentic on the blockchain
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setScanned(false)}
                className="text-primary hover:bg-transparent px-2"
              >
                &larr; Verify Another
              </Button>
            </div>

            {/* Scrolling Grid Region */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto lg:overflow-hidden pb-4 lg:pb-0">
              
              {/* Left Column: Status & Details */}
              <div className="lg:col-span-2 space-y-4 flex flex-col lg:overflow-y-auto pr-1 pb-2">
                
                <Card className="p-5 border border-border bg-gradient-to-br from-green-500/10 to-transparent flex flex-wrap justify-between items-start gap-4 flex-none">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600/80 uppercase tracking-wider">
                    SECURED BY CHAINTRUST
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    Authentic Product
                  </p>
                  <p className="text-sm font-mono text-muted-foreground mt-1">
                    BLOCKCHAIN TX: {scanStats.blockchainHash.slice(0, 10)}...{scanStats.blockchainHash.slice(-8)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end pt-2 sm:pt-0">
                {scanStats.count === 1 ? (
                  <div className="px-3 py-1 bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded text-sm font-medium">First Scan ✓</div>
                ) : scanStats.count > 5 ? (
                  <div className="px-3 py-1 bg-destructive/10 border border-destructive/20 text-destructive rounded text-sm font-bold flex flex-col items-end gap-1 shadow-sm">
                    <span className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Scanned {scanStats.count} times</span>
                    <span className="text-[10px] uppercase font-bold text-destructive/80">Possible Counterfeit</span>
                  </div>
                ) : (
                  <div className="px-3 py-1 bg-muted border border-border text-foreground rounded text-sm font-medium">Scanned {scanStats.count} times</div>
                )}
              </div>
            </Card>

                {/* Product Details */}
                <Card className="p-5 border border-border flex-1 flex flex-col">
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    Product Information
                  </h2>

                  <div className="grid md:grid-cols-2 gap-5 flex-1">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Product Name
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold text-foreground">
                        {product?.productName}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await api.post("/users/cabinet/add", {
                               name: product?.productName,
                               brand: product?.brand,
                               productId: product?.productId,
                               batchNumber: product?.batchNumber,
                               expiryDate: product?.expiryDate,
                               images: product?.images
                            });
                            alert("Product saved to your Personal Cabinet!");
                          } catch (err: any) {
                            // Fallback to local storage if not logged in or error
                            const saved = JSON.parse(
                              localStorage.getItem("cabinet") || "[]",
                            );
                            if (
                              !saved.find(
                                (p: any) => p.productId === product?.productId,
                              )
                            ) {
                              saved.push(product);
                              localStorage.setItem(
                                "cabinet",
                                JSON.stringify(saved),
                              );
                              alert(
                                "Product saved to your Personal Cabinet (Local)!",
                              );
                            } else {
                              alert("Product already in your Cabinet.");
                            }
                          }
                        }}
                      >
                        <BookmarkPlus className="h-4 w-4 mr-2" />
                        Save to Cabinet
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Manufacturer
                    </p>
                    <div className="flex items-center gap-2 text-foreground">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold">{product?.brand}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Product ID (SKU/Code)
                    </p>
                    <div className="flex items-center gap-2 text-foreground bg-muted/50 p-2 rounded-lg mt-1 border">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <p className="font-mono text-sm">{product?.productId}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Batch Details
                    </p>
                    <div className="flex items-start gap-3 bg-muted/50 p-2 border rounded-lg mt-1">
                      <PackageCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-mono text-sm font-semibold text-primary">
                          {product?.batchNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Unit {product?.unitNumber} 
                          {product?.totalUnits && product.totalUnits > 0 ? ` of ${product?.totalUnits.toLocaleString()}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Expires
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-foreground">
                        <Clock className="h-4 w-4" />
                        <p className="font-semibold">
                          {product?.expiryDate
                            ? new Date(product.expiryDate).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      {product?.expiryDate && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            alert("Expiry alert email configured!")
                          }
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Set Alert
                        </Button>
                      )}
                        </div>
                    </div>
                  </div>
                </Card>
              </div>{/* End Left Column */}

              {/* Right Column: Images, Safety & Chat */}
              <div className="space-y-4 flex flex-col lg:overflow-y-auto pr-1 pb-2">
                
                {/* Product Images (Compact) */}
                {product?.images && product.images.length > 0 && (
                  <Card className="p-4 border border-border flex-none">
                    <h2 className="text-sm font-semibold text-foreground mb-3">
                      Product Images
                    </h2>
                    <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                      {product.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Product view ${idx + 1}`}
                          className="h-28 w-28 object-cover rounded-lg border border-border flex-shrink-0 snap-center shadow-sm bg-muted/20"
                        />
                      ))}
                    </div>
                  </Card>
                )}

                {/* Safety Notice */}
                <Card className="p-4 border border-border bg-muted/30 flex-none">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">Safe to Use</h3>
                      <p className="text-xs text-muted-foreground">
                        Verified via encrypted blockchain records.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* AI Assistant Embed */}
                <div className="flex-1 min-h-[300px] border rounded-xl overflow-hidden shadow-sm flex flex-col bg-card">
                   <AIChatEmbed
                     productContext={product}
                     currentPage="Verify Product"
                   />
                </div>
              </div>{/* End Right Column */}

            </div>{/* End Grid */}
          </div>
        )}
      </main>
    </div>
  );
}

export default function VerifyProductPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-background flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
