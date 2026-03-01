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
} from "lucide-react";
import { verifyOnBlockchain, VerificationResult } from "@/lib/blockchain-utils";
import { AIChatEmbed } from "@/components/chat/AIChatEmbed";
import api from "@/api/client";

interface ProductData {
  name: string;
  brand: string;
  productId: string;
  batchNumber: string;
  expiryDate?: string;
  images?: string[];
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const [scanned, setScanned] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<ProductData | null>(null);

  const handleScan = async (overrideSalt?: string) => {
    const saltToVerify = overrideSalt || qrInput;
    if (!saltToVerify) return;

    setLoading(true);
    setError("");
    setProduct(null);

    try {
      const result: VerificationResult = await verifyOnBlockchain(saltToVerify);

      if (!result.isValid || !result.record) {
        throw new Error(
          result.warnings[0] || "Product not found on the blockchain",
        );
      }

      setProduct({
        name: result.record.productName,
        brand: result.record.manufacturerName,
        productId: result.record.blockchainId,
        batchNumber: result.record.batchId,
        images: result.record.images || [],
      } as any);

      setQrInput(saltToVerify);
      setScanned(true);
    } catch (err: any) {
      setError(err.message || "Failed to verify product via Blockchain");
      // Could ping backend heatmap endpoint here on fail:
      // fetch('/api/alerts/suspicious-scan', { ... })
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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {!scanned ? (
          // Scanning Interface
          <div className="space-y-8">
            <div className="space-y-2">
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

            {/* Manual Entry */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Manual Verification
              </h3>
              <Card className="p-6 border border-border space-y-4">
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
          <div className="space-y-8">
            <Button
              variant="ghost"
              onClick={() => setScanned(false)}
              className="pl-0 hover:bg-transparent text-primary"
            >
              &larr; Verify Another
            </Button>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                Product Verified
              </h1>
              <p className="text-muted-foreground">
                This product has been confirmed as authentic
              </p>
            </div>

            {/* Status Card */}
            <Card className="p-8 border border-border bg-gradient-to-br from-accent/10 to-transparent">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-8 w-8 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-accent">
                    BLOCKCHAIN TRACKED
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    Authentic Product
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ID: {product?.productId}
                  </p>
                </div>
              </div>
            </Card>

            {/* Product Details */}
            <Card className="p-6 border border-border space-y-6">
              <h2 className="text-xl font-semibold text-foreground">
                Product Information
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Product Name
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold text-foreground">
                        {product?.name}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await api.post("/users/cabinet/add", product);
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
                      Brand
                    </p>
                    <div className="flex items-center gap-2 text-foreground">
                      <Building2 className="h-4 w-4" />
                      <p className="font-semibold">{product?.brand}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Batch Number
                    </p>
                    <div className="flex items-center gap-2 text-foreground">
                      <Hash className="h-4 w-4" />
                      <p className="font-mono text-sm font-semibold">
                        {product?.batchNumber}
                      </p>
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
              </div>
            </Card>

            {/* Product Images */}
            {product?.images && product.images.length > 0 && (
              <Card className="p-6 border border-border space-y-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Product Images
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {product.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Product view ${idx + 1}`}
                      className="h-48 w-48 object-cover rounded-md border border-border flex-shrink-0"
                    />
                  ))}
                </div>
              </Card>
            )}

            {/* Safety Notice */}
            <Card className="p-6 border border-border bg-muted/30 space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Safe to Use</h3>
                  <p className="text-sm text-muted-foreground">
                    This product has been verified on the blockchain.
                  </p>
                </div>
              </div>
            </Card>

            {/* AI Assistant Embed */}
            <AIChatEmbed
              productContext={product}
              currentPage="Verify Product"
            />
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
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
