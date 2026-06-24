const purchaseOrders = [];

const createPurchaseOrder = (purchaseOrderEntity) => {
  purchaseOrders.push(purchaseOrderEntity);
  return purchaseOrderEntity;
};

const findAll = () => purchaseOrders;

const findById = (purchaseOrderId) => purchaseOrders.find((po) => po.id === purchaseOrderId);

const updatePurchaseOrder = (purchaseOrderId, updateData) => {
  const index = purchaseOrders.findIndex((po) => po.id === purchaseOrderId);
  if (index === -1) return null;

  purchaseOrders[index] = {
    ...purchaseOrders[index],
    ...updateData,
    id: purchaseOrderId,
    updatedAt: new Date().toISOString()
  };

  return purchaseOrders[index];
};

const deletePurchaseOrder = (purchaseOrderId) => {
  const index = purchaseOrders.findIndex((po) => po.id === purchaseOrderId);
  if (index === -1) return false;

  purchaseOrders.splice(index, 1);
  return true;
};

module.exports = {
  createPurchaseOrder,
  findAll,
  findById,
  updatePurchaseOrder,
  deletePurchaseOrder
};
