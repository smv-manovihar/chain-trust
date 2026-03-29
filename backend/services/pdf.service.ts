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
 * Handles multi-page generation if units exceed single sheet capacity.
 */
export const generateBatchPDF = async (batch: any, settings: QRSettings): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 10,
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // A4 dimensions in points (1mm = 2.8346 pts)
    const MM_TO_PT = 2.8346;
    const pageWidth = 210 * MM_TO_PT;
    const pageHeight = 297 * MM_TO_PT;
    const margin = 10 * MM_TO_PT;
    
    // Label calculations
    const cols = settings.columns || 4;
    const padding = (settings.labelPadding || 5) * MM_TO_PT;
    const qrSize = (settings.qrSize || 40) * MM_TO_PT;
    
    // Each label "box" width
    const availableWidth = pageWidth - 2 * margin;
    const labelWidth = availableWidth / cols;
    const labelHeight = qrSize + (padding * 2) + 25; // Extra space for branding
    
    let currentX = margin;
    let currentY = margin;
    let colIndex = 0;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    for (let i = 0; i < batch.quantity; i++) {
        // Derive salt locally to avoid passing huge arrays
        const unitHash = crypto.createHash('sha256').update(`${batch.batchSalt}-${i}`).digest('hex');
        const qrSalt = `${batch.batchSalt}:${i}:${unitHash}`;
        const verifyUrl = `${frontendUrl}/verify?salt=${qrSalt}`;

        // 1. Generate QR Buffer (Dynamic Error Correction for professional scaling)
        let ecl: 'L' | 'M' | 'Q' | 'H' = 'M';
        if (settings.qrSize < 20) ecl = 'L';
        else if (settings.qrSize < 45) ecl = 'M';
        else if (settings.qrSize < 70) ecl = 'Q';
        else ecl = 'H';

        const qrBuffer = await QRCode.toBuffer(verifyUrl, {
            errorCorrectionLevel: ecl,
            margin: 0,
            width: 1024, // High quality buffer for sharp scaling
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
        doc.image(qrBuffer, qrX, currentY + padding, { width: qrSize });

        // 5. Draw Metadata
        doc.fillColor('#000000');
        let textY = currentY + padding + qrSize + 2;

        if (settings.showProductName) {
            doc.fontSize(7).font('Helvetica-Bold').text((batch.productName || 'PRODUCT').toUpperCase(), currentX + 2, textY, {
                width: labelWidth - 4,
                align: 'center',
                lineBreak: false
            });
            textY += 8;
        }

        const idText = (settings.showUnitIndex ? `ID: ${String(i + 1).padStart(6, '0')}` : '') + 
                       (settings.showBatchNumber ? ` | B:${batch.batchNumber}` : '');
      
        if (idText) {
            doc.fontSize(6).font('Helvetica').fillColor('#666666').text(idText, currentX + 2, textY, {
                width: labelWidth - 4,
                align: 'center'
            });
            textY += 8;
        }

        // Branding Logo (Centered and small)
      try {
        const logoSize = 10;
        doc.image(LOGO_PATH, currentX + (labelWidth - logoSize) / 2, textY, { height: logoSize });
      } catch (e) {
        doc.fontSize(5).fillColor('#CCCCCC').text('CHAINTRUST', currentX + 2, textY, {
          width: labelWidth - 4,
          align: 'center'
        });
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
  });
};
