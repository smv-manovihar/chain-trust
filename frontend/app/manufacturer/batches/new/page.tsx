"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  Package,
  Calendar,
  QrCode,
  Loader2,
  AlertCircle,
  Search,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Zap,
  ShieldCheck,
  Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createBatch } from "@/api/batch.api";
import { listProducts } from "@/api/product.api";
import { requestExecutionAccounts } from "@/api/web3-client";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media-url";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CatalogueProduct {
  _id: string;
  name: string;
  productId: string;
  category: string;
  brand: string;
  price: number;
  images: string[];
}

const steps = [
  { number: 1, title: "Identity", icon: Package },
  { number: 2, title: "Batch Metrics", icon: Calendar },
  { number: 3, title: "Blockchain Mint", icon: QrCode },
];

export default function EnrollBatchWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mintProgress, setMintProgress] = useState(0);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Data
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<CatalogueProduct | null>(null);
  const [productSearch, setProductSearch] = useState("");

  // Form
  const [batchData, setBatchData] = useState({
    batchNumber: "",
    quantity: "",
    manufactureDate: "",
    expiryDate: "",
    description: ""
  });

  useEffect(() => {
    listProducts()
      .then(res => setProducts(res.products || []))
      .catch(err => console.error("Failed to load products", err))
      .finally(() => setProductsLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || p.productId.toLowerCase().includes(q));
  }, [products, productSearch]);

  const handleMint = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    setError("");
    setMintProgress(20);

    try {
      const encoder = new TextEncoder();
      const saltInput = `${selectedProduct.productId}-${batchData.batchNumber}-${Date.now()}-${crypto.getRandomValues(new Uint8Array(8)).join("")}`;
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(saltInput));
      const batchSalt = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
      
      setMintProgress(40);
      const accounts = await requestExecutionAccounts();
      if (!accounts?.[0]) throw new Error("Blockchain wallet not detected.");
      
      setMintProgress(60);
      const { registerBatchOnChain } = await import("@/api/web3-client");
      const txResult = await registerBatchOnChain({
        productId: selectedProduct.productId,
        productName: selectedProduct.name,
        brand: selectedProduct.brand,
        batchNumber: batchData.batchNumber,
        batchSalt: batchSalt,
        manufactureDate: Math.floor(new Date(batchData.manufactureDate).getTime() / 1000),
        expiryDate: batchData.expiryDate ? Math.floor(new Date(batchData.expiryDate).getTime() / 1000) : 0,
        quantity: parseInt(batchData.quantity)
      }, accounts[0]);

      setMintProgress(90);
      const savedBatch = await createBatch({
        productRef: selectedProduct._id,
        batchNumber: batchData.batchNumber,
        quantity: parseInt(batchData.quantity),
        manufactureDate: new Date(batchData.manufactureDate).toISOString(),
        expiryDate: batchData.expiryDate ? new Date(batchData.expiryDate).toISOString() : undefined,
        description: batchData.description,
        batchSalt,
        blockchainHash: txResult.transactionHash || txResult.blockHash,
      });

      setMintProgress(100);
      setSuccessId(savedBatch.batch._id);
    } catch (err: any) {
      setError(err.message || "Failed to mint batch.");
    } finally {
      setLoading(false);
    }
  };

  if (successId) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto py-12 text-center space-y-8"
      >
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse" />
          <div className="relative w-24 h-24 bg-green-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl">
            <Check className="h-12 w-12" />
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Batch Enrolled!</h1>
          <p className="text-muted-foreground font-medium mt-2">Units are now verifiable on the public ledger.</p>
        </div>
        <div className="flex justify-center gap-4">
          <Button variant="outline" asChild className="rounded-full px-8"><Link href="/manufacturer/batches">Operations Hub</Link></Button>
          <Button asChild className="rounded-full px-8 bg-primary shadow-lg shadow-primary/20">
             <Link href={`/manufacturer/batches/${successId}`} className="gap-2"><QrCode className="h-4 w-4" /> Print QR Sheet</Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" asChild className="rounded-full"><Link href="/manufacturer/batches"><ArrowLeft className="h-5 w-5" /></Link></Button>
           <div>
              <h1 className="text-3xl font-black tracking-tighter">Mint New Batch</h1>
              <p className="text-muted-foreground text-sm font-medium">Production Run Registration Wizard</p>
           </div>
        </div>
        <div className="flex gap-2">
           {steps.map(s => (
             <div key={s.number} className={cn("h-2 w-16 rounded-full transition-all duration-500", s.number <= currentStep ? "bg-primary shadow-lg shadow-primary/20" : "bg-muted")} />
           ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={currentStep}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
        >
          <Card className="p-1 rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-background to-accent/10 border-none shadow-2xl overflow-hidden">
             <div className="bg-background rounded-[2.4rem] p-6 lg:p-10 space-y-8">
                
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-primary mb-2">
                       <Package className="h-6 w-6" />
                       <h2 className="text-xl font-bold">Select Product</h2>
                    </div>
                    <div className="relative">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input 
                         placeholder="Search your catalogue..." 
                         value={productSearch}
                         onChange={e => setProductSearch(e.target.value)}
                         className="h-12 rounded-2xl border-primary/20 pl-11 shadow-inner"
                       />
                    </div>
                    <ScrollArea className="h-[320px] pr-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                         {filteredProducts.map(p => (
                           <Card 
                             key={p._id} 
                             onClick={() => setSelectedProduct(p)}
                             className={cn(
                               "p-4 rounded-3xl border-2 transition-all cursor-pointer group flex items-center gap-4",
                               selectedProduct?._id === p._id ? "bg-primary/5 border-primary shadow-lg shadow-primary/10" : "border-border/50 hover:border-primary/30"
                             )}
                           >
                              <div className="h-12 w-12 rounded-2xl overflow-hidden bg-muted group-hover:scale-110 transition-transform shrink-0 border border-border">
                                {p.images?.[0] ? <img src={resolveMediaUrl(p.images[0])} alt="" className="w-full h-full object-cover" /> : <Package className="w-full h-full p-3 opacity-20" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate">{p.name}</p>
                                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{p.productId}</p>
                              </div>
                           </Card>
                         ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-primary mb-2">
                       <Calendar className="h-6 w-6" />
                       <h2 className="text-xl font-bold">Batch Metrics</h2>
                    </div>
                    {selectedProduct && (
                      <div className="p-4 bg-muted/30 rounded-2xl flex items-center gap-4 border border-border/50">
                         <Badge className="bg-primary/20 text-primary border-none font-black uppercase text-[10px] tracking-widest">Targeting</Badge>
                         <p className="font-bold text-sm">{selectedProduct.name} <span className="text-muted-foreground font-medium ml-1">({selectedProduct.productId})</span></p>
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Batch Identifier</Label>
                          <Input 
                            placeholder="e.g. BATCH-2024-X91" 
                            value={batchData.batchNumber} 
                            onChange={e => setBatchData(prev => ({...prev, batchNumber: e.target.value}))}
                            className="h-12 rounded-2xl border-primary/20 shadow-inner"
                          />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Quantity (Units to Mint)</Label>
                          <Input 
                            type="number" 
                            placeholder="e.g. 5000" 
                            value={batchData.quantity} 
                            onChange={e => setBatchData(prev => ({...prev, quantity: e.target.value}))}
                            className="h-12 rounded-2xl border-primary/20 shadow-inner"
                          />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Manufacture Date</Label>
                          <Input 
                            type="date" 
                            value={batchData.manufactureDate} 
                            onChange={e => setBatchData(prev => ({...prev, manufactureDate: e.target.value}))}
                            className="h-12 rounded-2xl border-primary/20 shadow-inner"
                          />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Expiry Date (Optional)</Label>
                          <Input 
                            type="date" 
                            value={batchData.expiryDate} 
                            onChange={e => setBatchData(prev => ({...prev, expiryDate: e.target.value}))}
                            className="h-12 rounded-2xl border-primary/20 shadow-inner"
                          />
                       </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-primary mb-2">
                       <QrCode className="h-6 w-6" />
                       <h2 className="text-xl font-bold">Review & Sync</h2>
                    </div>
                    
                    <Card className="p-6 rounded-3xl border-border/50 bg-muted/10 grid sm:grid-cols-3 gap-6">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Product</p>
                          <p className="text-sm font-bold">{selectedProduct?.name}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Batch Number</p>
                          <p className="text-sm font-mono font-bold text-primary">{batchData.batchNumber}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Units</p>
                          <p className="text-sm font-bold">{parseInt(batchData.quantity).toLocaleString()}</p>
                       </div>
                    </Card>

                    <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 flex gap-4">
                       <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
                       <p className="text-xs text-muted-foreground leading-relaxed">
                         Minting is an immutable action on the public blockchain. Once verified, this batch details and unit salts cannot be deleted or modified.
                       </p>
                    </div>

                    {loading && (
                      <div className="space-y-4 pt-4">
                         <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${mintProgress}%` }}
                              className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" 
                            />
                         </div>
                         <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-primary">
                            <span className="flex items-center gap-2"><Cpu className="h-3 w-3 animate-spin" /> Hardware Wallet Check</span>
                            <span>{mintProgress}%</span>
                         </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Wizard Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-border/50">
                   {currentStep > 1 ? (
                     <Button variant="ghost" onClick={() => setCurrentStep(s => s - 1)} disabled={loading} className="rounded-full px-6 text-muted-foreground font-bold">Back</Button>
                   ) : <div />}

                   <div className="flex items-center gap-3">
                      <Button variant="outline" asChild className="rounded-full px-6">
                         <Link href="/manufacturer/batches">Cancel</Link>
                      </Button>
                      {currentStep < 3 ? (
                        <Button 
                          onClick={() => setCurrentStep(s => s + 1)} 
                          disabled={currentStep === 1 ? !selectedProduct : !batchData.batchNumber || !batchData.quantity}
                          className="rounded-full px-10 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-black tracking-tight"
                        >
                           Next Step <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleMint} 
                          disabled={loading} 
                          className="rounded-full px-10 bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20 font-black tracking-tight gap-2"
                        >
                           {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
                           {loading ? "Syncing..." : "Mint Units"}
                        </Button>
                      )}
                   </div>
                </div>

             </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
