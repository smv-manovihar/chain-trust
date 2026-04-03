"use client";

import React, { useState, useEffect, useMemo } from "react";
import { resolveMediaUrl } from "@/lib/media-url";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setError(null);
    }
  }, [open, document]);

  const resolvedUrl = useMemo(() => document ? resolveMediaUrl(document.url) : "", [document]);

  if (!document) return null;

  const isPDF = document.url.toLowerCase().endsWith(".pdf") || document.type === "pdf";
  const isImage = !isPDF;

  const handleDownload = async () => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] sm:h-[90vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-sm border-zinc-800 gap-0">
        <DialogHeader className="p-4 border-b border-white/5 flex flex-row items-center justify-between shrink-0 space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {isPDF ? <FileText className="h-5 w-5 text-primary" /> : <ImageIcon className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex items-center gap-1.5">
              <DialogTitle className="text-lg font-semibold truncate max-w-[200px] sm:max-w-md">
                {document.label}
              </DialogTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" tabIndex={-1} className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary transition-all">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="p-3 rounded-2xl bg-popover/90 backdrop-blur-md border-primary/10 shadow-xl">
                    <p className="text-xs leading-relaxed font-medium">
                      Viewing {isPDF ? "PDF Document" : "Image File"}. You can download or open the original file for full resolution.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Preview of {document.label}
          </DialogDescription>
          <div className="flex items-center gap-2 mr-8">
             <Button variant="outline" size="sm" onClick={handleOpenNewTab} className="gap-2 hidden sm:flex">
                <ExternalLink className="h-4 w-4" />
                <span>Open original</span>
             </Button>
             <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
             </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-muted/10 relative flex items-center justify-center overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-4 text-center p-6">
              <AlertCircle className="h-12 w-12 text-destructive opacity-50" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={handleOpenNewTab}>Open in new tab</Button>
            </div>
          )}

          {isImage ? (
            <img 
              src={resolvedUrl} 
              alt={document.label}
              className="max-w-full max-h-full object-contain p-4"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setError("Failed to load image preview.");
              }}
            />
          ) : (
            <div className="w-full h-full relative">
              <iframe
                src={`${resolvedUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full border-0 absolute inset-0 z-10"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setError("Failed to render PDF preview.");
                }}
                title={document.label}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
