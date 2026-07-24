import fs from 'fs';

const OCR_CAPABLE_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

export const shouldAttemptOcr = (file) => {
  if (!file) return false;
  const mime = file.mimetype || file.type;
  const name = file.originalname || file.name || '';
  if (OCR_CAPABLE_MIME_TYPES.has(mime)) return true;
  return /\.(pdf|png|jpe?g)$/i.test(name);
};

// ─── Text Extraction Helper ────────────────────────────────────────────────────

const extractTextFromBuffer = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) return '';

  const rawStr = buffer.toString('utf-8');
  let cleanText = '';

  // Extract readable text chunks from PDF streams or plain text
  const matches = rawStr.match(/\(([^()]{2,})\)|\[([^\[\]]{2,})\]|([A-Za-z0-9\s:.,\/\-]{4,})/g);
  if (matches && matches.length > 0) {
    cleanText = matches
      .join(' ')
      .replace(/[\\()]/g, ' ')
      .replace(/\s+/g, ' ');
  } else {
    cleanText = rawStr.replace(/[^\x20-\x7E\n]/g, ' ');
  }

  return cleanText;
};

// ─── Document Parsing Engine ──────────────────────────────────────────────────

export const processInvoiceOcr = async (file) => {
  if (!shouldAttemptOcr(file)) {
    return {
      status: 'FAILED',
      confidence: 0,
      extractedData: {
        reason: 'Unsupported file format for OCR. Please upload a PDF, PNG, JPG, or JPEG file.',
      },
    };
  }

  try {
    let fileBuffer = file.buffer;
    if (!fileBuffer && file.path) {
      fileBuffer = fs.readFileSync(file.path);
    }

    const text = extractTextFromBuffer(fileBuffer);
    const fileName = file.originalname || file.name || 'uploaded_invoice';

    // 1. PO Number Extraction
    const poMatch = text.match(/\b(PO-\d{4}-\d{6})\b/i) ||
                    text.match(/\bPO\s*#?\s*[:.-]?\s*([A-Z0-9-]+)\b/i) ||
                    text.match(/\bPurchase\s*Order\s*#?\s*[:.-]?\s*([A-Z0-9-]+)\b/i);
    const poNumber = poMatch ? (poMatch[1] || poMatch[0]).toUpperCase() : null;

    // 2. Invoice Number Extraction
    const invMatch = text.match(/\b(INV-\d{4}-\d{6})\b/i) ||
                     text.match(/\bInvoice\s*(?:No|Number|#)\s*[:.-]?\s*([A-Z0-9-]+)\b/i) ||
                     text.match(/\bBill\s*(?:No|Number|#)\s*[:.-]?\s*([A-Z0-9-]+)\b/i);
    const invoiceNumber = invMatch ? (invMatch[1] || invMatch[0]).toUpperCase() : null;

    // 3. Date Extraction
    const invDateMatch = text.match(/\bInvoice\s*Date\s*[:.-]?\s*(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})\b/i) ||
                         text.match(/\bDate\s*[:.-]?\s*(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})\b/i);
    const invoiceDate = invDateMatch ? invDateMatch[1] : null;

    const dueDateMatch = text.match(/\bDue\s*Date\s*[:.-]?\s*(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})\b/i) ||
                        text.match(/\bPay\s*By\s*[:.-]?\s*(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})\b/i);
    const dueDate = dueDateMatch ? dueDateMatch[1] : null;

    // 4. GSTIN & PAN Extraction
    const gstinMatch = text.match(/\b(\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1})\b/);
    const gstin = gstinMatch ? gstinMatch[1] : null;

    const panMatch = text.match(/\b([A-Z]{5}\d{4}[A-Z])\b/);
    const pan = panMatch ? panMatch[1] : null;

    // 5. Vendor Contact Metadata
    const emailMatch = text.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
    const email = emailMatch ? emailMatch[1] : null;

    const phoneMatch = text.match(/(?:\+91|0)?[6-9]\d{9}\b/);
    const phone = phoneMatch ? phoneMatch[0] : null;

    // 6. Bank Details Extraction
    const bankAccountMatch = text.match(/\b(?:A\/C|Account|Acc|A\/c No\.?)\s*[:.-]?\s*(\d{9,18})\b/i);
    const bankAccountNo = bankAccountMatch ? bankAccountMatch[1] : null;

    const ifscMatch = text.match(/\b([A-Z]{4}0[A-Z0-9]{6})\b/);
    const ifscCode = ifscMatch ? ifscMatch[1] : null;

    const bankNameMatch = text.match(/\bBank\s*Name\s*[:.-]?\s*([A-Za-z\s]+?)(?=\s{2,}|Account|IFSC|\n|$)/i);
    const bankName = bankNameMatch ? bankNameMatch[1].trim() : null;

    // 7. Reference Documents (GRN, Delivery Challan)
    const grnMatch = text.match(/\b(GRN-\d{4}-\d{6})\b/i) ||
                     text.match(/\bGRN\s*#?\s*[:.-]?\s*([A-Z0-9-]+)\b/i);
    const grnNumber = grnMatch ? (grnMatch[1] || grnMatch[0]).toUpperCase() : null;

    const dcMatch = text.match(/\b(DC-\d{4}-\d{6})\b/i) ||
                    text.match(/\bDelivery\s*Challan\s*#?\s*[:.-]?\s*([A-Z0-9-]+)\b/i);
    const deliveryChallanNumber = dcMatch ? (dcMatch[1] || dcMatch[0]).toUpperCase() : null;

    // 8. Amount & Currency Extraction
    const grandTotalMatch = text.match(/(?:Grand Total|Net Amount|Total Amount|Total)\s*[:.-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+(?:\.\d{2})?)/i);
    const grandTotalStr = grandTotalMatch ? grandTotalMatch[1].replace(/,/g, '') : null;
    const grandTotal = grandTotalStr ? parseFloat(grandTotalStr) : null;

    const subtotalMatch = text.match(/(?:Subtotal|Taxable Amount|Taxable Value)\s*[:.-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+(?:\.\d{2})?)/i);
    const subtotalStr = subtotalMatch ? subtotalMatch[1].replace(/,/g, '') : null;
    const subtotal = subtotalStr ? parseFloat(subtotalStr) : null;

    // 9. Compute Confidence Score
    let points = 0;
    let maxPoints = 8;
    if (poNumber) points += 2;
    if (invoiceNumber) points += 1;
    if (gstin) points += 1;
    if (grandTotal) points += 2;
    if (email || phone) points += 1;
    if (bankAccountNo || ifscCode) points += 1;

    const confidenceScore = Math.min(Math.round((points / maxPoints) * 100), 98);

    const extractedData = {
      sourceFileName: fileName,
      ocrConfidence: confidenceScore,
      header: {
        invoiceNumber: invoiceNumber,
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        currency: 'INR',
        paymentTerms: 'Net 30',
        invoiceCategory: 'TAX_INVOICE',
      },
      vendor: {
        gstin: gstin,
        pan: pan,
        email: email,
        phone: phone,
      },
      company: {
        companyName: 'ACRE India Pvt Ltd',
        companyGstin: '27AAAAA1111A1Z1',
      },
      bank: {
        bankName: bankName,
        accountNumber: bankAccountNo,
        ifscCode: ifscCode,
      },
      references: {
        poNumber: poNumber,
        grnNumber: grnNumber,
        deliveryChallanNumber: deliveryChallanNumber,
      },
      totals: {
        subtotal: subtotal,
        grandTotal: grandTotal,
      },
      rawTextSummary: text.substring(0, 500),
    };

    return {
      status: 'SUCCESS',
      confidence: confidenceScore,
      extractedData,
    };
  } catch (error) {
    console.error('[OCR Service] Error processing invoice file:', error);
    return {
      status: 'FAILED',
      confidence: 0,
      extractedData: {
        reason: 'Failed to parse invoice file text.',
        error: error.message,
      },
    };
  }
};
