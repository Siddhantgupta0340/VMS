const OCR_CAPABLE_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

export const shouldAttemptOcr = (file) => OCR_CAPABLE_MIME_TYPES.has(file?.mimetype);

export const processInvoiceOcr = async (file) => {
  if (!shouldAttemptOcr(file)) {
    return {
      status: 'FAILED',
      confidence: null,
      extractedData: {
        reason: 'Unsupported invoice file type for OCR.',
      },
    };
  }

  if (!process.env.OCR_PROVIDER) {
    return {
      status: 'FAILED',
      confidence: null,
      extractedData: {
        reason: 'OCR provider is not configured.',
      },
    };
  }

  return {
    status: 'PROCESSING',
    confidence: null,
    extractedData: null,
  };
};
