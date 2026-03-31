"use client";

import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Download, 
  ExternalLink, 
  Loader2, 
  FileText, 
  Image as ImageIcon,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  if (!document) return null;

  const isPDF = document.url.toLowerCase().endsWith(".pdf") || document.type === "pdf";
  const isImage = !isPDF;

  const handleDownload = () => {
    const link = window.document.createElement("a");
    link.href = document.url;
    link.download = document.label;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleOpenNewTab = () => {
    window.open(document.url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-sm border-zinc-800">
        <DialogHeader className="p-4 border-b border-white/5 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {isPDF ? <FileText className="h-5 w-5 text-primary" /> : <ImageIcon className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold truncate max-w-[200px] sm:max-w-md">
                {document.label}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isPDF ? "PDF Document" : "Image File"}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 mr-8">
             <Button variant="outline" size="sm" onClick={handleOpenNewTab} className="gap-2 hidden sm:flex">
                <ExternalLink className="h-4 w-4" />
                <span>Open Original</span>
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
              <Button onClick={handleOpenNewTab}>Open in New Tab</Button>
            </div>
          )}

          {isImage ? (
            <img 
              src={document.url} 
              alt={document.label}
              className="max-w-full max-h-full object-contain p-4"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setError("Failed to load image preview.");
              }}
            />
          ) : (
            <div className="w-full h-full">
               <object
                data={document.url}
                type="application/pdf"
                className="w-full h-full"
                onLoad={() => setIsLoading(false)}
              >
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(document.url)}&embedded=true`}
                  className="w-full h-full border-0"
                  onLoad={() => setIsLoading(false)}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background gap-4">
                   <p className="text-muted-foreground">PDF preview not supported in this browser.</p>
                   <Button variant="outline" onClick={handleOpenNewTab}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                   </Button>
                </div>
              </object>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
