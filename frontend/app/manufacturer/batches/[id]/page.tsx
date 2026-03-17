"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getBatch, getBatchQRData } from "@/api/batch.api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Printer, Download, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import QrDisplay from "@/components/manufacturer/qr-display";
import { Input } from "@/components/ui/input";

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<any>(null);
  const [qrData, setQrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!batchId) return;

    const loadData = async () => {
      setLoading(true);
      try {
         const [batchRes, qrRes] = await Promise.all([
           getBatch(batchId),
           getBatchQRData(batchId, page, 50)
         ]);
         setBatch(batchRes.batch);
         setQrData(qrRes);
      } catch (err) {
         console.error("Failed to load batch:", err);
      } finally {
         setLoading(false);
      }
    };

    loadData();
  }, [batchId, page]);

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
        <Button onClick={() => router.push('/manufacturer/batches')}>Return to Batches</Button>
      </div>
    );
  }

  const filteredUnits = qrData.units.filter((unit: any) => {
    if (!searchTerm) return true;
    const unitNumStr = (unit.unitIndex + 1).toString();
    return unitNumStr.includes(searchTerm);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hide controls when printing */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              {batch.productName} 
              {batch.isRecalled && <Badge variant="destructive">RECALLED</Badge>}
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">{batch.batchNumber} • {batch.productId}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={handlePrint} className="gap-2 shadow-sm">
            <Printer className="h-4 w-4" /> 
            Print QR Labels
          </Button>
        </div>
      </div>

      {/* Batch Overview Card - Hidden somewhat on print */}
      <Card className="p-6 border-border shadow-sm print:shadow-none print:border-b-2 print:border-black print:rounded-none bg-card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           <div>
             <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Manufacturer</p>
             <p className="font-medium text-[15px]">{batch.brand}</p>
           </div>
           <div>
             <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Units Manufactured</p>
             <p className="font-medium text-[15px]">{batch.quantity.toLocaleString()}</p>
           </div>
           <div>
             <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Manufacture Date</p>
             <p className="font-medium text-[15px]">{format(new Date(batch.manufactureDate), 'MMM d, yyyy')}</p>
           </div>
           <div className="print:hidden">
             <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Blockchain Status</p>
             <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <p className="font-medium text-[14px] truncate" title={batch.blockchainHash}>
                   Confirmed
                </p>
             </div>
           </div>
        </div>
      </Card>

      <div className="flex items-center justify-between mt-8 print:hidden">
         <h2 className="text-xl font-bold">QR Codes (Units {qrData.units[0]?.unitIndex + 1} - {qrData.units[qrData.units.length - 1]?.unitIndex + 1})</h2>
         
         <div className="flex gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Find Unit ID..." 
                className="w-[180px] pl-8 h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex border rounded-md overflow-hidden h-9">
              <Button 
                variant="ghost" 
                className="rounded-none border-r px-3 h-full"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
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
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
         </div>
      </div>

      {/* 
        THE PRINT GRID 
        On screen: standard grid
        On print: CSS controls the grid layout perfectly for sheets of labels
      */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 print:grid-cols-4 print:gap-x-2 print:gap-y-6">
        {loading ? (
           <div className="col-span-full py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filteredUnits.length === 0 ? (
           <div className="col-span-full py-20 text-center text-muted-foreground">No units found matching that ID.</div>
        ) : (
          filteredUnits.map((unit: any) => (
            <Card key={unit.unitIndex} className="overflow-hidden border-border bg-card flex flex-col items-center p-4 print:border-2 print:border-black print:rounded-none print:shadow-none print:page-break-inside-avoid">
               <QrDisplay salt={unit.salt} size={140} className="mb-3" />
               <div className="text-center w-full">
                  <p className="text-xs font-bold text-foreground mb-0.5 print:-mt-1 uppercase truncate w-full">{batch.productName}</p>
                  <div className="flex items-center justify-center gap-2 mb-1 print:hidden">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      UNIT #{unit.unitIndex + 1}
                    </Badge>
                    {unit.scanCount > 0 && (
                      <Badge variant={unit.scanCount > 5 ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 h-4 bg-muted text-muted-foreground border-none">
                        {unit.scanCount} Scans
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground hidden print:block pt-1 border-t border-dashed w-full mt-1">
                    UNIT: {String(unit.unitIndex + 1).padStart(6, '0')} | {batch.batchNumber}
                  </p>
               </div>
            </Card>
          ))
        )}
      </div>

      {/* Print styles injected to hide global nav/sidebar when printing this page */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body, html {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          nav, header, aside, .sidebar { 
             display: none !important; 
          }
          main { 
             margin: 0 !important; 
             padding: 10mm !important; 
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}} />
    </div>
  );
}
