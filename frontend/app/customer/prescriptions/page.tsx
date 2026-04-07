"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  FileText,
  Plus,
  Loader2,
  Eye,
  Trash2,
  Package,
  Calendar as CalendarIcon,
  User as UserIcon,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";


import { getPrescriptions, deletePrescription } from "@/api/customer.api";
import { PrescriptionCard } from "@/components/prescriptions/prescription-card";
import { PrescriptionUploadDialog } from "@/components/prescriptions/prescription-upload-dialog";
import { DocumentViewerDialog } from "@/components/common/document-viewer";
import { LinkedMedications } from "@/components/prescriptions/linked-medications";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useDebounce } from "@/hooks/use-debounce";

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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    label: string;
  } | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmLabel, setDeleteConfirmLabel] = useState<string>("");
  const [activeLinkedMeds, setActiveLinkedMeds] = useState<{
    open: boolean;
    meds: any[];
  }>({ open: false, meds: [] });

  const debouncedSearch = useDebounce(searchTerm, 500);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm) params.set("search", searchTerm);
    else params.delete("search");

    const queryString = params.toString();
    if (queryString !== searchParams.toString()) {
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(url, { scroll: false });
    }
  }, [searchTerm, pathname, router, searchParams]);

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
      const data = await getPrescriptions(skipCount, 12, debouncedSearch);
      if (isInitial) setPrescriptions(data.prescriptions);
      else setPrescriptions((prev) => [...prev, ...data.prescriptions]);
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
    setSkip(0);
    fetchPrescriptions(0, true);
  }, [debouncedSearch]);

  useEffect(() => {
    if (skip > 0) fetchPrescriptions(skip);
  }, [skip]);

  const handleDelete = (id: string, label: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmLabel(label);
  };

  const onConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deletePrescription(deleteConfirmId);
      setPrescriptions((prev) => prev.filter((p) => p._id !== deleteConfirmId));
      toast.success("Prescription deleted successfully");
    } catch (error) {
      toast.error("Failed to delete prescription");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const isMobile = useIsMobile();

  return (
    <div className="max-w-[1600px] mx-auto pb-32 space-y-4 lg:space-y-6">
      <PageHeader
        title="My Prescriptions"
        description={`Manage your secure medical history, ${user?.name?.split(" ")[0] || "User"}.`}
        backHref="/customer/cabinet"
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold h-12 px-8 gap-2 transition-all active:scale-95 text-[11px] hidden sm:flex"
            onClick={() => setIsUploadOpen(true)}
          >
            <Plus className="h-5 w-5" />
            <span>Upload New Document</span>
          </Button>
        }
      />

      <PrescriptionUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={() => {
          setSkip(0);
          fetchPrescriptions(0, true);
        }}
      />

      <DataToolbar
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: "Search by label or doctor...",
        }}
        viewToggle={{
          mode: viewMode,
          onChange: setViewMode,
        }}
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold h-11 px-6 gap-2 transition-all active:scale-95 text-[11px] sm:hidden flex w-full"
            onClick={() => setIsUploadOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Upload New</span>
          </Button>
        }
      />

      {/* Main Content Area */}
      <div className="px-1">
        {loading && skip === 0 ? (
          <div
            className={cn(
              "grid gap-4 sm:gap-6",
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1",
            )}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-[2.5rem] bg-muted/40 animate-pulse",
                  viewMode === "grid" ? "aspect-[4/5]" : "h-24 w-full",
                )}
              />
            ))}
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="py-20">
            <EmptyState
              compact={false}
              icon={FileText}
              title="No prescriptions found"
              description="Your storage vault is currently empty. Start by uploading a medical document."
              action={{
                label: "Upload Document",
                onClick: () => setIsUploadOpen(true),
              }}
            />
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {prescriptions.map((p) => (
                  <PrescriptionCard
                    key={p._id}
                    prescription={p}
                    variant="grid"
                    onView={() => setPreviewDoc({ url: p.url, label: p.label })}
                    onDelete={() => handleDelete(p._id, p.label)}
                  />
                ))}
              </div>
            ) : (
              <>
                {/* Desktop List Mode (Table based like Batches/Products) */}
                <div className="hidden lg:block border rounded-[2rem] bg-card/40 backdrop-blur-xl border-primary/5 overflow-hidden shadow-xl shadow-primary/5">
                  <Table>
                    <TableHeader className="bg-primary/5">
                      <TableRow className="hover:bg-transparent border-primary/5">
                        <TableHead className="w-[300px] font-black text-xs text-primary/70">
                          PRESCRIPTION LABEL
                        </TableHead>
                        <TableHead className="font-black text-xs text-primary/70">
                          DOCTOR / PROVIDER
                        </TableHead>
                        <TableHead className="font-black text-xs text-primary/70 text-right">
                          ISSUED DATE
                        </TableHead>
                        <TableHead className="font-black text-xs text-primary/70 text-center">
                          MEDICINES
                        </TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prescriptions.map((p) => (
                        <TableRow
                          key={p._id}
                          onClick={() =>
                            setPreviewDoc({ url: p.url, label: p.label })
                          }
                          className="hover:bg-primary/5 border-primary/5 transition-colors group cursor-pointer"
                        >
                          <TableCell className="py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                <FileText className="h-5 w-5" />
                              </div>
                              <span className="font-black tracking-tight text-foreground">
                                {p.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                              <UserIcon className="h-3.5 w-3.5" />
                              {p.doctorName || "Unknown Doctor"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 text-xs font-bold text-muted-foreground">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              {p.issuedDate
                                ? format(new Date(p.issuedDate), "MMM d, yyyy")
                                : "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center">
                              {p.itemCount > 0 ? (
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    setActiveLinkedMeds({
                                      open: true,
                                      meds: p.linkedMedications,
                                    })
                                  }
                                  className="h-9 px-4 rounded-full border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-black text-[10px] gap-2 transition-all active:scale-95"
                                >
                                  <Package className="h-3.5 w-3.5" />
                                  Show ({p.itemCount})
                                </Button>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="h-7 px-3 rounded-full border-primary/5 bg-muted/20 text-muted-foreground font-bold text-[9px]"
                                >
                                  0 Medicines
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary transition-all active:scale-95"
                                onClick={() =>
                                  setPreviewDoc({ url: p.url, label: p.label })
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl hover:bg-red-50 text-red-500 transition-all active:scale-95"
                                onClick={() => handleDelete(p._id, p.label)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile/Tablet List Mode (Card based) */}
                <div className="lg:hidden flex flex-col gap-4">
                  {prescriptions.map((p) => (
                    <PrescriptionCard
                      key={p._id}
                      prescription={p}
                      variant="list"
                      onView={() =>
                        setPreviewDoc({ url: p.url, label: p.label })
                      }
                      onDelete={() => handleDelete(p._id, p.label)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Sentinel for Infinite Scroll */}
        <div ref={lastElementRef} className="h-20 w-full" />

        {loadingMore && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 sm:hidden z-50">
        <Button
          className="w-full rounded-full shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 font-black h-14 gap-3 transition-all active:scale-95 text-base"
          onClick={() => setIsUploadOpen(true)}
        >
          <Plus className="h-6 w-6" />
          Upload New Document
        </Button>
      </div>

      {/* Global Dialogs */}
      <DocumentViewerDialog
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        document={previewDoc}
      />

      <LinkedMedications
        medications={activeLinkedMeds.meds}
        open={activeLinkedMeds.open}
        onOpenChange={(open) =>
          setActiveLinkedMeds((prev) => ({ ...prev, open }))
        }
      />

      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent className="rounded-[2.5rem] border-primary/10 shadow-2xl backdrop-blur-3xl bg-card/90 max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">
              Delete Document?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-bold opacity-70">
              Permanently remove{" "}
              <span className="text-foreground font-black">
                "{deleteConfirmLabel}"
              </span>{" "}
              from your vault? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="rounded-full font-black h-12 transition-all active:scale-95 border-primary/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 rounded-full font-black h-12 transition-all active:scale-95 shadow-lg shadow-red-500/20"
              onClick={onConfirmDelete}
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
