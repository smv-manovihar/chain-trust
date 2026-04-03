"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera,
  CheckCircle2,
  QrCode,
  UploadCloud,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface UploadScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onSwitchToCamera?: () => void;
}

export function UploadScanner({
  onScanSuccess,
  onSwitchToCamera,
}: UploadScannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Invalid file type. Please upload an image.");
        return;
      }

      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      setLoading(true);
      setError("");

      try {
        const html5QrCode = new Html5Qrcode("qr-upload-region");
        const decodedText = await html5QrCode.scanFile(file, true);
        onScanSuccess(decodedText);
      } catch {
        setError("No QR code detected. Please try a clearer or closer photo.");
        setPreview(null);
      } finally {
        setLoading(false);
      }
    },
    [onScanSuccess],
  );

  // ── Clipboard Paste Listener ──
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processFile(file);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processFile]);

  // ── Drag Handlers ──
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 sm:gap-6">
      {/* Header & Camera Switch */}
      <div className="flex items-start justify-between gap-4 px-2 sm:px-0">
        <div className="hidden sm:block">
          <h3 className="text-2xl tracking-tight">Upload QR image</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Drag and drop a screenshot or photo of the product's QR code.
          </p>
        </div>
        {onSwitchToCamera && (
          <Button
            onClick={onSwitchToCamera}
            variant="outline"
            className="rounded-full bg-background font-bold shadow-sm sm:ml-auto w-full sm:w-auto active:scale-95 transition-all"
          >
            <Camera className="h-4 w-4 mr-2" />
            Use device camera
          </Button>
        )}
      </div>

      {/* Main Drop/Tap Zone */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !loading && fileInputRef.current?.click()}
        animate={{
          scale: dragActive ? 0.98 : 1,
        }}
        className={cn(
          "relative w-full h-64 sm:h-80 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden transition-all duration-300 shadow-sm group",
          loading
            ? "pointer-events-none"
            : "hover:bg-muted/30 hover:border-primary/40",
          dragActive 
            ? "bg-primary/5 border-primary" 
            : error
              ? "bg-destructive/5 border-destructive/40"
              : preview
                ? "bg-green-500/5 border-green-500/50"
                : "bg-card/50 border-primary/20",
        )}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="QR Preview"
              className="absolute inset-0 w-full h-full object-contain p-4 opacity-40 blur-[2px]"
            />
            <div className="relative z-10 flex flex-col items-center gap-3 bg-background/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-xl border border-border/50">
              {loading ? (
                <>
                  <div className="relative h-12 w-12 flex items-center justify-center">
                    <ScanLine className="absolute h-8 w-8 text-primary animate-pulse" />
                    <div className="absolute inset-0 border-2 border-primary/20 border-t-primary rounded-xl animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm tracking-wide text-foreground">
                      Decoding QR...
                    </p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">
                      Please wait
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <p className="text-sm tracking-wide text-green-600">
                    Scan Complete!
                  </p>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-6 px-6 text-center">
            {/* Desktop: Rich QR Icon Illustration */}
            <div className="hidden sm:flex relative items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative h-24 w-24 bg-background border-2 border-primary/20 rounded-[1.5rem] flex items-center justify-center shadow-xl rotate-3 group-hover:-rotate-3 transition-transform duration-300">
                <QrCode className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute -bottom-3 -right-3 h-10 w-10 bg-primary rounded-full flex items-center justify-center shadow-lg border-4 border-background group-hover:scale-110 transition-transform duration-300">
                <UploadCloud className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>

            {/* Mobile: Simple QR Icon */}
            <div className="sm:hidden h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
              <QrCode className="h-8 w-8" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base sm:text-xl text-foreground">
                {dragActive ? "Drop to scan now" : "Select or drop a QR image"}
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-[260px] mx-auto">
                Ensure the QR code is clearly visible and well-lit for the best
                results.
              </p>
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
        />
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold text-center">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden processing div required by html5-qrcode */}

      {/* Hidden processing div required by html5-qrcode */}
      <div id="qr-upload-region" className="hidden" />
    </div>
  );
}
