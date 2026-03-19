"use client";

import { useState, useEffect } from "react";
import { Copy, Eye, QrCode, Search, Filter, Loader2, AlertCircle, RefreshCw, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listBatches, recallBatch } from "@/api/batch.api";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner"; // Assuming you have a toast component, or standard alert works

interface Batch {
  _id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  manufactureDate: string;
  totalScans: number;
  isRecalled: boolean;
  blockchainHash: string;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBatches = async () => {
    try {
      setIsRefreshing(true);
      setLoading(true);
      setError("");
      const res = await listBatches();
      setBatches(res.batches || []);
    } catch (err: any) {
      console.error("Failed to fetch batches:", err);
      setError("Failed to load batches from server. Please try again.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast("Copied to clipboard", { description: "Blockchain transaction hash copied." });
  };

  const handleRecall = async (id: string) => {
    if (!confirm("Are you sure you want to recall this batch? This will flag ALL products in this batch as invalid during verification.")) return;
    
    try {
      await recallBatch(id);
      fetchBatches(); // Reload
      toast("Batch Recalled", { description: "The batch has been successfully recalled." });
    } catch (err: any) {
      console.error("Failed to recall batch:", err);
      alert("Failed to recall batch: " + err.message);
    }
  };

  const filteredBatches = batches.filter(
    (b) =>
      b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.productId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-6 py-4">
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Manufactured Batches</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">Manage and monitor production runs.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            className="sm:hidden"
            onClick={fetchBatches}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            className="hidden sm:flex gap-2"
            onClick={fetchBatches}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button asChild className="flex-1 sm:flex-none rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <Link href="/manufacturer/batches/new">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Enroll New Batch</span>
              <span className="sm:hidden">New Batch</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-none flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by batch number, name, or product ID..." 
            className="pl-9 h-10 rounded-lg text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2 h-10 px-4 rounded-lg text-sm" onClick={fetchBatches}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="flex-none p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-3 border border-destructive/20 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm">Loading batch data...</p>
        </div>
      ) : filteredBatches.length > 0 ? (
        <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-card shadow-sm flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold px-4 py-3 text-xs uppercase tracking-wider">Batch ID / Product</TableHead>
                  <TableHead className="font-semibold py-3 text-xs uppercase tracking-wider">Units</TableHead>
                  <TableHead className="font-semibold py-3 hidden md:table-cell text-xs uppercase tracking-wider">Mfg Date</TableHead>
                  <TableHead className="font-semibold py-3 text-center text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-semibold py-3 hidden lg:table-cell text-center text-xs uppercase tracking-wider">Scan Activity</TableHead>
                  <TableHead className="text-right font-semibold px-4 py-3 text-xs uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredBatches.map((batch) => (
                <TableRow key={batch._id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono font-medium text-primary text-sm">{batch.batchNumber}</span>
                      <span className="text-xs text-foreground">{batch.productName} <span className="text-muted-foreground">({batch.productId})</span></span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 font-medium text-sm">{batch.quantity.toLocaleString()}</TableCell>
                  <TableCell className="py-3 hidden md:table-cell text-muted-foreground text-sm">
                    {format(new Date(batch.manufactureDate), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    {batch.isRecalled ? (
                      <Badge variant="destructive" className="font-medium px-2 py-0.5 text-xs">Recalled</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 font-medium px-2 py-0.5 text-xs">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3 hidden lg:table-cell text-center">
                    <div className="flex items-center justify-center gap-1.5">
                       <span className="font-semibold min-w-8 text-right text-sm">{batch.totalScans}</span>
                       <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Scans</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleCopyHash(batch.blockchainHash)} title="Copy Blockchain Hash">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10" title="View & Print QR Codes">
                        <Link href={`/manufacturer/batches/${batch._id}`}>
                           <QrCode className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {!batch.isRecalled && (
                        <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs px-2" onClick={() => handleRecall(batch._id)}>
                          Recall
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-16 text-muted-foreground border border-dashed rounded-xl border-border bg-muted/10">
          <Package className="h-10 w-10 mb-3 text-muted-foreground/50" />
          <p className="text-lg font-medium text-foreground">No batches found</p>
          <p className="mb-6 mt-1 text-center max-w-sm">You haven't enrolled any batches yet or none match your search criteria.</p>
          <Button asChild>
             <Link href="/manufacturer/batches/new">Enroll Your First Batch</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

// Utility for merging tailwind classes locally just for the refresh spin icon
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
