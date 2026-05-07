"use client";

import React, { useState, useEffect, useMemo } from "react";
import { resolveMediaUrl } from "@/lib/media-url";
import { 
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  ExternalLink, 
  Loader2, 
  FileText, 
  ImageIcon, 
  AlertCircle,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    url: string;
    label: string;
    type?: "image" | "pdf";
  } | null;
}

export function DocumentViewerDialog({ open, onOpenChange, document }: DocumentViewerDialogProps) {
  const [displayDoc, setDisplayDoc] = useState(document);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && document) {
      setDisplayDoc(document);
      setIsLoading(true);
      setError(null);
    }
  }, [open, document]);

  const resolvedUrl = useMemo(() => displayDoc ? resolveMediaUrl(displayDoc.url) : "", [displayDoc]);

  const isPDF = displayDoc?.url?.toLowerCase().endsWith(".pdf") || displayDoc?.type === "pdf";
  const isImage = !isPDF;

  const handleDownload = async () => {
    if (!document) return;
    try {
      const response = await fetch(resolvedUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      
      const link = window.document.createElement("a");
      link.href = objectUrl;
      link.download = document.label;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 100);
    } catch (err) {
      console.error("Download failed, falling back to new tab:", err);
      window.open(resolvedUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenNewTab = () => {
    window.open(resolvedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-5xl w-full p-0 overflow-hidden flex flex-col h-[90vh] sm:h-[85vh]">
        <ResponsiveDialogHeader className="p-4 sm:p-6 border-b shrink-0 bg-background/95 backdrop-blur-sm z-20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                {isPDF ? <FileText className="h-5 w-5 text-primary" /> : <ImageIcon className="h-5 w-5 text-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <ResponsiveDialogTitle className="text-base sm:text-lg font-semibold truncate leading-none mb-1">
                  {document?.label || "Document Preview"}
                </ResponsiveDialogTitle>
                <p className="text-xs text-muted-foreground truncate">
                  {isPDF ? "PDF Document" : "Image File"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button variant="outline" size="icon" onClick={handleOpenNewTab} className="h-9 w-9 hidden sm:flex">
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">Open original</span>
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent>Open original file</TooltipContent>
                 </Tooltip>
               </TooltipProvider>

               <Button variant="default" size="sm" onClick={handleDownload} className="h-9 gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
               </Button>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <div className="flex-1 relative flex items-center justify-center bg-muted/30 overflow-hidden min-h-0">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading document...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-4 text-center p-6 max-w-md">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">{error}</p>
                <p className="text-sm text-muted-foreground">The preview could not be loaded directly.</p>
              </div>
              <Button onClick={handleOpenNewTab} variant="outline" className="mt-2 gap-2">
                <ExternalLink className="h-4 w-4" />
                Open securely in browser
              </Button>
            </div>
          )}

          {displayDoc && !error && (
            isImage ? (
              <div className="w-full h-full p-2 sm:p-6 flex items-center justify-center overflow-auto">
                <img 
                  src={resolvedUrl} 
                  alt={displayDoc.label}
                  className="max-w-full max-h-full object-contain rounded-md shadow-sm"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setError("Failed to load image preview.");
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-full relative">
                <iframe
                  src={`${resolvedUrl}#toolbar=0&navpanes=0`}
                  className="w-full h-full border-0 absolute inset-0 z-0 bg-background"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setError("Failed to render PDF preview.");
                  }}
                  title={displayDoc.label}
                />
              </div>
            )
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
