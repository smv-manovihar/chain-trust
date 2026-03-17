"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { generateVerifyUrl } from "@/lib/qr-utils";

interface QrDisplayProps {
  salt: string;
  size?: number;
  className?: string;
}

/**
 * A reusable component that renders a QR code for a given securely derived salt.
 * The salt is appended to the frontend's verify URL.
 */
export default function QrDisplay({ salt, size = 150, className }: QrDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const url = generateVerifyUrl(salt);
    
    QRCode.toCanvas(
      canvasRef.current,
      url,
      {
        width: size,
        margin: 1,
        color: {
          dark: '#0f172a', // slate-900
          light: '#ffffff'
        }
      },
      (err) => {
        if (err) {
          console.error('Failed to generate QR code', err);
          setError(true);
        }
      }
    );
  }, [salt, size]);

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
