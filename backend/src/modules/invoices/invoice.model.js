const createInvoiceEntity = ({
  id,
  invoiceNumber,
  purchaseOrderId,
  invoiceDate,
  amount,
  status,
  remarks,
  createdAt,
  updatedAt
}) => ({
  id,
  invoiceNumber,
  purchaseOrderId,
  invoiceDate,
  amount,
  status,
  remarks,
  createdAt,
  updatedAt
});

module.exports = {
  createInvoiceEntity
};
