/**
 * Model Layer
 * - Defines the Vendor domain entity shape
 * - Encapsulates basic construction logic for vendor objects
 * - Makes the module easier to extend later (Prisma / ORM mapping)
 */

const createVendorEntity = ({
  id,
  createdAt,
  vendorName,
  companyName,
  email,
  phone,
  gstNumber,
  address,
  city,
  state,
  country,
  category,
  contactPerson
}) => ({
  id,
  vendorName,
  companyName,
  email,
  phone,
  gstNumber,
  address,
  city,
  state,
  country,
  category,
  contactPerson,
  createdAt
});

module.exports = {
  createVendorEntity
};
