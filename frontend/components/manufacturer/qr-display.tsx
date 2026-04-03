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
    
    // Balanced ECL for logo integration without making modules too small
    const ecl = errorCorrectionLevel || 'M';

    QRCode.toCanvas(
      canvasRef.current,
      url,
      {
        width: size,
        margin: 2, // Increased quiet zone for better recognition
        errorCorrectionLevel: ecl,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      },
      (err: any) => {
        if (err) {
          console.error('Failed to generate QR code', err);
          setError(true);
          return;
        }

        // Draw center logo
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const logo = new Image();
        logo.src = '/chain-trust-icon.png';
        logo.onload = () => {
          const logoSize = size * 0.18; // Balanced size (~18% of QR)
          const x = (size - logoSize) / 2;
          const y = (size - logoSize) / 2;
          
          ctx.save();
          ctx.globalAlpha = 0.65; // Semi-transparent as requested
          
          // Draw a small white background for the logo to improve visibility
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x - 1, y - 1, logoSize + 2, logoSize + 2);
          
          ctx.drawImage(logo, x, y, logoSize, logoSize);
          ctx.restore();
        };
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
