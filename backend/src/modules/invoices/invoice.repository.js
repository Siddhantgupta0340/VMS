import prisma from '../../config/prisma.js';

const invoiceInclude = {
  vendor: true,
  purchase_order: true,
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
  payments: true,
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
