"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getBatch,
  getBatchQRData,
  downloadBatchPDF,
  getBatchScanDetails,
  recallBatch,
  restoreBatch,
} from "@/api/batch.api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  History,
  TrendingUp,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ScanLine,
  Search,
  MapPin,
  Clock,
  Loader2,
  CheckCircle2,
  Settings2,
  Wallet,
  Zap,
  Info,
  Download,
} from "lucide-react";
import QrDisplay from "@/components/manufacturer/qr-display";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWeb3 } from "@/contexts/web3-context";
import { PageHeader } from "@/components/ui/page-header";
import { updateProduct } from "@/api/product.api";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

export default function BatchDetailPage() {
  const { batchNumber } = useParams() as { batchNumber: string };
  const router = useRouter();
  const isMobile = useIsMobile();

  const [batch, setBatch] = useState<any>(null);
  const [qrData, setQrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrSettings, setQrSettings] = useState({
    qrSize: 15,
    showProductName: true,
    showUnitIndex: true,
    showBatchNumber: true,
    labelPadding: 5,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [scanDetails, setScanDetails] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingWalletAction, setPendingWalletAction] = useState<
    "recall" | "restore" | null
  >(null);
  const [pendingSettings, setPendingSettings] = useState<any>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const handleSaveSettings = async () => {
    if (!batch || !pendingSettings) return;
    try {
      setIsSavingSettings(true);
      await updateProduct(batch.productId, { qrSettings: pendingSettings });
      setQrSettings(pendingSettings);
      toast.success("Design settings updated successfully");
      setIsSettingsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!batch) return;
    try {
      setIsDownloading(true);
      const blob = await downloadBatchPDF(batchNumber);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `batch-${batch.batchNumber}-labels.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success("PDF sheet generated successfully!");
    } catch (err) {
      console.error("PDF Download failed:", err);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (batch?.product?.qrSettings) {
      setQrSettings(batch.product.qrSettings);
    }
  }, [batch]);

  useEffect(() => {
    if (!batchNumber) return;

    const loadData = async () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      setLoading(true);
      try {
        const [batchRes, qrRes] = await Promise.all([
          getBatch(batchNumber, controller.signal),
          getBatchQRData(batchNumber, page, pageSize, controller.signal),
        ]);
        setBatch(batchRes.batch);
        setQrData(qrRes);

        setAnalyticsLoading(true);
        getBatchScanDetails(batchNumber, controller.signal)
          .then((res) => setScanDetails(res))
          .catch((e) => console.error("Analytics fetch failed", e))
          .finally(() => setAnalyticsLoading(false));
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Failed to load batch:", err);
      } finally {
        if (fetchAbortRef.current === controller) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => fetchAbortRef.current?.abort();
  }, [batchNumber, page, pageSize]);

  const { address: walletAddress, connect: connectWallet } = useWeb3();

  // Auto-open confirmation dialog after wallet connection if an action was pending
  useEffect(() => {
    if (walletAddress && pendingWalletAction) {
      setIsConfirmDialogOpen(true);
      // NOTE: pendingWalletAction is reset when the dialog is closed or action is performed
    }
  }, [walletAddress, pendingWalletAction]);

  const handleOpenConfirm = (action: "recall" | "restore") => {
    setPendingWalletAction(action);
    if (!walletAddress) {
      connectWallet();
    } else {
      setIsConfirmDialogOpen(true);
    }
  };

  const handleRecall = async () => {
    if (!walletAddress) {
      toast.error("Wallet not connected.");
      return;
    }

    try {
      const loadingToast = toast.loading("Executing blockchain recall...");
      const { recallProductOnChain } = await import("@/api/web3-client");
      const receipt = await recallProductOnChain(
        batch.batchSalt,
        walletAddress,
      );
      const txHash = receipt.transactionHash;

      await recallBatch(batch.batchNumber, txHash);

      const batchRes = await getBatch(batchNumber);
      setBatch(batchRes.batch);
      toast.dismiss(loadingToast);
      toast.success("Batch successfully recalled.");
    } catch (err: any) {
      toast.error(err.message || "Recall failed.");
    }
  };

  const handleRestore = async () => {
    if (!walletAddress) {
      toast.error("Wallet not connected.");
      return;
    }

    try {
      const loadingToast = toast.loading("Executing blockchain restoration...");
      const { restoreProductOnChain } = await import("@/api/web3-client");
      const receipt = await restoreProductOnChain(
        batch.batchSalt,
        walletAddress,
      );
      const txHash = receipt.transactionHash;

      await restoreBatch(batch.batchNumber, txHash);

      const batchRes = await getBatch(batchNumber);
      setBatch(batchRes.batch);
      toast.dismiss(loadingToast);
      toast.success("Batch successfully restored.");
    } catch (err: any) {
      toast.error(err.message || "Restoration failed.");
    }
  };

  if (loading && !batch) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground font-medium">
        <Loader2
          className="h-10 w-10 animate-spin text-primary mb-4"
          aria-hidden="true"
        />
        <p>Synchronizing blockchain states...</p>
      </div>
    );
  }

  if (!batch || !qrData) {
    return (
      <div className="text-center p-20">
        <h2 className="text-2xl font-bold mb-2">Batch not found</h2>
        <Button
          onClick={() => router.push("/manufacturer/batches")}
          className="rounded-xl"
        >
          Return to batches
        </Button>
      </div>
    );
  }

  const filteredUnits = qrData.units.filter((unit: any) => {
    if (!searchTerm) return true;
    const unitNumStr = (unit.unitIndex + 1).toString();
    return unitNumStr.includes(searchTerm);
  });

  const flaggedUnitsCount =
    scanDetails?.scans?.filter(
      (s: any) => (batch.scanCounts?.[String(s.unitIndex)] || 0) > 5,
    ).length || 0;

  return (
    <div className="flex flex-col h-full min-h-0 max-w-7xl mx-auto w-full gap-4 sm:gap-6 pb-6">
      <PageHeader
        title={batch.productName}
        description={`Batch: ${batch.batchNumber} • Units: ${batch.quantity}`}
        stats={
          <div className="flex items-center gap-2">
            {batch.isRecalled && (
              <Badge
                variant="destructive"
                className="animate-pulse bg-destructive/10 text-destructive border-destructive/20 px-3 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold"
              >
                Recalled
              </Badge>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full text-muted-foreground hover:text-primary"
                    aria-label="Blockchain info"
                  >
                    <Info className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  className="max-w-[calc(100vw-48px)] p-4 glass-card border-primary/20 shadow-2xl"
                  side="top"
                >
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                      Immutable blockchain source
                    </p>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold opacity-50">
                        Batch salt (Root)
                      </p>
                      <p className="text-[10px] font-mono break-all bg-muted/50 p-2 rounded-lg leading-tight border border-border/40">
                        {batch.batchSalt}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold opacity-50">
                        SKU / Product ID
                      </p>
                      <p className="text-[10px] font-mono break-all bg-muted/50 p-2 rounded-lg leading-tight border border-border/40">
                        {batch.productId}
                      </p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
        backHref="/manufacturer/batches"
        actions={
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            size="lg"
            className="flex-1 sm:flex-none gap-2 bg-primary shadow-xl shadow-primary/20 rounded-full h-11 sm:h-12 font-bold px-4 sm:px-8"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">QR Labels PDF</span>
            <span className="sm:hidden text-xs">QR Labels PDF</span>
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0 w-full"
      >
        <TabsList className="grid w-full sm:w-[300px] grid-cols-2 flex-none rounded-2xl bg-muted/30 p-1 h-12 border border-border/40">
          <TabsTrigger
            value="info"
            className="rounded-xl gap-2 h-10 data-[state=active]:shadow-xl data-[state=active]:bg-background font-bold transition-all text-xs sm:text-sm"
          >
            <Info className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Info</span>
          </TabsTrigger>
          <TabsTrigger
            value="labels"
            className="rounded-xl gap-2 h-10 data-[state=active]:shadow-xl data-[state=active]:bg-background font-bold transition-all text-xs sm:text-sm"
          >
            <ScanLine className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Batch Units</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 relative">
          <ScrollArea className="h-full pr-0 sm:pr-4 pb-8">
            <TabsContent
              value="labels"
              className="space-y-6 focus-visible:outline-none m-0 mt-6"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black flex items-center gap-2 tracking-tight">
                  <ScanLine
                    className="h-5 w-5 text-primary"
                    aria-hidden="true"
                  />
                  Unit Identification List
                </h2>

                <div className="flex items-center gap-2">
                  <ResponsiveDialog
                    open={isSettingsOpen}
                    onOpenChange={setIsSettingsOpen}
                  >
                    <ResponsiveDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full h-9 gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 font-bold"
                        onClick={() => setPendingSettings({ ...qrSettings })}
                      >
                        <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Settings</span>
                      </Button>
                    </ResponsiveDialogTrigger>
                    <ResponsiveDialogContent className="max-w-md p-0 overflow-hidden">
                      <ResponsiveDialogHeader className="p-6 pb-2">
                        <ResponsiveDialogTitle className="text-xl font-black">
                          Customize Labels
                        </ResponsiveDialogTitle>
                        <ResponsiveDialogDescription className="text-xs font-medium">
                          Adjust the physical layout of your batch labels.
                        </ResponsiveDialogDescription>
                      </ResponsiveDialogHeader>

                      <ScrollArea className="max-h-[70dvh] px-6">
                        <div className="space-y-8 py-4">
                          {/* Preview Section */}
                          <div className="p-6 rounded-3xl bg-muted/20 border border-border/40 flex flex-col items-center justify-center gap-4 relative overflow-hidden group">
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 opacity-40">
                              <ShieldCheck className="h-3 w-3" />
                              <span className="text-[8px] font-bold">
                                Print safe preview
                              </span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-inner border border-border/20 transition-transform duration-500 group-hover:scale-105">
                              <QrDisplay
                                salt={qrData?.units[0]?.salt || "preview"}
                                // Preview scaling: 1mm = 3.78px at 96 DPI. Here we use a multiplier to fit the card.
                                size={(pendingSettings?.qrSize || 15) * 4.5}
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-black text-muted-foreground">
                                Live scale check
                              </p>
                              <p className="text-[8px] text-muted-foreground/60 font-bold mt-1 italic">
                                Approximate on-screen representation
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-8">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold opacity-60 flex items-center gap-2">
                                  <ScanLine
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                  />
                                  QR code size (mm)
                                </Label>
                                <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                                  {pendingSettings?.qrSize}mm
                                </span>
                              </div>
                              <Slider
                                value={[pendingSettings?.qrSize || 15]}
                                min={10}
                                max={60}
                                step={1}
                                onValueChange={([val]) =>
                                  setPendingSettings({
                                    ...pendingSettings,
                                    qrSize: val,
                                  })
                                }
                                className="py-2"
                              />
                              <p className="text-[9px] text-muted-foreground font-medium italic opacity-60">
                                Standard standard: 15mm-25mm for small medicine
                                packs.
                              </p>
                            </div>

                            <div className="space-y-4">
                              <Label className="text-xs font-black opacity-60 flex items-center gap-2">
                                <ShieldCheck
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
                                Visibility Options
                              </Label>
                              <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/10 border border-border/40 hover:bg-muted/20 transition-colors">
                                  <div>
                                    <Label className="text-[11px] font-bold block leading-none">
                                      Product Name
                                    </Label>
                                    <p className="text-[8px] text-muted-foreground font-medium mt-1">
                                      Top alignment
                                    </p>
                                  </div>
                                  <Switch
                                    checked={pendingSettings?.showProductName}
                                    onCheckedChange={(val) =>
                                      setPendingSettings({
                                        ...pendingSettings,
                                        showProductName: val,
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/10 border border-border/40 hover:bg-muted/20 transition-colors">
                                  <div>
                                    <Label className="text-[11px] font-bold block leading-none">
                                      Batch Number
                                    </Label>
                                    <p className="text-[8px] text-muted-foreground font-medium mt-1">
                                      Sub-text identifier
                                    </p>
                                  </div>
                                  <Switch
                                    checked={pendingSettings?.showBatchNumber}
                                    onCheckedChange={(val) =>
                                      setPendingSettings({
                                        ...pendingSettings,
                                        showBatchNumber: val,
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/10 border border-border/40 hover:bg-muted/20 transition-colors">
                                  <div>
                                    <Label className="text-[11px] font-bold block leading-none">
                                      Unit Index
                                    </Label>
                                    <p className="text-[8px] text-muted-foreground font-medium mt-1">
                                      Serialization suffix
                                    </p>
                                  </div>
                                  <Switch
                                    checked={pendingSettings?.showUnitIndex}
                                    onCheckedChange={(val) =>
                                      setPendingSettings({
                                        ...pendingSettings,
                                        showUnitIndex: val,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-black opacity-60">
                                  Label padding (mm)
                                </Label>
                                <span className="text-xs font-mono font-black">
                                  {pendingSettings?.labelPadding}mm
                                </span>
                              </div>
                              <Slider
                                value={[pendingSettings?.labelPadding || 5]}
                                min={0}
                                max={20}
                                step={1}
                                onValueChange={([val]) =>
                                  setPendingSettings({
                                    ...pendingSettings,
                                    labelPadding: val,
                                  })
                                }
                                className="py-2"
                              />
                            </div>
                          </div>
                        </div>
                      </ScrollArea>

                      <div className="flex gap-4 p-6 pt-2">
                        <Button
                          variant="ghost"
                          className="flex-1 rounded-full h-11 font-bold text-xs"
                          onClick={() => setIsSettingsOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1 rounded-full h-11 font-bold text-xs shadow-xl shadow-primary/20"
                          onClick={handleSaveSettings}
                          disabled={isSavingSettings}
                        >
                          {isSavingSettings && (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          )}
                          Save Design
                        </Button>
                      </div>
                    </ResponsiveDialogContent>
                  </ResponsiveDialog>

                  <Badge
                    variant="outline"
                    className="rounded-full px-4 py-1 bg-primary/5 text-primary border-primary/20 font-bold text-[10px]"
                  >
                    Batch Units
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between glass-card p-3 rounded-full border-primary/10 shadow-sm">
                <div className="flex border rounded-full overflow-hidden h-11 w-full sm:w-auto bg-background/50 border-border/40">
                  <Button
                    variant="ghost"
                    className="flex-1 sm:flex-none rounded-none border-r px-4 sm:px-5 font-bold"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <div className="flex items-center justify-center px-4 sm:px-6 text-xs sm:text-sm font-bold font-mono whitespace-nowrap bg-muted/20">
                    Page {page} / {qrData.totalPages}
                  </div>
                  <Button
                    variant="ghost"
                    className="flex-1 sm:flex-none rounded-none px-4 sm:px-5 font-bold"
                    disabled={page === qrData.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>

                <div className="relative w-full sm:w-[280px]">
                  <Input
                    placeholder="Search unit index..."
                    className="w-full h-11 pl-12 bg-background/50 border border-primary/10 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all rounded-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-50 pointer-events-none z-10"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div
                className="grid gap-4 sm:gap-6"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                }}
              >
                {filteredUnits.length > 0 ? (
                  filteredUnits.map((unit: any) => (
                    <Card
                      key={unit.unitIndex}
                      className="relative overflow-hidden group border-primary/10 bg-gradient-to-br from-background to-muted/30 flex flex-col items-center justify-center rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/40 p-4 sm:p-6 border-2"
                    >
                      <div className="relative">
                        <QrDisplay
                          salt={unit.salt}
                          size={qrSettings.qrSize * (isMobile ? 2.5 : 3.5)}
                          className="mb-4 grayscale group-hover:grayscale-0 transition-all duration-700 opacity-80 group-hover:opacity-100"
                          errorCorrectionLevel="M"
                        />
                        {unit.scanCount > 5 && (
                          <div className="absolute -top-2 -right-2 h-5 w-5 sm:h-6 sm:w-6 bg-red-500 rounded-full border-4 border-background animate-pulse" />
                        )}
                      </div>
                      <div className="text-center w-full space-y-1.5">
                        <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground truncate w-full opacity-60">
                          {batch.productName}
                        </p>
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="font-bold font-mono text-[11px] sm:text-xs">
                            Unit ID #{unit.unitIndex + 1}
                          </span>
                          {unit.scanCount > 0 && (
                            <Badge
                              variant={
                                unit.scanCount > 5 ? "destructive" : "secondary"
                              }
                              className="h-5 px-3 rounded-full text-[8px] sm:text-[9px] border-none font-bold"
                            >
                              {unit.scanCount} scans
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-24 text-muted-foreground opacity-30 grayscale">
                    <Search className="h-12 w-12 mb-4" aria-hidden="true" />
                    <p className="font-bold text-lg">No units found</p>
                    <p className="text-sm text-center">
                      Try adjusting your search criteria or unit index.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="info"
              className="space-y-6 focus-visible:outline-none m-0 mt-6"
            >
              {/* Scan Analytics Suite Link */}
              <Card className="p-5 sm:p-8 rounded-3xl bg-primary/5 border-primary/20 shadow-2xl shadow-primary/5 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 group hover:bg-primary/[0.08] transition-all duration-500 border-2">
                <div className="flex items-center gap-4 sm:gap-6 w-full lg:w-auto">
                  <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-2xl sm:rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20 shrink-0">
                    <BarChart3
                      className="h-7 w-7 sm:h-10 sm:w-10"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight mb-1">
                      Scan Analytics
                    </h3>
                    <p className="text-[11px] sm:text-sm text-muted-foreground font-medium max-w-md leading-snug">
                      Visualize unit trajectories, geographic demand, and
                      blockchain compliance metrics.
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="w-full lg:w-auto h-12 sm:h-14 px-8 sm:px-10 rounded-full bg-primary shadow-2xl shadow-primary/30 group-hover:scale-105 transition-all font-bold text-xs sm:text-sm"
                >
                  <Link
                    href={`/manufacturer/analytics/scans?batchNumber=${batch.batchNumber}`}
                  >
                    Open Analytics Suite{" "}
                    <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </Card>

              {/* Stat Cards - Adjusted text sizes for mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <Card className="p-6 sm:p-8 rounded-3xl bg-muted/10 border-border/40 flex items-center justify-between group hover:bg-primary/[0.02] transition-all h-32 sm:h-40 border-2">
                  <div className="space-y-1 sm:space-y-2">
                    <p className="text-[9px] sm:text-xs font-bold text-muted-foreground uppercase opacity-60">
                      TOTAL SCANS
                    </p>
                    <h4 className="text-3xl sm:text-5xl font-black font-mono tracking-tighter tabular-nums">
                      {scanDetails?.batch?.totalScans || 0}
                    </h4>
                  </div>
                  <div className="h-14 w-14 sm:h-20 sm:w-20 bg-primary/10 rounded-2xl sm:rounded-3xl flex items-center justify-center border border-primary/10 shrink-0">
                    <TrendingUp
                      className="h-7 w-7 sm:h-10 sm:w-10 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                </Card>

                <Card
                  className={cn(
                    "p-6 sm:p-8 rounded-3xl border-border/40 flex items-center justify-between group transition-all h-32 sm:h-40 border-2",
                    flaggedUnitsCount > 0
                      ? "bg-destructive/[0.03] hover:bg-destructive/[0.05] border-destructive/30"
                      : "bg-muted/10 hover:bg-muted/20",
                  )}
                >
                  <div className="space-y-1 sm:space-y-2">
                    <p className="text-[9px] sm:text-xs font-bold text-muted-foreground uppercase opacity-60">
                      SUSPICIOUS CLUSTERS
                    </p>
                    <h4
                      className={cn(
                        "text-3xl sm:text-5xl font-black font-mono tracking-tighter tabular-nums",
                        flaggedUnitsCount > 0 ? "text-destructive" : "",
                      )}
                    >
                      {flaggedUnitsCount}
                    </h4>
                  </div>
                  <div
                    className={cn(
                      "h-14 w-14 sm:h-20 sm:w-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border shrink-0",
                      flaggedUnitsCount > 0
                        ? "bg-destructive/10 border-destructive/20"
                        : "bg-muted/30 border-muted-foreground/10",
                    )}
                  >
                    <ShieldAlert
                      className={cn(
                        "h-7 w-7 sm:h-10 sm:w-10",
                        flaggedUnitsCount > 0
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recall Management Card */}
                <Card
                  className={cn(
                    "p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-primary/5 transition-all border-2",
                    batch.isRecalled
                      ? "bg-green-500/[0.03] border-green-500/20"
                      : "bg-destructive/[0.03] border-destructive/20",
                  )}
                >
                  <h4
                    className={cn(
                      "font-bold text-[10px] sm:text-xs mb-3 flex items-center gap-2",
                      batch.isRecalled ? "text-green-600" : "text-destructive",
                    )}
                  >
                    {batch.isRecalled ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <ShieldAlert className="h-4 w-4" />
                    )}
                    Recall management
                  </h4>
                  {walletAddress ? (
                    <>
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed font-medium mb-6 sm:mb-8">
                        {batch.isRecalled
                          ? "Restoration will re-enable all unit verifications on the blockchain."
                          : "Triggering a recall will mark all units in this batch as counterfeit."}
                      </p>
                      <Button
                        variant={batch.isRecalled ? "outline" : "destructive"}
                        className={cn(
                          "w-full rounded-full h-12 sm:h-14 text-[10px] sm:text-[11px] font-bold transition-all border-2 active:scale-[0.98]",
                          batch.isRecalled
                            ? "border-green-500/30 text-green-600 bg-white hover:bg-green-50 shadow-sm"
                            : "shadow-xl shadow-destructive/20",
                        )}
                        onClick={() =>
                          handleOpenConfirm(
                            batch.isRecalled ? "restore" : "recall",
                          )
                        }
                      >
                        {batch.isRecalled ? "Restore batch" : "Trigger recall"}
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-center py-2">
                      <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center relative mb-4">
                        <Wallet className="h-7 w-7 text-primary" />
                        <div className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-background" />
                      </div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground font-medium mb-5 leading-relaxed">
                        Authenticate with your manufacturing wallet to manage
                        on-chain batch states.
                      </p>
                      <Button
                        onClick={() =>
                          handleOpenConfirm(
                            batch.isRecalled ? "restore" : "recall",
                          )
                        }
                        className="w-full rounded-full h-12 font-bold gap-2 text-[10px] sm:text-xs shadow-lg shadow-primary/20"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        Connect Wallet
                      </Button>
                    </div>
                  )}
                </Card>

                <div className="space-y-4 sm:space-y-6">
                  <AlertDialog
                    open={isConfirmDialogOpen}
                    onOpenChange={(open) => {
                      setIsConfirmDialogOpen(open);
                      if (!open) setPendingWalletAction(null);
                    }}
                  >
                    <AlertDialogContent className="rounded-[2.5rem] border-primary/20 p-6 sm:p-8 max-w-[95vw] sm:max-w-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl sm:text-2xl font-black">
                          {pendingWalletAction === "restore"
                            ? "Restore batch?"
                            : "Trigger recall?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs sm:text-sm font-medium pt-2">
                          {pendingWalletAction === "restore"
                            ? "Re-validate units for consumer verification on the blockchain."
                            : "This will invalidate all associated QR codes across the global network."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-3 sm:gap-4 mt-6 sm:mt-8 flex-col sm:flex-row">
                        <AlertDialogCancel className="rounded-full border-none bg-muted h-11 sm:h-12 font-bold px-6 sm:px-8">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={
                            pendingWalletAction === "restore"
                              ? handleRestore
                              : handleRecall
                          }
                          className={cn(
                            "rounded-full h-11 sm:h-12 px-6 sm:px-8 font-bold text-xs sm:text-sm shadow-lg transition-all active:scale-[0.98]",
                            pendingWalletAction === "restore"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/20",
                          )}
                        >
                          {pendingWalletAction === "restore"
                            ? "Confirm restoration"
                            : "Confirm recall"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Batch Summary Card */}
                  <Card className="p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-muted/10 border-border/40 border-2">
                    <h4 className="font-bold text-[9px] sm:text-[10px] text-muted-foreground mb-4 sm:mb-6">
                      Batch summary
                    </h4>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex justify-between items-center text-[11px] sm:text-xs border-b border-border/40 pb-3">
                        <span className="font-medium opacity-60">
                          Created date
                        </span>
                        <span className="font-bold font-mono">
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] sm:text-xs pt-1">
                        <span className="font-medium opacity-60">
                          Total quantity
                        </span>
                        <span className="font-bold font-mono">
                          {batch.quantity} units
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </div>
      </Tabs>
    </div>
  );
}
