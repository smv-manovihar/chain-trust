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
        
        // Label calculations
        const cols = settings.columns || 4;
        const padding = (settings.labelPadding || 5) * MM_TO_PT;
        
        // Dynamic QR Sizing: 
        // Ensure QR code fits inside the column width after padding.
        const availableWidth = pageWidth - 2 * margin;
        const labelWidth = availableWidth / cols;
        
        // qrSize is taken from settings or defaults to 85% of labelWidth
        let qrSize = (settings.qrSize || 0) * MM_TO_PT;
        if (qrSize === 0 || qrSize > (labelWidth - 2 * padding)) {
            qrSize = labelWidth - 2 * padding;
        }

        const labelHeight = qrSize + (padding * 2) + 20; // Compressed branding space
        
        let currentX = margin;
        let currentY = margin;
        let colIndex = 0;

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Use a self-executing async function to handle the loop
        (async () => {
            try {
                for (let i = 0; i < batch.quantity; i++) {
                    // Derive salt locally to avoid passing huge arrays
                    const unitHash = crypto.createHash('sha256').update(`${batch.batchSalt}-${i}`).digest('hex');
                    const qrSalt = `${batch.batchSalt}:${i}:${unitHash}`;
                    const verifyUrl = `${frontendUrl}/verify?salt=${qrSalt}`;

                    // 1. Generate QR Buffer (Balanced ECL for logo integration)
                    const ecl: 'L' | 'M' | 'Q' | 'H' = 'M';

                    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
                        errorCorrectionLevel: ecl,
                        margin: 2,
                        width: 512, // Reduced resolution for PDF performance
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

                    // 4. Draw QR Code (Centered in the column)
                    const qrX = currentX + (labelWidth - qrSize) / 2;
                    const qrY = currentY + padding;
                    doc.image(qrBuffer, qrX, qrY, { width: qrSize });

                    // 4b. Draw Center Logo (Integrated)
                    try {
                        const logoSize = qrSize * 0.18;
                        const logoX = qrX + (qrSize - logoSize) / 2;
                        const logoY = qrY + (qrSize - logoSize) / 2;
                        
                        doc.save();
                        doc.fillColor('#FFFFFF')
                           .rect(logoX - 1, logoY - 1, logoSize + 2, logoSize + 2)
                           .fill();
                        
                        doc.opacity(0.65)
                           .image(LOGO_PATH, logoX, logoY, { width: logoSize });
                        doc.restore();
                    } catch (e) {
                        // Silent error for logo
                    }

                    // 5. Draw Metadata
                    doc.fillColor('#000000');
                    let textY = currentY + padding + qrSize + 1;

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
