import prisma from '../../config/prisma.js';

const invoiceInclude = {
  vendor: true,
<<<<<<< HEAD
  purchase_order: true,
=======
  purchase_order: {
    include: {
      grns: {
        where: { deleted_at: null },
        orderBy: { created_at: 'desc' },
        take: 1,
      },
      delivery_challans: {
        where: { deleted_at: null },
        orderBy: { created_at: 'desc' },
        take: 1,
      },
    },
  },
  three_way_matches: {
    where: { status: 'MATCHED' },
    orderBy: { created_at: 'desc' },
    take: 1,
  },
  payment_approvals: {
    where: { status: 'APPROVED' },
    orderBy: { approved_at: 'desc' },
    take: 1,
  },
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
  created_by: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
  updated_by: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
  team_lead_approver: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
  manager_approver: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
  finance_head_approver: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
  rejected_by: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
<<<<<<< HEAD
  payments: true,
=======
  attachments: {
    where: { deleted_at: null },
    orderBy: { uploaded_at: 'asc' },
  },
  payments: {
    select: { id: true, payment_number: true, amount: true, status: true, created_at: true },
  },
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
};

class InvoiceRepository {
  async create(data) {
    return prisma.invoice.create({ data, include: invoiceInclude });
  }

  async findAll({ where, skip = 0, take = 10 }) {
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(take),
        orderBy: { created_at: 'desc' },
        include: invoiceInclude,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { invoices, total };
  }

  async findById(id) {
    return prisma.invoice.findUnique({
      where: { id },
      include: invoiceInclude,
    });
  }

  async update(id, data) {
    return prisma.invoice.update({
      where: { id },
      data,
      include: invoiceInclude,
    });
  }

  /**
   * Run a transaction.
   */
  async transaction(callback) {
    return prisma.$transaction(callback);
  }
}

export default new InvoiceRepository();
