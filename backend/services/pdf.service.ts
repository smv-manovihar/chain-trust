import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '../../frontend/public/chain-trust-icon.png');

export interface QRSettings {
  qrSize: number; // in mm
  columns: number;
  showProductName: boolean;
  showUnitIndex: boolean;
  showBatchNumber: boolean;
  labelPadding: number; // in mm
}

/**
 * Generates an A4 PDF sheet for a given batch and its units.
 * Writes directly to a WritableStream to prevent OOM on large batches.
 */
export const generateBatchPDF = async (
    batch: any, 
    settings: QRSettings, 
    stream: NodeJS.WritableStream
): Promise<void> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 10,
        });

        // Pipe directly to the provided stream (e.g., Express Response)
        doc.pipe(stream);
        doc.on('end', resolve);
        doc.on('error', reject);

        // A4 dimensions in points (1mm = 2.8346 pts)
        const MM_TO_PT = 2.8346;
        const pageWidth = 210 * MM_TO_PT;
        const pageHeight = 297 * MM_TO_PT;
        const margin = 10 * MM_TO_PT;
        const availableWidth = pageWidth - 2 * margin;

        // Mandatory Padding & Safety Checks
        const qrSizeMm = Math.max(20, settings.qrSize || 20);
        const paddingMm = settings.labelPadding || 5;
        
        // 1. Column Capping Logic (Safety first)
        const maxPossibleCols = Math.floor(210 / (qrSizeMm + 2 * paddingMm)); // Absolute page width check
        const safeMaxCols = Math.floor(availableWidth / ((qrSizeMm + 2 * paddingMm) * MM_TO_PT));
        const cols = Math.min(settings.columns || 4, Math.max(1, safeMaxCols));
        
        const padding = paddingMm * MM_TO_PT;
        
        // 2. Symmetrical Layout Calculations
        const labelWidth = availableWidth / cols;
        // Force symmetry: labelHeight = labelWidth
        const labelHeight = labelWidth; 
        
        // Final QR sizing to fit within the symmetrical label
        let qrSize = qrSizeMm * MM_TO_PT;
        if (qrSize > (labelWidth - 2 * padding)) {
            qrSize = labelWidth - 2 * padding;
        }

        let currentX = margin;
        let currentY = margin;
        let colIndex = 0;

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Use a self-executing async function to handle the loop
        (async () => {
            try {
                for (let i = 0; i < batch.quantity; i++) {
                    // Yield to event loop every 50 units (FIX-001)
                    if (i > 0 && i % 50 === 0) {
                        await new Promise(resolve => setImmediate(resolve));
                    }

                    // Derive salt locally to avoid passing huge arrays
                    const unitHash = crypto.createHash('sha256').update(`${batch.batchSalt}-${i}`).digest('hex');
                    const qrSalt = `${batch.batchSalt}:${i}:${unitHash}`;
                    // Optimized shortened param 's' for scan reliability
                    const verifyUrl = `${frontendUrl}/verify?s=${qrSalt}`;

                    // 1. Generate QR Buffer (Level 'Q' for balanced detection)
                    const ecl: 'L' | 'M' | 'Q' | 'H' = 'Q';

                    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
                        errorCorrectionLevel: ecl,
                        margin: 4, // Increased quiet zone
                        width: 512, // High resolution for vector sharp rendering
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    });

                    // 2. Check if we need a new page
                    if (currentY + labelHeight > pageHeight - margin) {
                        doc.addPage();
                        currentX = margin;
                        currentY = margin;
                        colIndex = 0;
                    }

                    // 3. Draw Label Boundary (Light dashed for cutting)
                    doc.save()
                        .dash(2, { space: 2 })
                        .strokeColor('#EEEEEE')
                        .rect(currentX, currentY, labelWidth, labelHeight)
                        .stroke()
                        .restore();

                    // 4. Draw QR Code (Centered in the symmetrical cell)
                    const qrX = currentX + (labelWidth - qrSize) / 2;
                    // For vertical symmetry, we center the QR + Metadata block or just the QR
                    // Metadata usually goes below. We center the group.
                    const metadataHeight = 15; // Estimated height for text
                    const totalContentHeight = qrSize + metadataHeight;
                    const contentY = currentY + (labelHeight - totalContentHeight) / 2;

                    doc.image(qrBuffer, qrX, contentY, { width: qrSize });

                    // 4b. Draw Center Logo (Integrated) - Optimized size at 15%
                    try {
                        const logoSize = qrSize * 0.15;
                        const logoX = qrX + (qrSize - logoSize) / 2;
                        const logoY = contentY + (qrSize - logoSize) / 2;
                        
                        doc.save();
                        doc.fillColor('#FFFFFF')
                           .rect(logoX - 1, logoY - 1, logoSize + 2, logoSize + 2)
                           .fill();
                        
                        doc.opacity(0.8)
                           .image(LOGO_PATH, logoX, logoY, { width: logoSize });
                        doc.restore();
                    } catch (e) {
                        // Silent error for logo
                    }

                    // 5. Minimal Metadata (No "Verified by Chaintrust" junk)
                    doc.fillColor('#000000');
                    let textY = contentY + qrSize + 2;

                    if (settings.showProductName) {
                        doc.fontSize(6).font('Helvetica-Bold').text((batch.productName || 'PRODUCT').toUpperCase(), currentX + 2, textY, {
                            width: labelWidth - 4,
                            align: 'center',
                            lineBreak: false
                        });
                        textY += 7;
                    }

                    const idText = (settings.showUnitIndex ? `ID: ${String(i + 1).padStart(6, '0')}` : '') + 
                                   (settings.showBatchNumber ? ` | B:${batch.batchNumber}` : '');
                  
                    if (idText) {
                        doc.fontSize(5).font('Helvetica').fillColor('#666666').text(idText, currentX + 2, textY, {
                            width: labelWidth - 4,
                            align: 'center'
                        });
                        textY += 6;
                    }

                    // 6. Update coordinates for next unit
                    colIndex++;
                    if (colIndex >= cols) {
                        colIndex = 0;
                        currentX = margin;
                        currentY += labelHeight;
                    } else {
                        currentX += labelWidth;
                    }
                }

                doc.end();
            } catch (err) {
                doc.emit('error', err);
            }
        })();
    });
};
