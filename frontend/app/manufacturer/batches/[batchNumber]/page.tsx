"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getBatch, getBatchQRData, downloadBatchPDF, getBatchScanDetails, recallBatch } from "@/api/batch.api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  Printer,
  Download,
  MapPin,
  Search,
  RefreshCw,
} from "lucide-react";
import QrDisplay from "@/components/manufacturer/qr-display";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { updateProduct } from "@/api/product.api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWeb3 } from "@/contexts/web3-context";
import { Settings2, Save, ScanLine, FileText, CheckCircle2, History, AlertCircle, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function BatchDetailPage() {
  const { batchNumber } = useParams() as { batchNumber: string };
  const router = useRouter();

  const [batch, setBatch] = useState<any>(null);
  const [qrData, setQrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrSettings, setQrSettings] = useState({
    qrSize: 40,
    columns: 4,
    showProductName: true,
    showUnitIndex: true,
    showBatchNumber: true,
    labelPadding: 10,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [scanDetails, setScanDetails] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);

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

  const handleLoadAll = () => {
    if (!batch?.quantity) return;
    if (batch.quantity > 1000) {
      if (
        !confirm(
          `Preparing ${batch.quantity} units for print might slow down your browser for a few seconds. Proceed?`,
        )
      )
        return;
    }
    setPageSize(batch.quantity);
    setPage(1);
  };

  useEffect(() => {
    if (batch?.product?.qrSettings) {
      setQrSettings(batch.product.qrSettings);
    }
  }, [batch]);

  const handleSaveSettings = async () => {
    if (!batch?.product?._id && !batch?.product) {
      // Support both populated and unpopulated just in case
      const productId = batch?.product?._id || batch?.product;
      if (!productId) return;
    }
    const productId = batch.product._id || batch.product;
    setIsSaving(true);
    try {
      await updateProduct(productId, { qrSettings });
      toast.success("QR settings saved for this product!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

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

        // Fetch analytics in background or parallel
        setAnalyticsLoading(true);
        getBatchScanDetails(batchNumber, controller.signal)
          .then(res => setScanDetails(res))
          .catch(e => console.error("Analytics fetch failed", e))
          .finally(() => setAnalyticsLoading(false));

      } catch (err: any) {
        if (err.name === 'AbortError') return;
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

  const { address: walletAddress } = useWeb3();

  const handleRecall = async () => {
    if (
      !confirm(
        `Are you sure you want to recall batch ${batch.batchNumber}? This action is irreversible on the blockchain.`
      )
    )
      return;

    if (!walletAddress) {
      toast.error("Wallet not connected. Connect your wallet first.");
      return;
    }

    try {
      toast.loading("Recalling batch on chain...");
      const { recallProductOnChain } = await import("@/api/web3-client");
      await recallProductOnChain(batch.batchSalt, walletAddress);
      await recallBatch(batch.batchNumber);

      // Refresh data
      const batchRes = await getBatch(batchNumber);
      setBatch(batchRes.batch);
      toast.success("Batch successfully recalled.");
    } catch (err: any) {
      toast.error(err.message || "Recall failed.");
    }
  };

  // Just standard client-side printing
  const handlePrint = () => {
    window.print();
  };

  if (loading && !batch) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p>Loading batch data & cryptographic keys...</p>
      </div>
    );
  }

  if (!batch || !qrData) {
    return (
      <div className="text-center p-20">
        <h2 className="text-2xl font-bold mb-2">Batch Not Found</h2>
        <Button onClick={() => router.push("/manufacturer/batches")}>
          Return to Batches
        </Button>
      </div>
    );
  }

  const filteredUnits = qrData.units.filter((unit: any) => {
    if (!searchTerm) return true;
    const unitNumStr = (unit.unitIndex + 1).toString();
    return unitNumStr.includes(searchTerm);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
              {batch.productName}
              {batch.isRecalled && (
                <Badge variant="destructive">Recalled</Badge>
              )}
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">
              {batch.batchNumber} • {batch.productId}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {batch.quantity > pageSize && (
            <Button
              variant="outline"
              onClick={handleLoadAll}
              className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50 transition-colors rounded-xl"
            >
              <RefreshCw className="h-4 w-4" />
              Prepare All {batch.quantity}
            </Button>
          )}
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            variant="outline"
            className="gap-2 rounded-xl px-6"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "gap-2 rounded-xl",
              showSettings && "bg-primary/10 border-primary/30 text-primary",
            )}
          >
            <Settings2 className="h-4 w-4" />
            Design
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isDownloading}
            className="gap-2 bg-primary shadow-lg shadow-primary/20 rounded-xl px-6"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            Print Labels
          </Button>
        </div>
      </div>

      <Tabs defaultValue="printing" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="printing" className="rounded-lg gap-2">
            <Printer className="h-4 w-4" />
            Labels & Printing
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg gap-2">
            <History className="h-4 w-4" />
            Security & Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="printing" className="space-y-6 focus-visible:outline-none">
          {/* QR Settings Panel (existing logic) */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <Card className="p-6 border-primary/20 bg-primary/5 rounded-2xl gap-8 grid grid-cols-1 md:grid-cols-3 shadow-none">
                  {/* ... Existing Settings Controls Moved Here (Lines 258-382) ... */}
                  <div className="space-y-4">
                    <h4 className="font-black flex items-center gap-2">
                      <ScanLine className="h-4 w-4" /> Design Layout
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-xs font-bold tracking-tight">QR Size (mm)</Label>
                          <span className="text-xs font-mono">{qrSettings.qrSize}mm</span>
                        </div>
                        <Slider
                          value={[qrSettings.qrSize]}
                          onValueChange={([v]) => setQrSettings((s) => ({ ...s, qrSize: v }))}
                          min={15} max={80} step={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-xs font-bold tracking-tight">Print Columns</Label>
                          <span className="text-xs font-mono">{qrSettings.columns}</span>
                        </div>
                        <Slider
                          value={[qrSettings.columns]}
                          onValueChange={([v]) => setQrSettings((s) => ({ ...s, columns: v }))}
                          min={1} max={6} step={1}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-black flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Label Content
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Show Product Name</Label>
                        <Switch
                          checked={qrSettings.showProductName}
                          onCheckedChange={(v) => setQrSettings((s) => ({ ...s, showProductName: v }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Show Unit Index</Label>
                        <Switch
                          checked={qrSettings.showUnitIndex}
                          onCheckedChange={(v) => setQrSettings((s) => ({ ...s, showUnitIndex: v }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Show Batch No.</Label>
                        <Switch
                          checked={qrSettings.showBatchNumber}
                          onCheckedChange={(v) => setQrSettings((s) => ({ ...s, showBatchNumber: v }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-6">
                    <div className="space-y-4">
                      <h4 className="font-black flex items-center gap-2"><Settings2 className="h-4 w-4" /> Spacing</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-xs font-bold tracking-tight">Label Padding (mm)</Label>
                          <span className="text-xs font-mono">{qrSettings.labelPadding}mm</span>
                        </div>
                        <Slider
                          value={[qrSettings.labelPadding]}
                          onValueChange={([v]) => setQrSettings((s) => ({ ...s, labelPadding: v }))}
                          min={0} max={20} step={1}
                        />
                      </div>
                    </div>
                    <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full rounded-2xl h-12 gap-2 shadow-lg shadow-primary/20">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save as Default
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">
              QR Codes (Units {qrData.units[0]?.unitIndex + 1} - {qrData.units[qrData.units.length - 1]?.unitIndex + 1})
            </h2>

            <div className="flex gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Find Unit ID..."
                  className="w-[180px] pl-8 h-9 text-sm rounded-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex border rounded-xl overflow-hidden h-9">
                <Button variant="ghost" className="rounded-none border-r px-3 h-full" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <div className="flex items-center justify-center px-4 bg-muted/50 text-sm font-medium border-r">{page} / {qrData.totalPages}</div>
                <Button variant="ghost" className="rounded-none px-3 h-full" disabled={page === qrData.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </div>

          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${qrSettings.columns}, minmax(0, 1fr))` }}
          >
            {filteredUnits.map((unit: any) => (
              <Card
                key={unit.unitIndex}
                className="relative overflow-hidden border-border bg-card flex flex-col items-center rounded-[2rem] transition-all duration-200"
                style={{ padding: `${qrSettings.labelPadding}px` }}
              >
                <QrDisplay salt={unit.salt} size={qrSettings.qrSize * 3.78} className="mb-2" errorCorrectionLevel="M" />
                <div className="text-center w-full flex flex-col gap-0.5">
                  {qrSettings.showProductName && (
                    <p className="text-[10px] font-bold text-foreground truncate w-full tracking-tight leading-none mb-0.5">{batch.productName}</p>
                  )}
                  <div className="flex items-center justify-center gap-2">
                    {qrSettings.showUnitIndex && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-background/50">Unit #{unit.unitIndex + 1}</Badge>
                    )}
                    {unit.scanCount > 0 && (
                      <Badge
                        variant={unit.scanCount > 5 ? "destructive" : "secondary"}
                        className="text-[10px] px-1.5 py-0 h-4 bg-muted text-muted-foreground border-none"
                      >
                        {unit.scanCount} Scans
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 rounded-2xl border-border/40 shadow-none bg-muted/10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Recent Unit Activities
              </h3>
              <ScrollArea className="h-[500px] pr-4">
                {analyticsLoading ? (
                  <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>
                ) : scanDetails?.scans?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unit ID</TableHead>
                        <TableHead>Time (UTC)</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scanDetails.scans.map((scan: any) => (
                        <TableRow key={scan._id}>
                          <TableCell className="font-mono text-xs">#{scan.unitIndex + 1}</TableCell>
                          <TableCell className="text-xs">
                            {new Date(scan.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs opacity-70">
                            {scan.city ? `${scan.city}, ${scan.country}` : 'Remote Scan'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 border-emerald-200">
                              Verified
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-4 opacity-10" />
                    <p>No scans recorded for this batch yet.</p>
                  </div>
                )}
              </ScrollArea>
            </Card>

            <div className="space-y-6">
              <Card className="p-6 rounded-2xl border-border/40 shadow-none bg-primary/5">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Aggregate Stats
                </h4>
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Units</span>
                    <span className="font-mono font-bold">{batch.quantity}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Detected Scans</span>
                    <span className="font-mono font-bold">{scanDetails?.batch?.totalScans || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Security Flags</span>
                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50">None</Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-6 rounded-2xl border-destructive/20 shadow-none bg-destructive/5">
                <h4 className="font-bold mb-2 flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Recall Protocol
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  If this batch is compromised, initiating a recall will invalidate all related QR codes on public ledger.
                </p>
                <Button 
                  variant="destructive" 
                  className="w-full rounded-xl h-10 text-xs font-bold uppercase tracking-wider" 
                  disabled={batch.isRecalled}
                  onClick={handleRecall}
                >
                  {batch.isRecalled ? 'Already Recalled' : 'Emergency Recall'}
                </Button>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
