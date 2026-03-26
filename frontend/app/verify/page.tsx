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
import { verifyOnBlockchain } from "@/api/web3-client";
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

// ── NEW: Extracted Interactive Card Component ─────────────────────────────
// By moving the hover states here, we prevent the entire AppShell from re-rendering
function InteractiveResultCard({
  product,
  scanStats,
  isMobileDevice,
}: {
  product: ScanResult["product"] | null;
  scanStats: {
    isSuspicious: boolean;
    count: number;
    blockchainHash: string;
    suspiciousReason?: string | null;
  };
  isMobileDevice: boolean;
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
          scanStats.isSuspicious
            ? "border-amber-500/30 shadow-amber-900/10"
            : "border-green-500/30 shadow-green-900/10",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 opacity-10 pointer-events-none z-0",
            scanStats.isSuspicious ? "bg-amber-500" : "bg-green-500",
          )}
        />

        {!isMobileDevice && (
          <div
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
            style={{
              opacity: glow.opacity,
              background: `radial-gradient(circle 300px at ${glow.x}px ${glow.y}px, ${
                scanStats.isSuspicious
                  ? "rgba(245, 158, 11, 0.15)"
                  : "rgba(16, 185, 129, 0.15)"
              }, transparent)`,
            }}
          />
        )}

        <div className="absolute top-0 right-0 p-6 sm:p-12 opacity-5 pointer-events-none z-0">
          {scanStats.isSuspicious ? (
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
                  "mb-4 px-3 py-1 font-bold tracking-widest uppercase text-[10px] backdrop-blur-sm",
                  scanStats.isSuspicious
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : "bg-green-500/10 text-green-600 border-green-500/30",
                )}
              >
                {scanStats.isSuspicious
                  ? "Warning • High Scans"
                  : "Blockchain Verified"}
              </Badge>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-none mb-2 break-words">
                {product?.productName}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base font-medium tracking-tight break-words pr-4">
                {product?.brand}
              </p>
            </div>
          </div>

          <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 overflow-hidden border-t border-border/50 pt-6">
            <div className="flex-1 w-full">
              <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase mb-1">
                Manufacturing Batch
              </p>
              <p className="font-mono text-lg sm:text-xl tracking-[0.2em] font-black break-all">
                {product?.batchNumber?.toUpperCase()}
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase mb-1">
                Exp. Date
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

      const blockchainResult = await verifyOnBlockchain(
        batchSalt,
        controller.signal,
      );
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
        const result: ScanResult = await verifyScan(
          saltToVerify,
          visitorId,
          undefined,
          undefined,
          controller.signal,
        );
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
        if (err.name === "AbortError") throw err;
        console.warn("DB Metadata unavailable, using blockchain data.");
      }

      setProduct(finalProduct);
      setScanStats(finalStats);
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
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 animate-in fade-in zoom-in-95 duration-300">
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
          </div>
        ) : !scanned ? (
          <div
            className={cn(
              "flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300",
              isMobileFullscreenCamera
                ? "p-0"
                : !isAuthenticated && "p-4 sm:p-8",
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
                <p className="text-center text-[10px] sm:text-xs font-bold tracking-tight text-muted-foreground/50 px-4">
                  Secure Blockchain Verification • No-Storage Policy
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col flex-1 min-h-0 animate-in fade-in zoom-in-95 duration-500",
              !isAuthenticated && "p-4 sm:p-8 lg:p-0",
            )}
          >
            <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col min-h-0 mt-2 sm:mt-8 px-2 sm:px-6 relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                    Verification Result
                  </h2>
                  <p className="text-muted-foreground text-sm font-medium mt-1">
                    Authenticity record confirmed on{" "}
                    <span className="whitespace-nowrap">
                      {new Date(
                        product?.manufactureDate || "",
                      ).toLocaleDateString()}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setScanned(false);
                      setScanView(defaultView);
                    }}
                    className="rounded-full px-6 w-full sm:w-auto h-12 sm:h-10"
                  >
                    Scan New
                  </Button>
                  {!isManufacturer && (
                    <Button
                      onClick={handleSaveToCabinet}
                      className="rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 px-6 transition-all duration-300 w-full sm:w-auto h-12 sm:h-10"
                    >
                      <BookmarkPlus className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />
                      Save to My Medicines
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-6 sm:gap-8 pb-12">
                {/* INTERACTIVE RESULT CARD (Extracted Component) */}
                <InteractiveResultCard
                  product={product}
                  scanStats={scanStats}
                  isMobileDevice={isMobileDevice}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <Card
                    className={cn(
                      "sm:col-span-3 p-6 sm:p-8 border rounded-[2rem] sm:rounded-[2.5rem] flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm transition-all duration-300",
                      scanStats.isSuspicious
                        ? "bg-amber-500/5 border-amber-500/30"
                        : "bg-green-500/5 border-green-500/30",
                    )}
                  >
                    <div
                      className={cn(
                        "h-16 w-16 sm:h-20 sm:w-20 rounded-full flex items-center justify-center shrink-0 shadow-inner",
                        scanStats.isSuspicious
                          ? "bg-amber-500/20"
                          : "bg-green-500/20",
                      )}
                    >
                      {scanStats.isSuspicious ? (
                        <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 text-amber-600" />
                      ) : (
                        <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
                      )}
                    </div>

                    <div className="flex-1 w-full">
                      <div className="mb-2">
                        <span
                          className={cn(
                            "text-[10px] font-black tracking-[0.1em] uppercase px-2 py-0.5 rounded-full border",
                            scanStats.isSuspicious
                              ? "text-amber-600 border-amber-500/30 bg-amber-500/10"
                              : "text-green-600 border-green-500/30 bg-green-500/10",
                          )}
                        >
                          {scanStats.isSuspicious
                            ? "Suspicion Alert"
                            : "Authentic Status"}
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-black leading-tight tracking-tight">
                        {scanStats.isSuspicious
                          ? "High Scan Activity Warning"
                          : "Verified Secure & Authentic"}
                      </p>
                      {scanStats.isSuspicious && scanStats.suspiciousReason ? (
                        <p className="text-sm text-amber-700/80 mt-2 font-medium leading-relaxed max-w-prose">
                          {scanStats.suspiciousReason}
                        </p>
                      ) : (
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 font-mono break-all pr-4">
                          VERIFIED BLOCKCHAIN HASH: <br className="sm:hidden" />
                          <span className="opacity-70">
                            {scanStats.blockchainHash.slice(0, 32)}...
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end bg-background p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-border/50 shrink-0 w-full md:w-auto md:min-w-[140px] shadow-sm">
                      <p className="text-[10px] uppercase font-black text-muted-foreground md:mt-1 opacity-60 order-2 md:order-1">
                        Total Scans
                      </p>
                      <p
                        className={cn(
                          "text-3xl sm:text-4xl font-black tabular-nums order-1 md:order-2",
                          scanStats.isSuspicious
                            ? "text-amber-600"
                            : "text-primary",
                        )}
                      >
                        {scanStats.count}
                      </p>
                    </div>
                  </Card>

                  {product?.images && product.images.length > 0 && (
                    <div className="sm:col-span-3 space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] sm:text-xs font-black tracking-widest uppercase text-muted-foreground/60">
                          Product Media Assets
                        </h3>
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px] rounded-full px-2 sm:px-3"
                        >
                          {product.images.length} Image
                          {product.images.length !== 1 && "s"}
                        </Badge>
                      </div>

                      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar">
                        {product.images.map((img, i) => (
                          <div
                            key={i}
                            className="shrink-0 w-[240px] sm:w-[300px] h-[180px] sm:h-[225px] rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden border border-border/50 bg-muted/20 snap-center relative shadow-md hover:scale-[1.02] transition-transform duration-300"
                          >
                            <img
                              src={resolveMediaUrl(img)}
                              alt={`${product.productName} photo ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Card className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-border/50 bg-card/50 hover:bg-card transition-colors shadow-sm">
                    <p className="text-[10px] font-black tracking-widest text-muted-foreground mb-3 sm:mb-4 uppercase opacity-60">
                      Expiration
                    </p>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary shrink-0">
                        <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <p className="font-black text-base sm:text-lg">
                        {product?.expiryDate
                          ? new Date(product.expiryDate).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </Card>

                  <Card className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-border/50 bg-card/50 hover:bg-card transition-colors shadow-sm">
                    <p className="text-[10px] font-black tracking-widest text-muted-foreground mb-3 sm:mb-4 uppercase opacity-60">
                      Unit Serial
                    </p>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary shrink-0">
                        <PackageCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <p className="font-black text-base sm:text-lg truncate">
                        #{product?.unitNumber}
                      </p>
                    </div>
                  </Card>

                  <Card className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-border/50 bg-card/50 hover:bg-card transition-colors shadow-sm">
                    <p className="text-[10px] font-black tracking-widest text-muted-foreground mb-3 sm:mb-4 uppercase opacity-60">
                      Provenance
                    </p>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary shrink-0">
                        <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <p className="font-black text-base sm:text-lg truncate">
                        Registered
                      </p>
                    </div>
                  </Card>

                  {!isAuthenticated && (
                    <Card className="sm:col-span-3 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-primary/20 bg-primary/5 shadow-inner overflow-hidden relative mt-2 sm:mt-0">
                      <div className="absolute top-0 right-0 p-6 sm:p-8 text-primary/10 pointer-events-none">
                        <ShieldCheck className="w-24 h-24 sm:w-32 sm:h-32" />
                      </div>
                      <div className="relative z-10 max-w-xl">
                        <h3 className="text-lg sm:text-xl font-black mb-2 tracking-tight">
                          Protect Your Health Journey
                        </h3>
                        <p className="text-xs sm:text-sm text-foreground/70 font-medium mb-6 leading-relaxed">
                          Log in to save this medicine and receive critical
                          safety alerts if this batch is ever recalled or
                          flagged.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <Button
                            className="w-full sm:w-auto rounded-full h-12 px-8 font-black shadow-lg shadow-primary/20"
                            asChild
                          >
                            <Link href="/login">Login to Save</Link>
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full sm:w-auto rounded-full h-12 px-8 font-black border-primary/20 bg-background/50 hover:bg-primary/5"
                            asChild
                          >
                            <Link href="/register">Become a Member</Link>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {product?.description && (
                    <Card className="sm:col-span-3 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border-border/50 bg-card/50 shadow-sm mt-2 sm:mt-0">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-1.5 w-6 sm:w-8 bg-primary rounded-full shrink-0"></div>
                        <h3 className="text-xs sm:text-sm font-black tracking-widest uppercase text-muted-foreground/80">
                          Patient Guide & Information
                        </h3>
                      </div>
                      <div className="text-sm sm:text-base text-foreground/80 leading-relaxed font-medium">
                        {product.description
                          .split("\n")
                          .filter(Boolean)
                          .map((paragraph, idx) => (
                            <p key={idx} className={idx > 0 ? "mt-4" : ""}>
                              {paragraph}
                            </p>
                          ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent className="rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tight">
              Save your medications
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Create an account to track your medication history across devices
              and receive safety alerts if a batch is recalled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="rounded-full h-12 sm:h-10 mt-0">
              Not Now
            </AlertDialogCancel>
            <AlertDialogAction
              asChild
              className="rounded-full bg-primary shadow-lg shadow-primary/20 h-12 sm:h-10"
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
