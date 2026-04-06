"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, SwitchCamera, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface VideoScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose?: () => void;
  onSwitchToUpload?: () => void;
  isMobileDevice?: boolean;
}

function ScannerStyles({ id }: { id: string }) {
  return (
    <style>{`
      #${id}__scan_region {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        border: none !important;
        padding: 0 !important;
      }
      #${id}__scan_region video {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
      }
      #${id}__scan_region canvas,
      #${id}__scan_region svg,
      #${id} .qr-shaded-region,
      #${id}__dashboard {
        display: none !important;
      }
    `}</style>
  );
}

export function VideoScanner({
  onScanSuccess,
  onClose,
  onSwitchToUpload,
  isMobileDevice = false,
}: VideoScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = useRef(`qr-region-${Math.random().toString(36).slice(2)}`);
  const startedRef = useRef(false);

  const [status, setStatus] = useState<"init" | "running" | "error" | "denied">(
    "init",
  );
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );

  const stopScanner = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {});
    }
  }, []);

  const afterStart = useCallback(() => {
    setStatus("running");
  }, []);

  const startCamera = useCallback(
    async (camId: string) => {
      if (!scannerRef.current) return;
      await stopScanner();
      try {
        await scannerRef.current.start(
          camId,
          { 
            fps: 30, 
            qrbox: { width: 280, height: 280 }, 
            aspectRatio: 4 / 3,
            videoConstraints: {
                focusMode: 'continuous',
                exposureMode: 'continuous'
            } as any
          },
          (decoded) => {
            stopScanner().then(() => onScanSuccess(decoded));
          },
          () => {},
        );
        afterStart();
      } catch (err: any) {
        const msg = String(err);
        setStatus(
          msg.includes("NotAllowedError") || msg.includes("Permission")
            ? "denied"
            : "error",
        );
      }
    },
    [onScanSuccess, stopScanner, afterStart],
  );

  const startMobileCamera = useCallback(
    async (facing: "environment" | "user") => {
      if (!scannerRef.current) return;
      await stopScanner();
      setStatus("init");
      try {
        await scannerRef.current.start(
          { facingMode: facing },
          { 
            fps: 30, 
            qrbox: { width: 260, height: 260 }, 
            aspectRatio: 9 / 16,
            videoConstraints: {
                facingMode: facing,
                focusMode: 'continuous',
                exposureMode: 'continuous'
            } as any
          },
          (decoded) => {
            stopScanner().then(() => onScanSuccess(decoded));
          },
          () => {},
        );
        afterStart();
      } catch (err: any) {
        const msg = String(err);
        setStatus(
          msg.includes("NotAllowedError") || msg.includes("Permission")
            ? "denied"
            : "error",
        );
      }
    },
    [onScanSuccess, stopScanner, afterStart],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const html5QrCode = new Html5Qrcode(regionId.current);
    scannerRef.current = html5QrCode;

    if (isMobileDevice) {
      Html5Qrcode.getCameras()
        .then(() => startMobileCamera("environment"))
        .catch(() => startMobileCamera("environment"));
    } else {
      Html5Qrcode.getCameras()
        .then((devs) => {
          if (!devs.length) {
            setStatus("error");
            return;
          }
          setCameras(devs);
          setCameraIndex(0);
          startCamera(devs[0].id);
        })
        .catch(() => setStatus("denied"));
    }

    return () => {
      startedRef.current = false;
      stopScanner();
    };
  }, []); // eslint-disable-line

  const handleFlipCamera = async () => {
    if (isMobileDevice) {
      const next: "environment" | "user" =
        facingMode === "environment" ? "user" : "environment";
      setFacingMode(next);
      await startMobileCamera(next);
    } else {
      if (cameras.length < 2) return;
      const next = (cameraIndex + 1) % cameras.length;
      setCameraIndex(next);
      await startCamera(cameras[next].id);
    }
  };

  const containerClasses = isMobileDevice
    ? "fixed inset-0 z-[200] bg-black flex flex-col"
    : "relative flex flex-col w-full h-full min-h-[400px] overflow-hidden bg-black rounded-[2rem]";

  return (
    <div className={containerClasses}>
      <ScannerStyles id={regionId.current} />
      <div id={regionId.current} className="absolute inset-0" />

      {/* Close button - now available on all platforms if onClose is provided */}
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-6 right-6 z-50 h-10 w-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 active:bg-white/20 hover:bg-white/10 hover:text-white transition-all active:scale-95"
          aria-label="Close scanner"
        >
          <X className="h-5 w-5 text-white" />
        </Button>
      )}

      {/* Status overlays */}
      <AnimatePresence>
        {status !== "running" && (
          <motion.div
            key="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 p-6"
          >
            {/* Single Loading Spinner */}
            {status === "init" && (
              <div className="h-12 w-12 rounded-full border-[3px] border-white/10 border-t-white animate-spin" />
            )}

            {status === "denied" && (
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <X className="h-8 w-8 text-red-400" />
                </div>
                <p className="text-white text-base font-bold mb-2">
                  Camera Access Denied
                </p>
                {onSwitchToUpload && (
                  <Button
                    onClick={onSwitchToUpload}
                    className="mt-4 rounded-full bg-white text-black hover:bg-white/90 font-bold active:scale-95 transition-all"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" /> Upload image
                  </Button>
                )}
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center text-center">
                <p className="text-white/60 text-sm font-medium mb-4">
                  No camera detected
                </p>
                {onSwitchToUpload && (
                  <Button
                    onClick={onSwitchToUpload}
                    className="rounded-full bg-white text-black font-bold active:scale-95 transition-all"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" /> Upload QR image
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shutter button / Controls can stay or go, assuming user only meant the overlay */}

      {/* Bottom Floating Controls */}
      <div className="absolute bottom-10 inset-x-0 z-30 flex items-center justify-center gap-6 pointer-events-none">
        {onSwitchToUpload && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSwitchToUpload}
            aria-label="Switch to upload"
            className="pointer-events-auto h-14 w-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 active:bg-white/20 hover:bg-white/10 hover:text-white transition-all shadow-lg active:scale-95"
          >
            <ImageIcon className="h-6 w-6 text-white" />
          </Button>
        )}

        {(isMobileDevice || cameras.length > 1) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFlipCamera}
            aria-label="Flip camera"
            className="pointer-events-auto h-14 w-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 active:bg-white/20 hover:bg-white/10 hover:text-white transition-all shadow-lg active:scale-95"
          >
            <SwitchCamera className="h-6 w-6 text-white" />
          </Button>
        )}
      </div>
    </div>
  );
}
