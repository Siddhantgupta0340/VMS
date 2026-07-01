import { ROLES } from '../zodSchema/index.js';

export const INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PENDING_L1: 'PENDING_L1',
  PENDING_L2: 'PENDING_L2',
  PENDING_L3: 'PENDING_L3',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
};

export const INVOICE_APPROVAL_LIMITS = {
  L1_MAX: 10000,
  L2_MAX: 100000,
};

/**
 * Get the maximum approval role required for a given invoice amount.
 * - <= 10,000 needs L1
 * - 10,001 to 100,000 needs L2
 * - > 100,000 needs L3
 */
export const getRequiredInvoiceApprovalRole = (amount) => {
  const invoiceAmount = Number(amount || 0);

  if (invoiceAmount <= INVOICE_APPROVAL_LIMITS.L1_MAX) {
    return ROLES.L1;
  }

  if (invoiceAmount <= INVOICE_APPROVAL_LIMITS.L2_MAX) {
    return ROLES.L2;
  }

  return ROLES.L3;
};

/**
 * Alias for getRequiredInvoiceApprovalRole.
 */
export const getRequiredApprovalLevel = (amount) => {
  return getRequiredInvoiceApprovalRole(amount);
};

/**
 * Determine the current approval level (L1 | L2 | L3 | null) based on invoice status.
 * Handles normalization of status strings (including legacy lowercase 'pending').
 */
export const getCurrentApprovalLevel = (status) => {
  const statusUpper = (status || '').toUpperCase();

  if (statusUpper === INVOICE_STATUS.PENDING_L1 || statusUpper === 'PENDING') {
    return 'L1';
  }
  if (statusUpper === INVOICE_STATUS.PENDING_L2) {
    return 'L2';
  }
  if (statusUpper === INVOICE_STATUS.PENDING_L3) {
    return 'L3';
  }
  return null;
};

/**
 * Determine the next status in the workflow when a level approves.
 */
export const getNextApprovalStatus = (amount, currentStatus) => {
  const invoiceAmount = Number(amount || 0);
  const statusUpper = (currentStatus || '').toUpperCase();

  // Handle both standard PENDING_L1 and legacy 'pending'
  if (statusUpper === INVOICE_STATUS.PENDING_L1 || statusUpper === 'PENDING') {
    if (invoiceAmount <= INVOICE_APPROVAL_LIMITS.L1_MAX) {
      return INVOICE_STATUS.APPROVED;
    }
    return INVOICE_STATUS.PENDING_L2;
  }

  if (statusUpper === INVOICE_STATUS.PENDING_L2) {
    if (invoiceAmount <= INVOICE_APPROVAL_LIMITS.L2_MAX) {
      return INVOICE_STATUS.APPROVED;
    }
    return INVOICE_STATUS.PENDING_L3;
  }

  if (statusUpper === INVOICE_STATUS.PENDING_L3) {
    return INVOICE_STATUS.APPROVED;
  }

  return currentStatus;
};

/**
 * Validates whether a status transition is permitted.
 * Supports legacy status strings and case-insensitivity.
 */
export const isValidStatusTransition = (fromStatus, toStatus) => {
  const fromUpper = (fromStatus || '').toUpperCase();
  const toUpper = (toStatus || '').toUpperCase();

  // Map legacy status 'PENDING' to PENDING_L1 for validation purposes
  const normalizedFrom = fromUpper === 'PENDING' ? INVOICE_STATUS.PENDING_L1 : fromUpper;

  const transitions = {
    [INVOICE_STATUS.DRAFT]: [INVOICE_STATUS.SUBMITTED, INVOICE_STATUS.CANCELLED],
    [INVOICE_STATUS.SUBMITTED]: [INVOICE_STATUS.PENDING_L1, INVOICE_STATUS.CANCELLED],
    [INVOICE_STATUS.PENDING_L1]: [INVOICE_STATUS.PENDING_L2, INVOICE_STATUS.APPROVED, INVOICE_STATUS.REJECTED, INVOICE_STATUS.CANCELLED],
    [INVOICE_STATUS.PENDING_L2]: [INVOICE_STATUS.PENDING_L3, INVOICE_STATUS.APPROVED, INVOICE_STATUS.REJECTED, INVOICE_STATUS.CANCELLED],
    [INVOICE_STATUS.PENDING_L3]: [INVOICE_STATUS.APPROVED, INVOICE_STATUS.REJECTED, INVOICE_STATUS.CANCELLED],
    [INVOICE_STATUS.APPROVED]: [],
    [INVOICE_STATUS.REJECTED]: [],
    [INVOICE_STATUS.CANCELLED]: [],
  };

  return (transitions[normalizedFrom] || []).includes(toUpper);
};
