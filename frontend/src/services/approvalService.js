import { approvals } from "../mock/approvals";

// Future Ready Service

export const getApprovals = async () => {
  return approvals;
};

export const getApprovalById = async (id) => {
  return approvals.find((item) => item.id === id);
};

export const approveInvoice = async (id) => {
  console.log("Approve", id);
};

export const rejectInvoice = async (id) => {
  console.log("Reject", id);
};

export const holdInvoice = async (id) => {
  console.log("Hold", id);
};