"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { 
  FileText, 
  Search, 
  Plus, 
  Loader2, 
  ArrowLeft, 
  Calendar, 
  User, 
  Trash2, 
  Eye,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

import { getPrescriptions, deletePrescription } from "@/api/customer.api";
import { LinkedMedications } from "@/components/cabinet/linked-medications";
import { PrescriptionUploadDialog } from "@/components/cabinet/prescription-upload-dialog";
import { DocumentViewerDialog } from "@/components/common/document-viewer";
import { LoadingScreen } from "@/components/ui/loading-screen";

interface Prescription {
  _id: string;
  url: string;
  label: string;
  doctorName?: string;
  issuedDate?: string;
  notes?: string;
  createdAt: string;
  linkedMedications: any[];
  itemCount: number;
}

export default function PrescriptionExplorerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{ url: string; label: string } | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setSkip(prev => prev + 10);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const fetchPrescriptions = async (skipCount: number, isInitial: boolean = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await getPrescriptions(skipCount, 10);
      if (isInitial) {
        setPrescriptions(data.prescriptions);
      } else {
        setPrescriptions(prev => [...prev, ...data.prescriptions]);
      }
      setHasMore(data.pagination.hasMore);
    } catch (error) {
      console.error("Failed to fetch prescriptions:", error);
      toast.error("Failed to load prescriptions");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions(0, true);
  }, []);

  useEffect(() => {
    if (skip > 0) {
      fetchPrescriptions(skip);
    }
  }, [skip]);

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Are you sure you want to delete "${label}"? This will unlink it from all medications.`)) return;
    
    try {
      await deletePrescription(id);
      setPrescriptions(prev => prev.filter(p => p._id !== id));
      toast.success("Prescription deleted successfully");
    } catch (error) {
      toast.error("Failed to delete prescription");
    }
  };

  const filteredPrescriptions = prescriptions.filter(p => 
    p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.doctorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto pb-20 space-y-6 lg:space-y-8">
      {/* Dynamic Floating Header */}
      <div 
        className={cn(
          "sticky top-0 z-40 transition-all duration-500 -mx-4 px-4 lg:-mx-8 lg:px-8 py-4 sm:py-6",
          scrolled 
            ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm py-3 sm:py-4" 
            : "bg-transparent"
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn("transition-all duration-500", scrolled && "scale-95 origin-left")}>
                <h1 className={cn(
                  "font-bold tracking-tight text-foreground transition-all duration-500 flex items-center gap-2",
                  scrolled ? "text-xl sm:text-2xl" : "text-2xl sm:text-4xl"
                )}>
                  My prescriptions
                </h1>
                {!scrolled && (
                  <p className="text-muted-foreground text-xs sm:text-base mt-1 animate-in fade-in slide-in-from-top-1">
                    Manage your medical documents and history, {user?.name?.split(" ")[0] || "User"}.
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Button 
                className="flex-1 sm:flex-none rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold h-10 sm:h-12 px-4 sm:px-6 gap-2"
                onClick={() => setIsUploadOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span>Upload new</span>
              </Button>
            </div>
          </div>

          <PrescriptionUploadDialog 
            open={isUploadOpen} 
            onOpenChange={setIsUploadOpen} 
            onSuccess={() => {
              setSkip(0);
              fetchPrescriptions(0, true);
            }} 
          />
          
          {/* Search Bar - Responsive */}
          <div className={cn(
            "relative transition-all duration-500 ease-in-out",
            scrolled ? "max-w-xs ml-auto -mt-12 hidden sm:block" : "max-w-md"
          )}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
            <Input
              placeholder="Search by label or doctor..."
              className={cn(
                "pl-11 rounded-full border-primary/10 bg-card/60 backdrop-blur-md shadow-sm focus-visible:ring-primary/20 h-10 sm:h-12",
                scrolled && "h-10 text-xs"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-1 pt-4">
        {/* Mobile-only Search Bar when scrolled */}
        {scrolled && (
          <div className="sm:hidden px-2 mb-4 animate-in fade-in slide-in-from-top-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-50" />
              <Input
                placeholder="Search..."
                className="pl-9 rounded-full border-primary/10 bg-card/60 backdrop-blur-md h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            My prescriptions
          </h2>
          <Button variant="ghost" size="sm" asChild className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors">
            <Link href="/customer/cabinet" className="flex items-center gap-2">
               Go to my medicines <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {loading && skip === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 rounded-[2.5rem] bg-muted animate-pulse" />
            ))
          ) : filteredPrescriptions.length === 0 ? (
            <div className="md:col-span-2 py-20 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed border-primary/10 rounded-[3rem] bg-muted/5">
              <FileText className="h-16 w-16 mb-4 opacity-20" />
              <h3 className="text-xl font-bold">No prescriptions found</h3>
              <p className="max-w-xs mx-auto mt-2 text-sm">
                Start by uploading your first prescription to the pool.
              </p>
            </div>
          ) : (
            filteredPrescriptions.map((p) => (
              <Card 
                key={p._id} 
                className="group p-6 rounded-[2.5rem] border-primary/5 bg-card/40 backdrop-blur-xl shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden relative"
              >
                {/* Background Art */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />
                
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4 items-center">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{p.label}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground opacity-70">
                          <User className="h-3 w-3" />
                          <span>{p.doctorName || "Unknown doctor"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground opacity-70">
                          <Calendar className="h-3 w-3" />
                          <span>{p.issuedDate ? format(new Date(p.issuedDate), "MMM d, yyyy") : "No date"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary transition-all"
                      onClick={() => setPreviewDoc({ url: p.url, label: p.label })}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-500 transition-all opacity-0 group-hover:opacity-100"
                      onClick={() => handleDelete(p._id, p.label)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Linked Medications Component */}
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-[10px] font-bold text-muted-foreground opacity-60">Linked medications</h4>
                    <Badge variant="secondary" className="text-[9px] font-bold px-2 py-0 h-4 bg-primary/5 text-primary border-none">
                      {p.itemCount} Items
                    </Badge>
                  </div>
                  <LinkedMedications medications={p.linkedMedications} />
                </div>

                {p.notes && (
                  <div className="mt-4 p-3 bg-muted/20 rounded-2xl border border-primary/5 text-[10px] text-muted-foreground italic flex gap-2">
                    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                    <p>{p.notes}</p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Observer Sentinel */}
        <div ref={lastElementRef} className="h-4 w-full" />

        {loadingMore && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <DocumentViewerDialog 
        open={!!previewDoc} 
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  );
}
