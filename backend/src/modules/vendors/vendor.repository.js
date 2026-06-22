const vendors = [];

/**
 * Repository Layer
 * - Acts as the data access layer
 * - Uses in-memory storage for now (no DB integration)
 * - Can be swapped later with PostgreSQL/Prisma without changing controller/service
 */

const createVendor = (vendorEntity) => {
  vendors.push(vendorEntity);
  return vendorEntity;
};

const findAll = () => vendors;
 
const findById = (vendorId) => vendors.find((vendor) => vendor.id === vendorId);

const updateVendor = (vendorId, updateData) => {
  const index = vendors.findIndex((vendor) => vendor.id === vendorId);
  if (index === -1) return null;

  vendors[index] = {
    ...vendors[index],
    ...updateData,
    id: vendorId
  };

  return vendors[index];
};

const deleteVendor = (vendorId) => {
  const index = vendors.findIndex((vendor) => vendor.id === vendorId);
  if (index === -1) return false;

  vendors.splice(index, 1);
  return true;
};

module.exports = {
  createVendor,
  findAll
  ,
  findById,
  updateVendor,
  deleteVendor
};

