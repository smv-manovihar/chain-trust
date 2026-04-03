"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  RefreshCw,
  Boxes,
  Plus,
  FileSpreadsheet,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryFilter } from "@/components/manufacturer/category-filter";
import { listBatches } from "@/api/batch.api";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardContent } from "@/components/ui/card";

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
  status: string;
}



export default function BatchesPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("categories")?.split(",").filter(Boolean) || []
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 500);
  const debouncedCategories = useDebounce(selectedCategories, 500);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }

    if (debouncedCategories.length > 0) {
      params.set("categories", debouncedCategories.join(","));
    } else {
      params.delete("categories");
    }

    const queryString = params.toString();
    const currentQueryString = searchParams.toString();

    if (queryString !== currentQueryString) {
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      // Use replace to avoid polluting history with every debounce
      router.replace(url, { scroll: false });
    }
  }, [debouncedSearch, debouncedCategories, pathname, router, searchParams]);

  const fetchBatches = useCallback(async () => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      setIsRefreshing(true);
      setError("");
      const res = await listBatches({
        search: debouncedSearch,
        categories: debouncedCategories,
      }, controller.signal);
      setBatches(res.batches || []);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Failed to fetch batches:", err);
      toast.error("Failed to load batches.");
    } finally {
      if (fetchAbortRef.current === controller) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [debouncedSearch, debouncedCategories]);

  useEffect(() => {
    fetchBatches();
    return () => fetchAbortRef.current?.abort();
  }, [fetchBatches]);



  const handleExportCSV = () => {
    if (batches.length === 0) {
      toast.error("No batches to export.");
      return;
    }

    const headers = ["Batch Number", "Product Name", "Product ID", "Quantity", "Manufacture Date", "Status", "Total Scans", "Tx Hash"];
    const rows = batches.map(b => [
      b.batchNumber,
      `"${b.productName}"`,
      b.productId,
      b.quantity,
      format(new Date(b.manufactureDate), "yyyy-MM-dd"),
      b.isRecalled ? "Recalled" : "Active",
      b.totalScans,
      b.blockchainHash
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `batches_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Export starting...");
  };



  const filteredBatches = batches;

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Batches</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-2">
            <Badge variant="secondary" className="font-normal border-primary/20 bg-primary/10 text-primary h-5 text-[10px]">
              <Boxes className="w-3 h-3 mr-1.5 inline-block" />
              {batches.filter((b) => !b.isRecalled).length} Active
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchBatches}
            className="flex-shrink-0"
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="gap-2 hidden md:flex rounded-full"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            asChild
            className="flex-1 sm:flex-none gap-2 rounded-full h-10 px-4"
          >
            <Link href="/manufacturer/batches/new">
              <Plus className="h-4 w-4" />
              <span className="sm:inline">Create Batch</span>
            </Link>
          </Button>
        </div>
      </div>


      <div className="flex gap-4 px-1 sticky top-4 z-30">
        <div className="relative flex-1">
          <Input
            placeholder="Search batches or products..."
            className="pl-10 bg-background/80 backdrop-blur-md rounded-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        </div>

        <CategoryFilter
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          className="rounded-md h-10 px-4 border-border/40 bg-background/80 backdrop-blur-md shadow-sm"
        />
      </div>

      {/* Main Content Area */}
      <div className="px-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading batches...</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden lg:block border rounded-xl bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Batch Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity (Units)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Scans</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch) => (
                    <TableRow
                      key={batch._id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        if (batch.status === 'pending') {
                          router.push(`/manufacturer/batches/new?id=${batch._id}`);
                        } else {
                          router.push(`/manufacturer/batches/${encodeURIComponent(batch.batchNumber)}`);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        {batch.batchNumber}
                      </TableCell>
                      <TableCell>
                        {batch.productName}
                      </TableCell>
                      <TableCell>
                        {batch.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {batch.isRecalled ? (
                          <Badge variant="destructive" className="font-normal text-xs px-2 py-0">
                            Recalled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="font-normal text-xs px-2 py-0 border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {batch.totalScans.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-50 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden grid sm:grid-cols-2 gap-4">
              {filteredBatches.map((batch) => (
                <Card
                  key={batch._id}
                  className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => {
                    if (batch.status === 'pending') {
                      router.push(`/manufacturer/batches/new?id=${batch._id}`);
                    } else {
                      router.push(`/manufacturer/batches/${encodeURIComponent(batch.batchNumber)}`);
                    }
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <Badge variant="outline" className="mb-2 font-medium text-xs text-primary bg-primary/5">
                          {batch.batchNumber}
                        </Badge>
                        <h3 className="font-semibold text-lg line-clamp-1">
                          {batch.productName}
                        </h3>
                      </div>
                      {batch.isRecalled ? (
                        <Badge variant="destructive" className="font-normal text-xs px-2 py-0.5 whitespace-nowrap">
                          Recalled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal text-xs px-2 py-0.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 whitespace-nowrap">
                          Active
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/40 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                        <p className="text-sm font-medium">{batch.quantity.toLocaleString()}</p>
                      </div>
                      <div className="bg-muted/40 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Total Scans</p>
                        <p className="text-sm font-medium">{batch.totalScans.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredBatches.length === 0 && (
              <EmptyState
                icon={Boxes}
                title="No Batches Found"
                description="Get started by creating your first production batch to start tracking units."
                action={{
                  label: "Create Batch",
                  href: "/manufacturer/batches/new",
                }}
                className="py-12 border rounded-xl"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
