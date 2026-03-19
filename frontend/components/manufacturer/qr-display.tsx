"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { generateVerifyUrl } from "@/lib/qr-utils";

interface QrDisplayProps {
  salt: string;
  size?: number;
  className?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * A reusable component that renders a QR code for a given securely derived salt.
 * The salt is appended to the frontend's verify URL.
 */
export default function QrDisplay({ salt, size = 150, className, errorCorrectionLevel }: QrDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const url = generateVerifyUrl(salt);
    
    // Dynamically adjust error correction based on physical size (mm) for optimal scan performance
    const qrSizeMm = size / 3.78; // Convert screen pixels back to approx mm
    const ecl = errorCorrectionLevel || (
      qrSizeMm < 20 ? 'L' : 
      qrSizeMm < 45 ? 'M' : 
      qrSizeMm < 70 ? 'Q' : 'H'
    );

    QRCode.toCanvas(
      canvasRef.current,
      url,
      {
        width: size,
        margin: 1,
        errorCorrectionLevel: ecl,
        color: {
          dark: '#000000', // Pure black for better thermal/inkjet print contrast
          light: '#ffffff'
        }
      },
      (err: any) => {
        if (err) {
          console.error('Failed to generate QR code', err);
          setError(true);
        }
      }
    );
  }, [salt, size, errorCorrectionLevel]);

  if (error) {
    return (
      <div 
        className={`bg-muted flex flex-col items-center justify-center text-xs text-muted-foreground text-center p-2 rounded-md ${className || ''}`}
        style={{ width: size, height: size }}
      >
        Failed to render
      </div>
    );
  }

  return <canvas ref={canvasRef} className={className} width={size} height={size} />;
}
