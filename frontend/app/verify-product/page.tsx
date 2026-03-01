"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Package,
  Building2,
  Calendar,
  MapPin,
  Hash,
  ShieldCheck,
  Clock,
  QrCode,
  Loader2,
  XCircle,
} from "lucide-react";
import { verifyOnBlockchain, VerificationResult } from "@/lib/blockchain-utils";

// Define types for API response
interface TimelineEvent {
  status: string;
  date: string;
  location: string;
  description?: string;
  txHash?: string;
}

interface ProductData {
  name: string;
  brand: string;
  productId: string;
  batchNumber: string;
  expiryDate?: string;
  images?: string[];
}

export default function VerifyProductPage() {
  const [scanned, setScanned] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<ProductData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const handleScan = async () => {
    if (!qrInput) return;

    setLoading(true);
    setError("");
    setProduct(null);

    try {
      const result: VerificationResult = await verifyOnBlockchain(qrInput);

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

      const timelineEvents = result.record.supplyChainEvents.map(
        (event: any) => ({
          status:
            event.status.charAt(0).toUpperCase() +
            event.status.slice(1).replace("-", " "),
          date: new Date(event.timestamp).toISOString(),
          location: event.location,
          description: `Updated by: ${event.updatedBy}`,
        }),
      );

      setTimeline(timelineEvents);
      setScanned(true);
    } catch (err: any) {
      setError(err.message || "Failed to verify product via Blockchain");
    } finally {
      setLoading(false);
    }
  };

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
                    <Button onClick={handleScan} disabled={loading}>
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
                    <p className="text-lg font-semibold text-foreground">
                      {product?.name}
                    </p>
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
                    <div className="flex items-center gap-2 text-foreground">
                      <Clock className="h-4 w-4" />
                      <p className="font-semibold">
                        {product?.expiryDate
                          ? new Date(product.expiryDate).toLocaleDateString()
                          : "N/A"}
                      </p>
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

            {/* Supply Chain Timeline */}
            <Card className="p-6 border border-border space-y-6">
              <h2 className="text-xl font-semibold text-foreground">
                Supply Chain Journey
              </h2>

              {timeline.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No tracking history available yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {timeline.map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold flex-shrink-0">
                          {index + 1}
                        </div>
                        {index < timeline.length - 1 && (
                          <div className="h-12 w-1 bg-accent/20 mt-2" />
                        )}
                      </div>
                      <div className="pt-1 pb-4">
                        <p className="font-semibold text-foreground">
                          {step.status}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(step.date).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                          <MapPin className="h-3 w-3" />
                          <span>{step.location}</span>
                        </div>
                        {step.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Safety Notice */}
            <Card className="p-6 border border-border bg-muted/30 space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Safe to Use</h3>
                  <p className="text-sm text-muted-foreground">
                    This product's history is being tracked. Verify that the
                    timeline matches your purchase.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
