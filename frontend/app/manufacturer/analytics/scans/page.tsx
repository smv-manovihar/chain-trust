"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Boxes,
  TrendingUp,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Search,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { listBatches, getBatchScanDetails } from "@/api/batch.api";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export default function ScanAnalysisPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [scanData, setScanData] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const batchesAbortRef = useRef<AbortController | null>(null);
  const detailsAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchBatches = async () => {
      if (batchesAbortRef.current) batchesAbortRef.current.abort();
      const controller = new AbortController();
      batchesAbortRef.current = controller;

      try {
        const res = await listBatches({}, controller.signal);
        const batchList = res.batches || [];
        setBatches(batchList);
        if (batchList.length > 0) {
          setSelectedBatchId(batchList[0]._id);
        } else {
          setIsLoading(false);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error("Failed to fetch batches:", error);
        toast.error("Could not load batches.");
        setIsLoading(false);
      }
    };
    fetchBatches();
    return () => batchesAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!selectedBatchId) return;

    const fetchDetails = async () => {
      if (detailsAbortRef.current) detailsAbortRef.current.abort();
      const controller = new AbortController();
      detailsAbortRef.current = controller;

      setDetailsLoading(true);
      try {
        const res = await getBatchScanDetails(selectedBatchId, controller.signal);
        setScanData(res);
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error("Failed to fetch batch details:", error);
        toast.error("Could not load scan details for this batch.");
      } finally {
        if (detailsAbortRef.current === controller) {
          setDetailsLoading(false);
          setIsLoading(false);
        }
      }
    };
    fetchDetails();
    return () => detailsAbortRef.current?.abort();
  }, [selectedBatchId]);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">
          Scanning network for intelligence...
        </p>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
          <Boxes className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl tracking-tighter">No Batches Found</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-md">
            You need to enroll at least one batch before you can analyze scan
            data.
          </p>
        </div>
        <Button asChild className="rounded-full px-8 font-bold">
          <Link href="/manufacturer/batches/new">Enroll Now</Link>
        </Button>
      </div>
    );
  }

  // Aggregate geo data and unit data
  const geoStats: Record<string, number> = {};
  const timeline: any[] = [];
  const unitStats: any[] = [];

  if (scanData) {
    // Geo Stats
    scanData.scans.forEach((scan: any) => {
      const location =
        scan.city && scan.country
          ? `${scan.city}, ${scan.country}`
          : scan.country || "Unknown";
      geoStats[location] = (geoStats[location] || 0) + 1;
    });

    // Unit Breakdown (from top scans in details)
    const unitMap: Record<number, number> = {};
    scanData.scans.forEach((s: any) => {
      unitMap[s.unitIndex] = (unitMap[s.unitIndex] || 0) + 1;
    });

    Object.keys(unitMap).forEach((idx) => {
      unitStats.push({ index: Number(idx), count: unitMap[Number(idx)] });
    });
  }

  const sortedGeo = Object.entries(geoStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Link
          href="/manufacturer/analytics"
          className="flex items-center gap-2 text-[11px] tracking-tight text-muted-foreground hover:text-primary transition-colors group"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
          Back to Analytics
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl tracking-tighter leading-none">
              Scan Analysis
            </h1>
            <p className="text-muted-foreground text-sm font-medium mt-2">
              Unit-level tracking and geographic distribution analysis.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] tracking-tight opacity-60 italic">
            <ShieldCheck className="w-3 h-3" /> Root Source: Blockchain + GeoIP
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar: Batch Selector */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-[11px] tracking-tight text-muted-foreground px-1">
            Select Batch
          </h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {batches.map((batch) => (
              <button
                key={batch._id}
                onClick={() => setSelectedBatchId(batch._id)}
                className={`w-full text-left p-4 rounded-3xl border transition-all group ${
                  selectedBatchId === batch._id
                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                    : "bg-card/40 border-border/40 hover:border-primary/40 hover:bg-card/60"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm tracking-tight">{batch.batchNumber}</p>
                  <ChevronRight
                    className={`h-4 w-4 opacity-50 ${selectedBatchId === batch._id ? "translate-x-1" : ""}`}
                  />
                </div>
                <p
                  className={`text-[10px] font-bold truncate ${selectedBatchId === batch._id ? "opacity-90" : "text-muted-foreground"}`}
                >
                  {batch.productName}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Main Workspace */}
        <div className="lg:col-span-3 space-y-8">
          {detailsLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
            </div>
          ) : scanData ? (
            <>
              {/* Layer 1: Global Stats for Batch */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-6 rounded-[2rem] border-none bg-primary/5 space-y-2">
                  <p className="text-[10px] tracking-tight text-primary">
                    Total Batch Scans
                  </p>
                  <h3 className="text-3xl tracking-tighter">
                    {scanData.batch.totalScans}
                  </h3>
                </Card>
                <Card className="p-6 rounded-[2rem] border-none bg-blue-500/5 space-y-2">
                  <p className="text-[10px] tracking-tight text-blue-600">
                    Unique Unit Index
                  </p>
                  <h3 className="text-3xl tracking-tighter">
                    {unitStats.length}
                  </h3>
                </Card>
                <Card className="p-6 rounded-[2rem] border-none bg-zinc-900 text-white lg:col-span-1 col-span-2 flex items-center justify-center text-center">
                  <div>
                    <p className="text-[9px] tracking-tight text-zinc-500 mb-1">
                      Status
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm tracking-tight">
                        Operational
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Layer 2: Geographic Distribution */}
              <div className="grid lg:grid-cols-2 gap-8">
                <Card className="p-8 rounded-[2.5rem] bg-card/40 border-border/40 backdrop-blur-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg tracking-tight">Geo Distribution</h3>
                  </div>

                  <div className="space-y-4">
                    {sortedGeo.length > 0 ? (
                      sortedGeo.map(([loc, count], i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <p className="text-sm font-bold truncate">
                                {loc}
                              </p>
                              <Badge
                                variant="secondary"
                                className="rounded-full font-bold opacity-80"
                              >
                                {count} scans
                              </Badge>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                                style={{
                                  width: `${(count / scanData.batch.totalScans) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground font-medium py-10 text-center italic">
                        No geographic data captured yet.
                      </p>
                    )}
                  </div>
                </Card>

                {/* Layer 3: Unit Level Risk Analysis */}
                <Card className="p-8 rounded-[2.5rem] bg-card/40 border-border/40 backdrop-blur-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg tracking-tight">High-Risk Units</h3>
                  </div>

                  <div className="space-y-3">
                    {[...scanData.scans]
                      .sort((a, b) => (b.count || 0) - (a.count || 0))
                      .slice(0, 5)
                      .map((scan, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-destructive/20 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <Layers
                              className={`h-4 w-4 ${scan.count > 5 ? "text-destructive" : "text-muted-foreground"}`}
                            />
                            <div>
                              <p className="text-sm font-bold tracking-tight">
                                Unit Index #{scan.unitIndex}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-medium">
                                Last:{" "}
                                {format(
                                  new Date(scan.createdAt),
                                  "MMM dd, HH:mm",
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm ${scan.count > 5 ? "text-destructive" : ""}`}
                            >
                              {scan.count || 1} Scans
                            </p>
                            {scan.count > 5 && (
                              <p className="text-[8px] text-destructive tracking-tight mt-0.5">
                                Alert Triggered
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    {scanData.scans.length === 0 && (
                      <p className="text-xs text-muted-foreground font-medium py-10 text-center italic">
                        No suspicious units detected.
                      </p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Layer 4: Real-time Activity Log */}
              <Card className="rounded-[2.5rem] bg-card/40 border-border/40 backdrop-blur-sm p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Activity className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg tracking-tight">
                      Recent Scan Activity
                    </h3>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold tracking-tight text-[9px] px-3">
                    Live Feed
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="px-6 py-4 text-[10px] tracking-tight text-muted-foreground">
                          Timestamp
                        </th>
                        <th className="px-6 py-4 text-[10px] tracking-tight text-muted-foreground">
                          Location
                        </th>
                        <th className="px-6 py-4 text-[10px] tracking-tight text-muted-foreground">
                          Result
                        </th>
                        <th className="px-6 py-4 text-[10px] tracking-tight text-muted-foreground">
                          IP Address
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {scanData.scans
                        .slice(0, 10)
                        .map((scan: any, i: number) => (
                          <tr
                            key={i}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <p className="text-xs font-bold whitespace-nowrap">
                                {format(
                                  new Date(scan.createdAt),
                                  "MMM dd, HH:mm:ss",
                                )}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs font-medium text-muted-foreground truncate max-w-[150px]">
                                {scan.city}, {scan.country}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-bold">
                                Verified
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-[10px] font-mono p-1 bg-muted/50 rounded inline-block text-muted-foreground">
                                {scan.ip}
                              </p>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center opacity-40">
              <ShieldCheck className="h-16 w-16" />
              <p className="text-sm tracking-tight">
                No Intelligence Data Captured
              </p>
              <p className="text-xs font-medium max-w-xs">
                Scan intelligence is generated when consumers verify units from
                this batch.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
