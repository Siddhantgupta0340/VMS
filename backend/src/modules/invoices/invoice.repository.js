const invoices = [];

const createInvoice = (invoiceEntity) => {
  invoices.push(invoiceEntity);
  return invoiceEntity;
};

const findAll = () => invoices;

const findById = (invoiceId) => invoices.find((inv) => inv.id === invoiceId);

const updateInvoice = (invoiceId, updateData) => {
  const index = invoices.findIndex((inv) => inv.id === invoiceId);
  if (index === -1) return null;

  invoices[index] = {
    ...invoices[index],
    ...updateData,
    id: invoiceId,
    updatedAt: new Date().toISOString()
  };

  return invoices[index];
};

const deleteInvoice = (invoiceId) => {
  const index = invoices.findIndex((inv) => inv.id === invoiceId);
  if (index === -1) return false;

  invoices.splice(index, 1);
  return true;
};

module.exports = {
  createInvoice,
  findAll,
  findById,
  updateInvoice,
  deleteInvoice
};
