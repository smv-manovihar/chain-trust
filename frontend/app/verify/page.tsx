"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Building2,
  Hash,
  ShieldCheck,
  Clock,
  Bell,
  BookmarkPlus,
  PackageCheck,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
import { verifyScan } from "@/api/batch.api";
import { addToCabinet } from "@/api/customer.api";
import { verifyOnBlockchain } from "@/api/web3-client";
import { getVisitorId } from "@/lib/visitor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/layout/app-shell";
import { CustomerSidebar } from "@/components/layout/customer-sidebar";
import { ManufacturerSidebar } from "@/components/layout/manufacturer-sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { navGroups as customerNav } from "@/components/layout/customer-sidebar";
import { navGroups as manufacturerNav } from "@/components/layout/manufacturer-sidebar";
import { VideoScanner } from "@/components/verify/video-scanner";
import { UploadScanner } from "@/components/verify/upload-scanner";
import { useDevice } from "@/hooks/use-device";

interface ScanResult {
  isValid: boolean;
  product?: {
    productId: string;
    productName: string;
    description?: string;
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
  isSuspicious?: boolean;
  suspiciousReason?: string | null;
}

type ScanView = "camera" | "upload";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [scanned, setScanned] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<ScanResult["product"] | null>(null);
  const [scanStats, setScanStats] = useState({
    count: 0,
    blockchainHash: "",
    isSuspicious: false,
    suspiciousReason: "",
  });
  const { user, isAuthenticated } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { isMobileDevice, hasCameraAPI } = useDevice();

  const defaultView: ScanView = isMobileDevice ? "camera" : "upload";
  const [scanView, setScanView] = useState<ScanView | null>(null);

  // ── 1. Auto-Scan Effect ──────────────────────────────────────────────────
  useEffect(() => {
    const autoScanSalt = searchParams.get("salt") || searchParams.get("id");
    if (autoScanSalt && !scanned && !loading) {
      setQrInput(autoScanSalt);
      handleScan(autoScanSalt);
    }
  }, [searchParams]); // eslint-disable-line

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "camera") {
      setScanView("camera");
      return;
    }
    if (mode === "upload") {
      setScanView("upload");
      return;
    }

    // If we haven't manually closed or switched, and we're on mobile, default to camera
    if (!userInteracted) {
      setScanView(defaultView);
    }
    return () => abortControllerRef.current?.abort();
  }, [isMobileDevice, searchParams, defaultView, userInteracted]);

  const handleScan = async (overrideSalt?: string) => {
    const saltToVerify = overrideSalt || qrInput;
    if (!saltToVerify) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError("");

    try {
      const batchSalt = saltToVerify.includes(":")
        ? saltToVerify.split(":")[0]
        : saltToVerify;
      const unitIndexStr = saltToVerify.includes(":")
        ? saltToVerify.split(":")[1]
        : "0";
      const unitIndex = parseInt(unitIndexStr, 10);

      const blockchainResult = await verifyOnBlockchain(batchSalt, controller.signal);
      if (!blockchainResult.isValid || !blockchainResult.record) {
        throw new Error(
          blockchainResult.warnings?.[0] ||
            "Found no blockchain record for this product.",
        );
      }

      let finalProduct: ScanResult["product"] = {
        productId: blockchainResult.record.blockchainId,
        productName: blockchainResult.record.productName,
        brand: blockchainResult.record.manufacturerName,
        batchNumber: blockchainResult.record.batchId,
        manufactureDate: new Date(
          blockchainResult.record.timestamp,
        ).toISOString(),
        images: blockchainResult.record.images || [],
        unitIndex,
        unitNumber: unitIndex + 1,
        totalUnits: 0,
      };

      let finalStats = {
        count: 1,
        blockchainHash: blockchainResult.record.transactionHash || "Verified",
        isSuspicious: false,
        suspiciousReason: "",
      };

      try {
        const visitorId = getVisitorId();
        const result: ScanResult = await verifyScan(saltToVerify, visitorId, undefined, undefined, controller.signal);
        if (result.isValid && result.product) {
          finalProduct = { ...finalProduct, ...result.product };
          finalStats = {
            count: result.scanCount || 1,
            blockchainHash: result.blockchainHash || finalStats.blockchainHash,
            isSuspicious: result.isSuspicious || false,
            suspiciousReason: result.suspiciousReason || "",
          };
        } else if (result.isRecalled) {
          throw new Error("RECALLED: This batch has been flagged as unsafe.");
        }
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        console.warn("DB Metadata unavailable, using blockchain data.");
      }

      setProduct(finalProduct);
      setScanStats(finalStats);
      setScanned(true);

      // Clean up URL if we successfully scanned from a query param
      if (searchParams.has("salt") || searchParams.has("id")) {
        router.replace("/verify", { scroll: false });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || "Verification failed.");
      toast.error(err.message || "Verification failed");
      setScanned(false);
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  const handleSaveToCabinet = async () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    try {
      await addToCabinet({
        name: product?.productName,
        brand: product?.brand,
        productId: product?.productId,
        batchNumber: product?.batchNumber,
        expiryDate: product?.expiryDate,
        images: product?.images,
        salt: qrInput,
        isUserAdded: false,
      });
      toast.success("Saved to My Medicines!");
      router.push("/customer/cabinet");
    } catch {
      toast.error("Failed to save. Try again.");
    }
  };

  // ── 2. Link Interception & Routing ────────────────────────────────────────
  const onScanSuccess = (decodedText: string) => {
    try {
      const url = new URL(decodedText);
      const currentHost = window.location.hostname;
      const isInternalLink =
        url.hostname === currentHost || url.hostname.includes("chaintrust");

      if (isInternalLink) {
        router.push(url.pathname + url.search + url.hash);
      } else {
        toast.error("Invalid QR Code: Unrecognized external domain.");
      }
    } catch {
      setQrInput(decodedText);
      handleScan(decodedText);
    }
  };

  if (scanView === null) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  const isCustomer = user?.role === "customer";
  const isManufacturer = user?.role === "manufacturer";

  const isMobileFullscreenCamera =
    isMobileDevice && scanView === "camera" && !scanned && !loading;

  const content = (
    <div
      className={cn(
        "relative font-sans h-full flex flex-col",
        !isAuthenticated && "layout-contained bg-muted/30 min-h-screen",
      )}
    >
      {!isAuthenticated && !isMobileFullscreenCamera && (
        <div className="absolute inset-0 bg-grid-pattern-global opacity-30 pointer-events-none" />
      )}

      {!isAuthenticated && !isMobileFullscreenCamera && (
        <header className="h-14 lg:h-16 border-b bg-background/80 backdrop-blur-md flex items-center px-4 lg:px-8 shrink-0 z-20">
          <Link href="/" className="flex items-center gap-2 group">
            <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-bold text-lg tracking-tight">
              ChainTrust <span className="text-primary">Verify</span>
            </span>
          </Link>
        </header>
      )}

      <main className="overflow-hidden relative flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 flex flex-col items-center justify-center p-8 z-10"
            >
              <div className="relative h-24 w-24 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck className="h-10 w-10 text-primary animate-pulse" />
                </div>
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-2 text-center">
                Verifying Authenticity
              </h3>
              <p className="text-muted-foreground text-sm font-medium text-center">
                Querying secure blockchain records...
              </p>
            </motion.div>
          ) : !scanned ? (
            <motion.div
              key="scan-step"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "flex-1 flex flex-col",
                isMobileFullscreenCamera
                  ? "p-0"
                  : !isAuthenticated && "p-4 lg:p-8",
                "min-h-0",
              )}
            >
              {isMobileFullscreenCamera ? (
                <VideoScanner
                  isMobileDevice={true}
                  onScanSuccess={onScanSuccess}
                  onSwitchToUpload={() => {
                    setScanView("upload");
                    setUserInteracted(true);
                  }}
                  onClose={() => {
                    router.back();
                    setUserInteracted(true);
                  }}
                />
              ) : (
                <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6 justify-center">
                  <div className="flex-1 max-h-[600px] flex flex-col items-center justify-center bg-card/50 rounded-[2rem] border border-border/50 border-dashed p-4 sm:p-8 shadow-sm relative overflow-hidden">
                    {scanView === "camera" ? (
                      <VideoScanner
                        isMobileDevice={false}
                        onScanSuccess={onScanSuccess}
                        onSwitchToUpload={() => {
                          setScanView("upload");
                          setUserInteracted(true);
                        }}
                        onClose={() => {
                          setScanView("upload");
                          setUserInteracted(true);
                        }}
                      />
                    ) : (
                      <UploadScanner
                        onScanSuccess={onScanSuccess}
                        onSwitchToCamera={
                          hasCameraAPI ? () => setScanView("camera") : undefined
                        }
                      />
                    )}
                  </div>
                  <p className="text-center text-[10px] font-bold tracking-tight text-muted-foreground/50">
                    Secure Blockchain Verification • No-Storage Policy
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result-step"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "flex flex-col flex-1 min-h-0",
                !isAuthenticated && "p-4 lg:p-0",
              )}
            >
              <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col min-h-0 mt-4 lg:mt-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                  <div>
                    <Badge
                      variant="outline"
                      className="mb-2 bg-green-500/10 text-green-600 border-green-200 px-3 py-1 font-bold tracking-tighter"
                    >
                      Blockchain Verified
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                      {product?.productName}
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                      Authenticity record confirmed on{" "}
                      {new Date(
                        product?.manufactureDate || "",
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setScanned(false);
                        setScanView(defaultView);
                      }}
                      className="rounded-full"
                    >
                      Scan New
                    </Button>
                    <Button
                      onClick={handleSaveToCabinet}
                      className="rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
                    >
                      <BookmarkPlus className="mr-2 h-4 w-4" />
                      Save to My Medicines
                    </Button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 flex flex-col gap-6 overflow-hidden">
                    <ScrollArea className="flex-1 pr-4">
                      <div className="space-y-6 pb-6">
                        <Card
                          className={cn(
                            "p-6 border rounded-[2rem] flex items-center gap-6",
                            scanStats.isSuspicious
                              ? "bg-gradient-to-br from-amber-500/10 via-background to-amber-500/5 border-amber-500/50 shadow-amber-500/10"
                              : "bg-gradient-to-br from-green-500/10 via-background to-primary/5 border-green-500/20",
                          )}
                        >
                          <div
                            className={cn(
                              "h-16 w-16 rounded-full flex items-center justify-center shrink-0 shadow-inner",
                              scanStats.isSuspicious
                                ? "bg-amber-500/20"
                                : "bg-green-500/20",
                            )}
                          >
                            {scanStats.isSuspicious ? (
                              <AlertTriangle className="h-8 w-8 text-amber-600" />
                            ) : (
                              <CheckCircle2 className="h-8 w-8 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={cn(
                                  "text-xs font-bold tracking-tight leading-none",
                                  scanStats.isSuspicious
                                    ? "text-amber-600"
                                    : "text-green-600",
                                )}
                              >
                                {scanStats.isSuspicious ? "Warning" : "Status"}
                              </span>
                              {scanStats.count > 5 &&
                                !scanStats.isSuspicious && (
                                  <Badge
                                    variant="destructive"
                                    className="h-4 text-[8px] px-1 font-bold"
                                  >
                                    High Scans
                                  </Badge>
                                )}
                            </div>
                            <p className="text-lg font-bold leading-tight">
                              {scanStats.isSuspicious
                                ? "Suspicious Scan Activity"
                                : "Product is 100% Authentic"}
                            </p>
                            {scanStats.isSuspicious &&
                            scanStats.suspiciousReason ? (
                              <p className="text-xs text-amber-600/80 mt-1 font-medium leading-tight">
                                {scanStats.suspiciousReason}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1 font-mono">
                                HASH: {scanStats.blockchainHash.slice(0, 16)}...
                              </p>
                            )}
                          </div>
                          <div className="hidden sm:block text-right">
                            <p
                              className={cn(
                                "text-xl font-bold",
                                scanStats.isSuspicious
                                  ? "text-amber-600"
                                  : "text-primary",
                              )}
                            >
                              {scanStats.count}
                            </p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">
                              Total Scans
                            </p>
                          </div>
                        </Card>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <Card className="p-5 rounded-3xl border-border/50 bg-card/50">
                            <p className="text-[10px] font-bold tracking-tight text-muted-foreground mb-3">
                              Manufacturer
                            </p>
                            <div className="flex items-center gap-3">
                              <Building2 className="h-5 w-5 text-primary" />
                              <p className="font-bold">{product?.brand}</p>
                            </div>
                          </Card>
                          <Card className="p-5 rounded-3xl border-border/50 bg-card/50">
                            <p className="text-[10px] font-bold tracking-tight text-muted-foreground mb-3">
                              Expiration
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 text-primary" />
                                <p className="font-bold">
                                  {product?.expiryDate
                                    ? new Date(
                                        product.expiryDate,
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                          </Card>
                          <Card className="p-5 rounded-3xl border-border/50 bg-card/50">
                            <p className="text-[10px] font-bold tracking-tight text-muted-foreground mb-3">
                              Batch ID
                            </p>
                            <div className="flex items-center gap-3">
                              <Hash className="h-5 w-5 text-primary" />
                              <p className="font-mono text-sm font-bold">
                                {product?.batchNumber}
                              </p>
                            </div>
                          </Card>
                          {!isAuthenticated && (
                            <Card className="p-5 rounded-3xl border-border/50 bg-card/50">
                              <p className="text-sm text-muted-foreground text-center mb-4">
                                Log in to your member account to save this
                                medicine and track your health journey.
                              </p>
                              <div className="flex flex-col gap-3">
                                <Button
                                  className="w-full rounded-2xl h-10 font-bold"
                                  asChild
                                >
                                  <Link href="/login">Login to Save</Link>
                                </Button>
                                <Button
                                  variant="outline"
                                  className="w-full rounded-2xl h-10 font-bold"
                                  asChild
                                >
                                  <Link href="/register">Become a Member</Link>
                                </Button>
                              </div>
                            </Card>
                          )}
                          <Card className="p-5 rounded-3xl border-border/50 bg-card/50">
                            <p className="text-[10px] font-bold tracking-tight text-muted-foreground mb-3">
                              Unit Tracking
                            </p>
                            <div className="flex items-center gap-3">
                              <PackageCheck className="h-5 w-5 text-primary" />
                              <p className="font-bold">
                                Unit {product?.unitNumber}
                              </p>
                            </div>
                          </Card>
                        </div>

                        {product?.description && (
                          <Card className="p-6 rounded-[2rem] border-border/50 bg-card/50">
                            <h3 className="text-sm font-black tracking-tight mb-4">
                              Patient Guide
                            </h3>
                            <div className="text-sm text-muted-foreground leading-relaxed">
                              {product.description}
                            </div>
                          </Card>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent className="rounded-[2.5rem] p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">
              Save your medications
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Create an account to track your medication history across devices
              and receive safety alerts if a batch is recalled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-full">
              Not Now
            </AlertDialogCancel>
            <AlertDialogAction
              asChild
              className="rounded-full bg-primary shadow-lg shadow-primary/20"
            >
              <Link href="/login">Sign In / Register</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (!isAuthenticated) return content;

  const sidebarLinks = isManufacturer
    ? manufacturerNav.flatMap((g) => g.items)
    : customerNav.flatMap((g) => g.items);

  return (
    <AppShell
      sidebar={isManufacturer ? <ManufacturerSidebar /> : <CustomerSidebar />}
      mobileSidebar={({ open, onOpenChange }) => (
        <MobileSidebar
          isOpen={open}
          onClose={() => onOpenChange(false)}
          links={sidebarLinks}
        />
      )}
    >
      {content}
    </AppShell>
  );
}

export default function VerifyProductPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-background flex flex-col items-center justify-center p-8">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
