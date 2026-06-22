const { randomUUID } = require("crypto");

const {
  createVendor,
  findAll: findAllVendors
  ,
  findById,
  updateVendor,
  deleteVendor
} = require("./vendor.repository");
const { createVendorEntity } = require("./vendor.model");

/**
 * Service Layer
 * - Owns business logic for creating vendors
 * - Generates a unique vendor id
 * - Coordinates the "repository" data persistence
 *
 * NOTE: Payload validation is intentionally handled in the Validation Layer
 * (vendor.validation.js) by the controller.
 */
const createVendorService = (validatedPayload) => {
  const id = randomUUID();

  const vendorEntity = createVendorEntity({
    id,
    createdAt: new Date().toISOString(),
    ...validatedPayload
  });

  return createVendor(vendorEntity);
};

const getVendorsService = () => {
  return findAllVendors();
};

const updateVendorService = (vendorId, validatedPayload) => {
  const existingVendor = findById(vendorId);
  if (!existingVendor) return null;

  const updatedVendor = createVendorEntity({
    ...existingVendor,
    ...validatedPayload,
    id: vendorId,
    createdAt: existingVendor.createdAt
  });

  return updateVendor(vendorId, updatedVendor);
};

const deleteVendorService = (vendorId) => {
  return deleteVendor(vendorId);
};

// Partial update for PATCH: only apply provided fields
const patchVendorService = (vendorId, partialPayload) => {
  const existingVendor = findById(vendorId);
  if (!existingVendor) return null;

  // Pass partial payload to repository which merges with existing vendor
  return updateVendor(vendorId, partialPayload);
};

module.exports = {
  createVendorService,
  getVendorsService
  ,
  updateVendorService,
  deleteVendorService
  ,
  patchVendorService
};


