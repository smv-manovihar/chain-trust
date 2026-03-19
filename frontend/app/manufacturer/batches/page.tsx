"use client";

import { useState, useEffect } from "react";
import { 
  Copy, 
  QrCode, 
  Search, 
  RefreshCw, 
  Package, 
  Plus, 
  MoreVertical, 
  ExternalLink, 
  AlertTriangle,
  FileSpreadsheet,
  ChevronRight,
  TrendingUp,
  Boxes
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listBatches, recallBatch } from "@/api/batch.api";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  batchSalt: string;
}

const BatchActions = ({ batch, onRecall, onCopyHash }: { batch: Batch; onRecall: (b: Batch) => void; onCopyHash: (h: string) => void }) => (
  <DropdownMenuContent align="end" className="rounded-2xl w-52 p-1.5 shadow-xl border-border/50 bg-background/95 backdrop-blur-xl">
    <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2 px-3">
      <Link href={`/manufacturer/batches/${batch._id}`} className="flex items-center">
        <QrCode className="mr-2 h-4 w-4 text-primary" /> 
        <span className="font-medium">View & Print QR</span>
      </Link>
    </DropdownMenuItem>
    <DropdownMenuItem className="rounded-xl cursor-pointer py-2 px-3" onClick={() => onCopyHash(batch.blockchainHash)}>
      <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" /> 
      <span className="font-medium">Copy Blockchain Hash</span>
    </DropdownMenuItem>
    {!batch.isRecalled && (
      <DropdownMenuItem className="rounded-xl cursor-pointer py-2 px-3 text-destructive focus:bg-destructive/10" onClick={() => onRecall(batch)}>
        <AlertTriangle className="mr-2 h-4 w-4" /> 
        <span className="font-medium">Recall Batch</span>
      </DropdownMenuItem>
    )}
  </DropdownMenuContent>
);

export default function BatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBatches = async () => {
    try {
      setIsRefreshing(true);
      setError("");
      const res = await listBatches();
      setBatches(res.batches || []);
    } catch (err: any) {
      console.error("Failed to fetch batches:", err);
      setError("Failed to load batches from server.");
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
    toast.success("Blockchain hash copied!");
  };

  const handleRecall = async (batch: Batch) => {
    if (!confirm(`Recall batch ${batch.batchNumber}? This is irreversible on the blockchain.`)) return;
    try {
      const { requestExecutionAccounts } = await import("@/api/web3-client");
      const { recallProductOnChain } = await import("@/lib/blockchain-utils");
      
      const accounts = await requestExecutionAccounts();
      if (!accounts?.[0]) throw new Error("Wallet not connected.");
      
      toast.loading("Broadcasting recall to blockchain...");
      await recallProductOnChain(batch.batchSalt, accounts[0]);
      await recallBatch(batch._id);
      
      fetchBatches();
      toast.success("Batch successfully recalled.");
    } catch (err: any) {
      toast.error(err.message || "Recall failed.");
    }
  };

  const filteredBatches = batches.filter(
    (b) =>
      b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground">
            Batch Operations
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-0.5">
            Monitor production runs and manage unit tracking.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
           <Button 
             variant="outline" 
             size="icon" 
             onClick={fetchBatches} 
             className="rounded-xl h-10 w-10 border-border/50 hover:bg-muted/10 transition-all shadow-sm"
             title="Refresh Batches"
           >
             <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
           </Button>
           <Button asChild className="flex-1 sm:flex-none rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
             <Link href="/manufacturer/batches/new">
               <Plus className="h-4 w-4 mr-2" />
               Enroll New Batch
             </Link>
           </Button>
        </div>
      </div>

      {/* Stats Quick Look */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <Card className="p-4 bg-muted/30 border-none shadow-none flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <Boxes className="h-5 w-5" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Batches</p>
               <h4 className="text-xl font-black">{batches.filter(b => !b.isRecalled).length}</h4>
            </div>
         </Card>
         <Card className="p-4 bg-muted/30 border-none shadow-none flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <TrendingUp className="h-5 w-5" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Scans</p>
               <h4 className="text-xl font-black">{batches.reduce((sum, b) => sum + b.totalScans, 0).toLocaleString()}</h4>
            </div>
         </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search batches..." 
              className="pl-11 h-12 bg-card/50 border-border/50 rounded-2xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-[2rem] border border-border/50 bg-card/50 overflow-hidden shadow-sm">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="w-[300px] h-14 text-[10px] font-black uppercase tracking-widest px-6">ID & Product</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Units</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Engagement</TableHead>
                <TableHead className="text-right h-14 px-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.map((batch) => (
                <TableRow 
                  key={batch._id} 
                  className="group hover:bg-muted/20 border-border/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/manufacturer/batches/${batch._id}`)}
                >
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono font-bold text-primary text-sm tracking-tight">{batch.batchNumber}</span>
                      <span className="text-sm font-semibold truncate">{batch.productName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {format(new Date(batch.manufactureDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full bg-background/50">{batch.quantity.toLocaleString()}</Badge>
                  </TableCell>
                  <TableCell>
                    {batch.isRecalled ? (
                      <Badge variant="destructive" className="font-black px-3 rounded-full text-[10px] uppercase tracking-tighter">Recalled</Badge>
                    ) : (
                      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200 font-black px-3 rounded-full text-[10px] uppercase tracking-tighter">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-bold text-sm tracking-tight">
                    {batch.totalScans} <span className="text-[10px] text-muted-foreground uppercase ml-1">Scans</span>
                  </TableCell>
                  <TableCell className="px-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <BatchActions 
                        batch={batch} 
                        onRecall={handleRecall} 
                        onCopyHash={handleCopyHash} 
                      />
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Mobile Card View (No Tables) */}
      <div className="md:hidden space-y-4 pb-8">
        {filteredBatches.map((batch) => (
          <Card 
            key={batch._id} 
            className="p-5 rounded-[2rem] border-border/50 bg-card/40 backdrop-blur-sm relative overflow-hidden cursor-pointer"
            onClick={() => router.push(`/manufacturer/batches/${batch._id}`)}
          >
            <div className="flex justify-between items-start mb-4">
               <div>
                  <Badge variant="outline" className="mb-2 font-mono text-[10px] px-2 py-0.5 border-primary/20 text-primary">{batch.batchNumber}</Badge>
                  <h3 className="font-bold text-lg leading-tight">{batch.productName}</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">{format(new Date(batch.manufactureDate), 'MMMM dd, yyyy')}</p>
               </div>
               {batch.isRecalled ? (
                  <Badge variant="destructive" className="font-black px-2 py-0.5 text-[9px] uppercase">Recalled</Badge>
               ) : (
                  <Badge className="bg-green-500/10 text-green-600 border-green-200 font-black px-2 py-0.5 text-[9px] uppercase">Active</Badge>
               )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
               <div className="bg-muted/30 p-3 rounded-2xl border border-border/30">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Quantity</p>
                  <p className="text-sm font-bold">{batch.quantity.toLocaleString()}</p>
               </div>
               <div className="bg-muted/30 p-3 rounded-2xl border border-border/30">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Scans</p>
                  <p className="text-sm font-bold">{batch.totalScans}</p>
               </div>
            </div>

            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
               <Button asChild className="flex-1 rounded-xl h-12 gap-2" variant="outline">
                  <Link href={`/manufacturer/batches/${batch._id}`}>
                    <QrCode className="h-4 w-4" />
                    Print
                  </Link>
               </Button>
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border/50">
                        <MoreVertical className="h-5 w-5" />
                     </Button>
                  </DropdownMenuTrigger>
                   <BatchActions 
                      batch={batch} 
                      onRecall={handleRecall} 
                      onCopyHash={handleCopyHash} 
                   />
               </DropdownMenu>
            </div>
          </Card>
        ))}
        {filteredBatches.length === 0 && (
           <div className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No matches found.</p>
           </div>
        )}
      </div>
    </div>
  );
}
