import ApiError from '../../utils/ApiError.js';
import vendorRepository from './vendor.repository.js';
import approvalRepository from '../approvals/approval.repository.js';
import notificationService from '../notifications/notification.service.js';
import { ROLES } from '../../zodSchema/index.js';
import { VENDOR_MESSAGES, VENDOR_STATUS } from './vendor.constants.js';
import prisma from '../../config/prisma.js';

const buildVendorCode = (name) => {
  const prefix = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'VEND';
  return `${prefix}-${Date.now()}`;
};

const mapVendorData = (data, userId) => ({
  name: data.name,
  vendor_code: data.vendorCode || buildVendorCode(data.name),
  email: data.email,
  phone: data.phone,
  address: data.address,
  city: data.city,
  state: data.state,
  zip_code: data.zipCode,
  tax_id: data.taxId,
  category: data.category,
  contact_person: data.contactPerson,
  bank_account_no: data.bankAccountNo,
  ifsc_code: data.ifscCode,
  payment_terms: data.paymentTerms,
  status: VENDOR_STATUS.PENDING,
  created_by_id: userId,
});

class VendorService {
  async createVendor(payload, user) {
    try {
      return await vendorRepository.create(mapVendorData(payload, user.id));
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ApiError(409, VENDOR_MESSAGES.DUPLICATE);
      }
      throw error;
    }
  }

  async listVendors(query, user) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const where = {
      deleted_at: null,
      ...(query.status && { status: query.status }),
      ...(user.role === ROLES.CASE_MANAGER && { created_by_id: user.id }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { vendor_code: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { tax_id: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const result = await vendorRepository.findAll({
      where,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async getVendorById(id, user) {
    const vendor = await vendorRepository.findById(id);
    if (!vendor) {
      throw new ApiError(404, VENDOR_MESSAGES.NOT_FOUND);
    }

    if (user.role === ROLES.CASE_MANAGER && vendor.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only access vendors created by you.');
    }

    return vendor;
  }

  /**
   * Update vendor details (only allowed for PENDING/REJECTED vendors, by creator or admin)
   */
  async updateVendor(id, payload, user) {
    const vendor = await vendorRepository.findById(id);
    if (!vendor) {
      throw new ApiError(404, VENDOR_MESSAGES.NOT_FOUND);
    }

    // Case manager can only update their own vendors
    if (user.role === ROLES.CASE_MANAGER && vendor.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only update vendors created by you.');
    }

    // Cannot update an approved vendor's core details (only admin can)
    if (vendor.status === VENDOR_STATUS.APPROVED && user.role === ROLES.CASE_MANAGER) {
      throw new ApiError(400, 'Approved vendors cannot be edited by a case manager.');
    }

    const updateData = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.email !== undefined) updateData.email = payload.email;
    if (payload.phone !== undefined) updateData.phone = payload.phone;
    if (payload.address !== undefined) updateData.address = payload.address;
    if (payload.city !== undefined) updateData.city = payload.city;
    if (payload.state !== undefined) updateData.state = payload.state;
    if (payload.zipCode !== undefined) updateData.zip_code = payload.zipCode;
    if (payload.taxId !== undefined) updateData.tax_id = payload.taxId;
    if (payload.category !== undefined) updateData.category = payload.category;
    if (payload.contactPerson !== undefined) updateData.contact_person = payload.contactPerson;
    if (payload.bankAccountNo !== undefined) updateData.bank_account_no = payload.bankAccountNo;
    if (payload.ifscCode !== undefined) updateData.ifsc_code = payload.ifscCode;
    if (payload.paymentTerms !== undefined) updateData.payment_terms = payload.paymentTerms;

    const pendingUpdateData = buildPendingChangePayload(payload);
    if (payload.status !== undefined && user.role === ROLES.FINANCE_HEAD) {
      Object.assign(pendingUpdateData, buildVendorStatusData(payload.status, user.id, new Date()));
    }

    try {
      await ensureVendorIsUnique(payload, id);
      if (isVendorApprovedAndActive(vendor) && user.role === ROLES.CASE_MANAGER) {
        const pendingChanges = {
          ...(vendor.pending_changes || {}),
          ...updateData,
        };

        const updatedVendor = await vendorRepository.transaction(async (tx) => {
          const updated = await tx.vendor.update({
            where: { id },
            data: {
              pending_changes: pendingChanges,
              pending_change_status: VENDOR_PENDING_CHANGE_STATUS.PENDING_APPROVAL,
              pending_change_requested_by_id: user.id,
              pending_change_requested_at: new Date(),
              approval_remarks: null,
            },
            include: {
              created_by: { select: { id: true, email: true, first_name: true, last_name: true, role: true } },
              approved_by: { select: { id: true, email: true, first_name: true, last_name: true, role: true } },
              documents: {
                where: { deleted_at: null, status: 'ACTIVE' },
                orderBy: { uploaded_at: 'desc' },
                include: { uploaded_by: { select: { id: true, email: true, first_name: true, last_name: true, role: true } } },
              },
            },
          });

          await tx.auditLog.create({
            data: {
              entity_type: 'vendor',
              entity_id: id,
              action: 'vendor_change_submitted',
              from_status: vendor.approval_status,
              to_status: VENDOR_PENDING_CHANGE_STATUS.PENDING_APPROVAL,
              performed_by_id: user.id,
              old_value: Object.fromEntries(Object.keys(updateData).map((key) => [key, vendor[key] ?? null])),
              new_value: pendingChanges,
            },
          });

          await tx.approvalLog.create({
            data: {
              entity_type: 'vendor',
              entity_id: id,
              action: 'submitted',
              from_status: vendor.approval_status,
              to_status: VENDOR_PENDING_CHANGE_STATUS.PENDING_APPROVAL,
              performed_by_id: user.id,
              remarks: 'Approved vendor changes submitted for Finance Head review.',
            },
          });

          return updated;
        });

        notificationService.notifyVendorApprovalRequested(updatedVendor).catch(() => {});
        return {
          ...updatedVendor,
          approvalReadiness: getVendorApprovalReadiness(updatedVendor),
          pendingChangeSummary: pendingChanges,
        };
      }

      const updatedVendor = await vendorRepository.transaction(async (tx) => {
        const updated = await tx.vendor.update({
          where: { id },
          data: updateData,
          include: {
            created_by: { select: { id: true, email: true, first_name: true, last_name: true, role: true } },
            approved_by: { select: { id: true, email: true, first_name: true, last_name: true, role: true } },
            documents: {
              where: { deleted_at: null, status: 'ACTIVE' },
              orderBy: { uploaded_at: 'desc' },
              include: { uploaded_by: { select: { id: true, email: true, first_name: true, last_name: true, role: true } } },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            entity_type: 'vendor',
            entity_id: id,
            action: 'vendor_updated',
            performed_by_id: user.id,
            old_value: Object.fromEntries(
              Object.keys(updateData).map((key) => [key, vendor[key] ?? null]),
            ),
            new_value: updateData,
          },
        });

        return updated;
      });
      const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
      notificationService.notifyVendorUpdated(updatedVendor, actorName).catch(() => {});
      return updatedVendor;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ApiError(409, VENDOR_MESSAGES.DUPLICATE);
      }
      throw error;
    }
  }

  async changeVendorStatus(id, status, user, remarks) {
    const vendor = await vendorRepository.findById(id);
    if (!vendor) {
      throw new ApiError(404, VENDOR_MESSAGES.NOT_FOUND);
    }

    const now = new Date();
    const statusData = {
      status,
      approved_by_id: status === VENDOR_STATUS.APPROVED ? user.id : null,
      approved_at: status === VENDOR_STATUS.APPROVED ? now : null,
      rejected_at: status === VENDOR_STATUS.REJECTED ? now : null,
      blocked_at: status === VENDOR_STATUS.BLOCKED ? now : null,
    };

    const updatedVendor = await vendorRepository.update(id, statusData);

    await approvalRepository.createLog({
      entity_type: 'vendor',
      entity_id: id,
      action: status,
      from_status: vendor.status,
      to_status: status,
      performed_by_id: user.id,
      remarks,
    });

    // Fire notification to the vendor creator (non-blocking)
    const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
    notificationService.notifyVendorStatusChange(updatedVendor, status, actorName).catch(() => {});

    return updatedVendor;
  }

  async unblockVendor(id, user, remarks) {
    const vendor = await vendorRepository.findById(id);
    if (!vendor) {
      throw new ApiError(404, VENDOR_MESSAGES.NOT_FOUND);
    }

    if (vendor.status !== VENDOR_STATUS.BLOCKED) {
      throw new ApiError(400, 'Only blocked vendors can be unblocked.');
    }

    const now = new Date();
    const statusData = {
      status: VENDOR_STATUS.APPROVED,
      approved_by_id: user.id,
      approved_at: now,
      blocked_at: null,
      rejected_at: null,
    };

    const updatedVendor = await vendorRepository.update(id, statusData);

    await approvalRepository.createLog({
      entity_type: 'vendor',
      entity_id: id,
      action: 'unblocked',
      from_status: VENDOR_STATUS.BLOCKED,
      to_status: VENDOR_STATUS.APPROVED,
      performed_by_id: user.id,
      remarks,
    });

    // Fire notification to the vendor creator (non-blocking)
    const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
    notificationService.notifyVendorStatusChange(updatedVendor, VENDOR_STATUS.APPROVED, actorName).catch(() => {});

    return updatedVendor;
  }
}

export default new VendorService();

