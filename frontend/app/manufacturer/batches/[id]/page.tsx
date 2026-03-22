"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getBatch, getBatchQRData, downloadBatchPDF } from "@/api/batch.api";
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
import { Settings2, Save, ScanLine, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function BatchDetailPage() {
  const { id: batchId } = useParams() as { id: string };
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
  const fetchAbortRef = useRef<AbortController | null>(null);

  const handleDownloadPDF = async () => {
    if (!batch) return;
    try {
      setIsDownloading(true);
      const blob = await downloadBatchPDF(batchId);
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
    if (!batchId) return;

    const loadData = async () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      setLoading(true);
      try {
        const [batchRes, qrRes] = await Promise.all([
          getBatch(batchId, controller.signal),
          getBatchQRData(batchId, page, pageSize, controller.signal),
        ]);
        setBatch(batchRes.batch);
        setQrData(qrRes);
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
  }, [batchId, page, pageSize]);

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

      {/* QR Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-6 border-primary/20 bg-primary/5 rounded-[2rem] gap-8 grid grid-cols-1 md:grid-cols-3 shadow-none">
              <div className="space-y-4">
                <h4 className="font-black flex items-center gap-2">
                  <ScanLine className="h-4 w-4" /> Design Layout
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs font-bold tracking-tight">
                        QR Size (mm)
                      </Label>
                      <span className="text-xs font-mono">
                        {qrSettings.qrSize}mm
                      </span>
                    </div>
                    <Slider
                      value={[qrSettings.qrSize]}
                      onValueChange={([v]) =>
                        setQrSettings((s) => ({ ...s, qrSize: v }))
                      }
                      min={15}
                      max={80}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs font-bold tracking-tight">
                        Print Columns
                      </Label>
                      <span className="text-xs font-mono">
                        {qrSettings.columns}
                      </span>
                    </div>
                    <Slider
                      value={[qrSettings.columns]}
                      onValueChange={([v]) =>
                        setQrSettings((s) => ({ ...s, columns: v }))
                      }
                      min={1}
                      max={6}
                      step={1}
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
                    <Label className="text-xs font-medium">
                      Show Product Name
                    </Label>
                    <Switch
                      checked={qrSettings.showProductName}
                      onCheckedChange={(v) =>
                        setQrSettings((s) => ({ ...s, showProductName: v }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Show Unit Index
                    </Label>
                    <Switch
                      checked={qrSettings.showUnitIndex}
                      onCheckedChange={(v) =>
                        setQrSettings((s) => ({ ...s, showUnitIndex: v }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Show Batch No.
                    </Label>
                    <Switch
                      checked={qrSettings.showBatchNumber}
                      onCheckedChange={(v) =>
                        setQrSettings((s) => ({ ...s, showBatchNumber: v }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <h4 className="font-black flex items-center gap-2">
                    <Settings2 className="h-4 w-4" /> Spacing
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs font-bold tracking-tight">
                        Label Padding (mm)
                      </Label>
                      <span className="text-xs font-mono">
                        {qrSettings.labelPadding}mm
                      </span>
                    </div>
                    <Slider
                      value={[qrSettings.labelPadding]}
                      onValueChange={([v]) =>
                        setQrSettings((s) => ({ ...s, labelPadding: v }))
                      }
                      min={0}
                      max={20}
                      step={1}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full rounded-2xl h-12 gap-2 shadow-lg shadow-primary/20"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save as Default
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mt-8">
        <h2 className="text-xl font-black">
          QR Codes (Units {qrData.units[0]?.unitIndex + 1} -{" "}
          {qrData.units[qrData.units.length - 1]?.unitIndex + 1})
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
            <Button
              variant="ghost"
              className="rounded-none border-r px-3 h-full"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <div className="flex items-center justify-center px-4 bg-muted/50 text-sm font-medium border-r">
              {page} / {qrData.totalPages}
            </div>
            <Button
              variant="ghost"
              className="rounded-none px-3 h-full"
              disabled={page === qrData.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${qrSettings.columns}, minmax(0, 1fr))`,
        }}
      >
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground">
            No units found matching that ID.
          </div>
        ) : (
          filteredUnits.map((unit: any) => (
            <Card
              key={unit.unitIndex}
              className="relative overflow-hidden border-border bg-card flex flex-col items-center rounded-[2rem] transition-all duration-200"
              style={{ padding: `${qrSettings.labelPadding}px` }}
            >
              <QrDisplay
                salt={unit.salt}
                size={qrSettings.qrSize * 3.78}
                className="mb-2"
                errorCorrectionLevel="M" // Set default error correction to 'M'
              />
              <div className="text-center w-full flex flex-col gap-0.5">
                {qrSettings.showProductName && (
                  <p className="text-[10px] font-bold text-foreground truncate w-full tracking-tight leading-none mb-0.5">
                    {batch.productName}
                  </p>
                )}

                <div className="flex items-center justify-center gap-2">
                  {qrSettings.showUnitIndex && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 bg-background/50"
                    >
                      Unit #{unit.unitIndex + 1}
                    </Badge>
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
          ))
        )}
      </div>
    </div>
  );
}
