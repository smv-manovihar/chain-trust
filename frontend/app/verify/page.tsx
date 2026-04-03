"use client";

import { useState, useEffect, Suspense, useRef, MouseEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Building2,
  PackageCheck,
  Clock,
  ShieldCheck,
  BookmarkPlus,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
import { verifyScan } from "@/api/batch.api";
import { addToCabinet } from "@/api/customer.api";
import { verifyOnBlockchain, deriveUnitHash } from "@/api/web3-client";
import { getVisitorId } from "@/lib/visitor";
import { resolveMediaUrl } from "@/lib/media-url";
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
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/layout/app-shell";
import { CustomerSidebar, MobileSidebar as CustomerMobileSidebar } from "@/components/layout/customer-sidebar";
import { ManufacturerSidebar, MobileSidebar as ManufacturerMobileSidebar } from "@/components/layout/manufacturer-sidebar";
import { VideoScanner } from "@/components/verify/video-scanner";
import { UploadScanner } from "@/components/verify/upload-scanner";
import { useDevice } from "@/hooks/use-device";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { SaveMedicineDialog } from "@/components/verify/save-medicine-dialog";

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
    composition?: string;
    images: string[];
    customerVisibleImages?: number[];
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

// ── NEW: Extracted Interactive Card Component ─────────────────────────────
function InteractiveResultCard({
  product,
  scanStats,
  isMobileDevice,
  isAuthenticated,
  isInvalid = false,
  isRecalled = false,
  errorTitle,
  errorDescription,
}: {
  product: ScanResult["product"] | null;
  scanStats: {
    isSuspicious: boolean;
    count: number;
    blockchainHash: string;
    suspiciousReason?: string | null;
  };
  isMobileDevice: boolean;
  isAuthenticated: boolean;
  isInvalid?: boolean;
  isRecalled?: boolean;
  errorTitle?: string;
  errorDescription?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 0, y: 0, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleCardMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isMobileDevice) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = -((y - centerY) / centerY) * 8;
    const rotateY = ((x - centerX) / centerX) * 8;

    setTilt({ x: rotateX, y: rotateY });
    setGlow({ x, y, opacity: 1 });
    setIsHovered(true);
  };

  const resetCardPosition = () => {
    setTilt({ x: 0, y: 0 });
    setGlow((prev) => ({ ...prev, opacity: 0 }));
    setIsHovered(false);
  };

  const handleCardMouseLeave = () => {
    if (isMobileDevice) return;
    resetCardPosition();
  };

  return (
    <div style={{ perspective: "1000px" }} className="w-full">
      <div
        ref={cardRef}
        onMouseMove={handleCardMouseMove}
        onMouseLeave={handleCardMouseLeave}
        onClick={resetCardPosition}
        onTouchEnd={resetCardPosition}
        style={{
          transform:
            isHovered && !isMobileDevice
              ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
              : "none",
          transition:
            isHovered && !isMobileDevice ? "none" : "transform 0.5s ease-out",
          transformStyle: "preserve-3d",
          cursor: "pointer",
        }}
        className={cn(
          "group relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-12 shadow-xl border transition-all duration-300 bg-card text-card-foreground",
          isInvalid || isRecalled
            ? "border-destructive/30 shadow-destructive/10"
            : scanStats.isSuspicious
              ? "border-amber-500/30 shadow-amber-900/10"
              : "border-green-500/30 shadow-green-900/10",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 opacity-10 pointer-events-none z-0",
            isInvalid || isRecalled
              ? "bg-destructive"
              : scanStats.isSuspicious
                ? "bg-amber-500"
                : "bg-green-500",
          )}
        />

        {!isMobileDevice && (
          <div
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
            style={{
              opacity: glow.opacity,
              background: `radial-gradient(circle 300px at ${glow.x}px ${glow.y}px, ${
                isInvalid || isRecalled
                  ? "rgba(239, 68, 68, 0.15)"
                  : scanStats.isSuspicious
                    ? "rgba(245, 158, 11, 0.15)"
                    : "rgba(16, 185, 129, 0.15)"
              }, transparent)`,
            }}
          />
        )}

        <div className="absolute top-0 right-0 p-6 sm:p-12 opacity-5 pointer-events-none z-0">
          {isInvalid || isRecalled ? (
            <AlertTriangle className="w-32 h-32 sm:w-48 sm:h-48" />
          ) : scanStats.isSuspicious ? (
            <AlertTriangle className="w-32 h-32 sm:w-48 sm:h-48" />
          ) : (
            <CheckCircle2 className="w-32 h-32 sm:w-48 sm:h-48" />
          )}
        </div>

        <div
          className="relative z-10 flex flex-col h-full min-h-[180px] sm:min-h-[200px] justify-between pointer-events-none"
          style={{ transform: !isMobileDevice ? "translateZ(30px)" : "none" }}
        >
          <div className="flex justify-between items-start">
            <div className="w-full">
              <Badge
                variant="outline"
                className={cn(
                  "mb-4 px-3 py-1 font-bold text-[10px] backdrop-blur-sm",
                  isInvalid || isRecalled
                    ? "bg-destructive/10 text-destructive border-destructive/30"
                    : scanStats.isSuspicious
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      : "bg-green-500/10 text-green-600 border-green-500/30",
                )}
              >
                {isRecalled
                  ? "Safety Recall • DO NOT USE"
                  : isInvalid
                    ? "Invalid Product • Warning"
                    : scanStats.isSuspicious
                      ? "Warning • High Scans"
                      : "Authentic Product"}
              </Badge>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-none mb-2 break-words text-balance">
                {isInvalid ? errorTitle : product?.productName}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base font-medium tracking-tight break-words pr-4">
                {isInvalid
                  ? errorDescription
                  : isAuthenticated
                    ? product?.brand
                    : "Authenticated Manufacturer"}
              </p>
              {product?.composition && (
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-primary/60 bg-primary/5 w-fit px-3 py-1 rounded-full border border-primary/10">
                  <ShieldCheck className="h-3 w-3" />
                  {product.composition}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 overflow-hidden border-t border-border/50 pt-6">
            <div className="flex-1 w-full">
              <p className="text-muted-foreground text-[10px] font-bold mb-1 uppercase tracking-widest">
                Batch of medicines
              </p>
              <p className="font-mono text-lg sm:text-xl tracking-[0.2em] font-black break-all">
                {isAuthenticated
                  ? product?.batchNumber?.toUpperCase()
                  : product?.batchNumber
                    ? `${product.batchNumber.slice(0, 3)}***${product.batchNumber.slice(-1)}`
                    : "****"}
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <p className="text-muted-foreground text-[10px] font-bold mb-1 uppercase tracking-widest">
                Exp. date
              </p>
              <p className="font-mono text-sm sm:text-base tracking-wider font-bold">
                {product?.expiryDate
                  ? new Date(product.expiryDate).toLocaleDateString(undefined, {
                      month: "2-digit",
                      year: "2-digit",
                    })
                  : "00/00"}
              </p>
            </div>
          </div>

          {/* Product Media Gallery integrated into the card */}
          {product?.images && product.images.length > 0 && (
            <div className="mt-8 pt-8 border-t border-border/50 pointer-events-auto">
              <div className="flex items-center justify-between mb-4 px-1">
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">
                  Product media assets
                </p>
                <div className="flex gap-1.5">
                  {product.images.map((_, i) => (
                    <div key={i} className="h-1 w-3 rounded-full bg-primary/20" />
                  ))}
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory hide-scrollbar">
                {product.images.map((img, i) => (
                  <div
                    key={i}
                    className="shrink-0 w-[180px] h-[120px] sm:w-[240px] sm:h-[160px] rounded-2xl overflow-hidden border border-border/50 bg-muted/20 snap-center relative shadow-sm hover:border-primary/30 transition-all"
                  >
                    <img
                      src={resolveMediaUrl(img)}
                      alt={`${product.productName} ${i+1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

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
  const [verificationStatus, setVerificationStatus] = useState({
    isInvalid: false,
    isRecalled: false,
    errorTitle: "",
    errorDescription: "",
  });
  const { user, isAuthenticated } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const [userInteracted, setUserInteracted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { isMobileDevice, hasCameraAPI } = useDevice();

  const defaultView: ScanView = isMobileDevice ? "camera" : "upload";
  const [scanView, setScanView] = useState<ScanView | null>(null);

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
      const parts = saltToVerify.split(":");
      const batchSalt = parts[0];
      const unitIndexStr = parts[1] || "0";
      const providedUnitHash = parts[2];
      const unitIndex = parseInt(unitIndexStr, 10);

      // Client-side Integrity check
      if (providedUnitHash) {
        const expectedHash = await deriveUnitHash(batchSalt, unitIndex);
        if (providedUnitHash !== expectedHash) {
          setVerificationStatus({
            isInvalid: true,
            isRecalled: false,
            errorTitle: "Tampered QR Code",
            errorDescription: "This sequence has been altered. Cryptographic integrity check failed.",
          });
          setScanned(true);
          setLoading(false);
          return;
        }
      }

      // 3. Blockchain Verification (Primary Source of Truth)
      const blockchainResult = await verifyOnBlockchain(batchSalt, controller.signal);

      if (!blockchainResult.isValid || !blockchainResult.record) {
        setVerificationStatus({
          isInvalid: true,
          isRecalled: false,
          errorTitle: "Product Not Found",
          errorDescription: "This product is not registered on the ChainTrust blockchain network.",
        });
        setScanned(true);
        setLoading(false);
        return;
      }

      let finalProduct: ScanResult["product"] = {
        productId: blockchainResult.record.blockchainId,
        productName: blockchainResult.record.productName,
        brand: blockchainResult.record.manufacturerName,
        batchNumber: blockchainResult.record.batchId,
        manufactureDate: new Date(blockchainResult.record.timestamp).toISOString(),
        images: blockchainResult.record.images || [],
        composition: "",
        unitIndex,
        unitNumber: unitIndex + 1,
        totalUnits: 0,
        expiryDate: blockchainResult.record.expiryDate ? new Date(blockchainResult.record.expiryDate).toISOString() : undefined,
      };

      let finalStats = {
        count: 1,
        blockchainHash: blockchainResult.record.transactionHash || "Verified",
        isSuspicious: false,
        suspiciousReason: "",
      };

      let isRecalled = blockchainResult.isRecalled;

      // 4. Enrich from Backend if possible
      try {
        const result: ScanResult = await verifyScan(saltToVerify, getVisitorId(), undefined, undefined, controller.signal);
        if (result.isValid && result.product) {
          finalProduct = { ...finalProduct, ...result.product };
          finalStats = {
            count: result.scanCount || 1,
            blockchainHash: result.blockchainHash || finalStats.blockchainHash,
            isSuspicious: result.isSuspicious || false,
            suspiciousReason: result.suspiciousReason || "",
          };
        } else if (result.isRecalled && !blockchainResult.isValid) {
          isRecalled = true;
          if (result.product) finalProduct = { ...finalProduct, ...result.product };
        }
      } catch (err) {
        console.warn("Backend metadata unavailable, relying on blockchain safety record.");
      }

      setProduct(finalProduct);
      setScanStats(finalStats);
      setVerificationStatus({
        isInvalid: false,
        isRecalled: isRecalled,
        errorTitle: isRecalled ? "Safety Recall" : "",
        errorDescription: isRecalled ? "CRITICAL: This batch of medicines has been recalled by the manufacturer. Do not consume." : "",
      });
      setScanned(true);

      if (searchParams.has("salt") || searchParams.has("id")) {
        router.replace("/verify", { scroll: false });
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
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
    setShowSaveDialog(true);
  };

  const onScanSuccess = (decodedText: string) => {
    try {
      const url = new URL(decodedText);
      const isVerifyPath = url.pathname.includes("/verify");
      const hasSalt = url.searchParams.has("salt") || url.searchParams.has("id");

      if (!isVerifyPath || !hasSalt) {
        toast.error("Unrecognized QR Code");
        return;
      }

      const salt = url.searchParams.get("salt") || url.searchParams.get("id");
      if (salt) {
        setQrInput(salt);
        handleScan(salt);
      }
    } catch {
      if (decodedText.includes(":")) {
        setQrInput(decodedText);
        handleScan(decodedText);
      } else {
        toast.error("Invalid Format");
      }
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

  const isManufacturer = user?.role === "manufacturer";
  const isMobileFullscreenCamera = isMobileDevice && scanView === "camera" && !scanned && !loading;

  return (
    <div className={cn("relative font-sans h-full flex flex-col", !isAuthenticated && "layout-contained bg-muted/30 min-h-screen")}>
      {!isAuthenticated && !isMobileFullscreenCamera && <div className="absolute inset-0 bg-grid-pattern-global opacity-30 pointer-events-none" />}
      {!isAuthenticated && !isMobileFullscreenCamera && (
        <header className="h-14 lg:h-16 border-b bg-background/80 backdrop-blur-md flex items-center px-4 lg:px-8 shrink-0 z-20">
          <Link href="/" className="flex items-center gap-2 group">
            <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-bold text-lg tracking-tight text-foreground">
              ChainTrust <span className="text-primary">Verify</span>
            </span>
          </Link>
        </header>
      )}

      <main className="overflow-hidden relative flex-1 flex flex-col">
        {loading ? (
          <LoadingScreen message="Verifying with Blockchain..." className="flex-1" />
        ) : !scanned ? (
          <div className={cn("flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300", isMobileFullscreenCamera ? "p-0" : !isAuthenticated && "p-4 sm:p-8", "min-h-0")}>
            {isMobileFullscreenCamera ? (
              <VideoScanner 
                isMobileDevice={true} 
                onScanSuccess={onScanSuccess} 
                onSwitchToUpload={() => setScanView("upload")} 
                onClose={() => router.back()} 
              />
            ) : (
              <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6 justify-center">
                <div className="flex-1 max-h-[600px] flex flex-col items-center justify-center bg-card/50 rounded-[2rem] border border-border/50 border-dashed p-4 sm:p-8 shadow-sm relative overflow-hidden">
                  {scanView === "camera" ? (
                    <VideoScanner 
                      isMobileDevice={false} 
                      onScanSuccess={onScanSuccess} 
                      onSwitchToUpload={() => setScanView("upload")} 
                      onClose={() => setScanView("upload")} 
                    />
                  ) : (
                    <UploadScanner 
                      onScanSuccess={onScanSuccess} 
                      onSwitchToCamera={hasCameraAPI ? () => setScanView("camera") : undefined} 
                    />
                  )}
                </div>
                <p className="text-center text-[10px] sm:text-xs font-bold tracking-tight text-muted-foreground/50 px-4">
                  Secure Blockchain Verification • Decentralized Safety Analysis
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className={cn("flex flex-col flex-1 min-h-0 animate-in fade-in zoom-in-95 duration-500", !isAuthenticated && "p-4 sm:p-8 lg:p-0")}>
            <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col min-h-0 mt-2 sm:mt-8 px-2 sm:px-6 relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Verification result</h2>
                  <p className="text-muted-foreground text-sm font-medium mt-1">
                    Blockchain record confirmed for {product?.productName}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Button variant="outline" onClick={() => { setScanned(false); setScanView(defaultView); }} className="rounded-full px-6 w-full sm:w-auto h-12 sm:h-10 font-bold active:scale-95 transition-all">
                    Scan new
                  </Button>
                  {!isManufacturer && (
                    <Button onClick={handleSaveToCabinet} className="rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 px-6 transition-all duration-300 w-full sm:w-auto h-12 sm:h-10 font-black active:scale-95">
                      <BookmarkPlus className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />
                      Save to My Medicines
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-6 sm:gap-8 pb-12">
                <InteractiveResultCard 
                  product={product} 
                  scanStats={scanStats} 
                  isMobileDevice={isMobileDevice} 
                  isAuthenticated={isAuthenticated} 
                  isInvalid={verificationStatus.isInvalid} 
                  isRecalled={verificationStatus.isRecalled} 
                  errorTitle={verificationStatus.errorTitle} 
                  errorDescription={verificationStatus.errorDescription} 
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <Card className={cn("sm:col-span-3 p-6 sm:p-8 border rounded-[2rem] sm:rounded-[2.5rem] flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm", scanStats.isSuspicious ? "bg-amber-500/5 border-amber-500/30" : (verificationStatus.isInvalid || verificationStatus.isRecalled) ? "bg-destructive/5 border-destructive/30" : "bg-green-500/5 border-green-500/30")}>
                    <div className={cn("h-16 w-16 sm:h-20 sm:w-20 rounded-full flex items-center justify-center shrink-0 shadow-inner", (verificationStatus.isInvalid || verificationStatus.isRecalled) ? "bg-destructive/20" : scanStats.isSuspicious ? "bg-amber-500/20" : "bg-green-500/20")}>
                      {(verificationStatus.isInvalid || verificationStatus.isRecalled) ? <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 text-destructive" /> : scanStats.isSuspicious ? <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 text-amber-600" /> : <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />}
                    </div>
                    <div className="flex-1 w-full">
                      <div className="mb-2">
                        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full border", (verificationStatus.isInvalid || verificationStatus.isRecalled) ? "text-destructive border-destructive/30 bg-destructive/10" : scanStats.isSuspicious ? "text-amber-600 border-amber-500/30 bg-amber-500/10" : "text-green-600 border-green-500/30 bg-green-500/10")}>
                          {verificationStatus.isRecalled ? "Public Recall" : verificationStatus.isInvalid ? "Security Alert" : scanStats.isSuspicious ? "Suspicion Alert" : "Authentic Status"}
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-black leading-tight text-foreground">
                        {verificationStatus.isRecalled ? "RECALLED: Batch of medicines flagged unsafe" : verificationStatus.isInvalid ? "Security Warning: Invalid entry" : scanStats.isSuspicious ? "High scan activity warning" : "Verified secure & authentic"}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 font-mono break-all opacity-70">
                        Blockchain Hash: {scanStats.blockchainHash}
                      </p>
                    </div>
                    <div className="flex flex-row md:flex-col justify-between items-center bg-background p-4 rounded-3xl border border-border/50 min-w-[120px] shadow-sm">
                      <p className="text-[10px] font-black text-muted-foreground opacity-60 uppercase tracking-widest">Scans</p>
                      <p className={cn("text-3xl font-black tabular-nums", scanStats.isSuspicious ? "text-amber-600" : "text-primary")}>{scanStats.count}</p>
                    </div>
                  </Card>

                  <Card className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-border/50 bg-card/50 shadow-sm transition-all hover:bg-card">
                    <p className="text-[10px] font-black text-muted-foreground mb-3 opacity-60 uppercase tracking-widest">Expiration</p>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary"><Clock className="h-5 w-5" /></div>
                      <p className="font-black text-base text-foreground">{product?.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : "N/A"}</p>
                    </div>
                  </Card>
                  
                  <Card className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-border/50 bg-card/50 shadow-sm transition-all hover:bg-card">
                    <p className="text-[10px] font-black text-muted-foreground mb-3 opacity-60 uppercase tracking-widest">Unit serial</p>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary"><PackageCheck className="h-5 w-5" /></div>
                      <p className="font-black text-base truncate text-foreground">#{product?.unitNumber}</p>
                    </div>
                  </Card>

                  <Card className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-border/50 bg-card/50 shadow-sm transition-all hover:bg-card">
                    <p className="text-[10px] font-black text-muted-foreground mb-3 opacity-60 uppercase tracking-widest">Provenance</p>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary"><Building2 className="h-5 w-5" /></div>
                      <p className="font-black text-base truncate text-foreground">Blockchain</p>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showLoginDialog && (
        <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
          <AlertDialogContent className="rounded-[2rem]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black">Account required</AlertDialogTitle>
              <AlertDialogDescription className="font-medium">Please log in to save medicines to your personalized list and receive safety alerts if this batch of medicines is ever recalled.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full font-bold">Continue Browsing</AlertDialogCancel>
              <AlertDialogAction className="rounded-full bg-primary hover:bg-primary/90 font-bold" asChild>
                <Link href="/login">Login Now</Link>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {showSaveDialog && product && (
        <SaveMedicineDialog 
          open={showSaveDialog} 
          onOpenChange={setShowSaveDialog} 
          product={product} 
          qrInput={qrInput}
        />
      )}
    </div>
  );
}

export default function VerifyPage() {
  const { user } = useAuth();
  const isManufacturer = user?.role === "manufacturer";

  const SideNav = isManufacturer ? ManufacturerSidebar : CustomerSidebar;
  const MobileNav = isManufacturer ? ManufacturerMobileSidebar : CustomerMobileSidebar;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <AppShell
        sidebar={<SideNav />}
        mobileSidebar={(props) => <MobileNav {...props} />}
      >
        <VerifyContent />
      </AppShell>
    </Suspense>
  );
}
