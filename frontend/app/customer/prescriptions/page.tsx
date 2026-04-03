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
import { EmptyState } from "@/components/ui/empty-state";
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
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    label: string;
  } | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setSkip((prev) => prev + 10);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, hasMore],
  );

  const fetchPrescriptions = async (
    skipCount: number,
    isInitial: boolean = false,
  ) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await getPrescriptions(skipCount, 10);
      if (isInitial) {
        setPrescriptions(data.prescriptions);
      } else {
        setPrescriptions((prev) => [...prev, ...data.prescriptions]);
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
    if (
      !confirm(
        `Are you sure you want to delete "${label}"? This will unlink it from all medications.`,
      )
    )
      return;

    try {
      await deletePrescription(id);
      setPrescriptions((prev) => prev.filter((p) => p._id !== id));
      toast.success("Prescription deleted successfully");
    } catch (error) {
      toast.error("Failed to delete prescription");
    }
  };

  const filteredPrescriptions = prescriptions.filter(
    (p) =>
      p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="max-w-[1600px] mx-auto pb-20 space-y-2 lg:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 sm:py-4 relative">
        <div>
          <h1 className="font-black tracking-tight text-foreground text-xl sm:text-3xl lg:text-4xl flex items-center gap-2">
            My Prescriptions
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Manage your medical documents and history,{" "}
            {user?.name?.split(" ")[0] || "User"}.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden sm:flex text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors h-10 rounded-full px-4"
          >
            <Link
              href="/customer/cabinet"
              className="flex items-center gap-1.5 font-black"
            >
              Go to my medicines <ArrowLeft className="h-3 w-3" />
            </Link>
          </Button>

          <Button
            className="flex-1 sm:flex-none rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold h-10 sm:h-12 px-4 sm:px-6 gap-2 transition-all active:scale-95"
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

      {/* Static Search row */}
      <div className="-mx-4 px-4 lg:-mx-8 lg:px-8 py-2">
        <div className="flex-1 max-w-md mx-auto sm:mx-0 w-full">
          <div className="relative w-full">
            <Input
              placeholder="Search by label or doctor..."
              className="pl-11 rounded-full shadow-sm focus-visible:ring-primary/20 h-10 sm:h-12 border-primary/10 transition-all w-full bg-card/60 backdrop-blur-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50 pointer-events-none z-10" />
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="px-1 pt-0">
        <div className="flex flex-col gap-4 sm:gap-6 pt-0">
          {loading && skip === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-[2.5rem] bg-muted animate-pulse"
              />
            ))
          ) : filteredPrescriptions.length === 0 ? (
            <div className="md:col-span-2 py-8">
              <EmptyState
                icon={FileText}
                title="No prescriptions found"
                description="Start by uploading your first prescription to the pool to link medical history to your medications."
                action={{
                  label: "Upload New",
                  onClick: () => setIsUploadOpen(true),
                }}
              />
            </div>
          ) : (
            filteredPrescriptions.map((p) => (
              <Card
                key={p._id}
                className="group p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border-primary/5 bg-card/40 backdrop-blur-xl shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden relative flex flex-col md:flex-row md:items-center gap-4 sm:gap-6"
              >
                {/* Background Art */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

                <div className="flex justify-between items-start md:items-center w-full md:w-auto flex-1 min-w-0">
                  <div className="flex gap-4 items-center">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <h3 className="font-bold text-base sm:text-lg truncate group-hover:text-primary transition-colors">
                        {p.label}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground opacity-70">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[80px] sm:max-w-[120px]">
                            {p.doctorName || "Unknown doctor"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground opacity-70">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {p.issuedDate
                              ? format(new Date(p.issuedDate), "MMM d, yyyy")
                              : "No date"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Actions - hidden on desktop, pushed to end on desktop but shown here for layout order primarily */}
                  <div className="flex items-center gap-1 md:hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary transition-all"
                      onClick={() =>
                        setPreviewDoc({ url: p.url, label: p.label })
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-500 transition-all"
                      onClick={() => handleDelete(p._id, p.label)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Linked Medications Component */}
                <div className="w-full md:w-64 shrink-0 -mt-2 md:mt-0">
                  <div className="hidden md:flex justify-between items-center px-1 mb-2">
                    <h4 className="text-[10px] font-bold text-muted-foreground opacity-60">
                      Linked medications
                    </h4>
                    <Badge
                      variant="secondary"
                      className="text-[9px] font-bold px-2 py-0 h-4 bg-primary/5 text-primary border-none"
                    >
                      {p.itemCount} Items
                    </Badge>
                  </div>
                  <LinkedMedications medications={p.linkedMedications} />
                </div>

                {p.notes && (
                  <div className="w-full md:w-48 shrink-0 p-3 bg-muted/20 rounded-2xl border border-primary/5 text-[10px] text-muted-foreground italic flex gap-2 -mt-2 md:mt-0">
                    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                    <p className="line-clamp-2">{p.notes}</p>
                  </div>
                )}

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary transition-all"
                    onClick={() =>
                      setPreviewDoc({ url: p.url, label: p.label })
                    }
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    onClick={() => handleDelete(p._id, p.label)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
