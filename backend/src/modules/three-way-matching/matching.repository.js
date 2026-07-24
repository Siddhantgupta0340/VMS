import prisma from '../../config/prisma.js';

class MatchingRepository {
  /**
   * Find ThreeWayMatch by ID.
   */
  async findById(id) {
    return prisma.threeWayMatch.findUnique({
      where: { id },
      include: {
        invoice:       { include: { vendor: true, purchase_order: true } },
        purchase_order: true,
        grn:           true,
        completed_by:  { select: { id: true, first_name: true, last_name: true, role: true } },
      },
    });
  }

  /**
   * Find all ThreeWayMatch records for an invoice.
   */
  async findByInvoiceId(invoiceId) {
    return prisma.threeWayMatch.findMany({
      where:   { invoice_id: invoiceId },
      orderBy: { created_at: 'desc' },
      include: {
        completed_by: { select: { id: true, first_name: true, last_name: true } },
        grn:          true,
      },
    });
  }

  /**
   * Create a new ThreeWayMatch record.
   */
  async create(data) {
    return prisma.threeWayMatch.create({
      data,
      include: {
        invoice:        { include: { vendor: true, purchase_order: true } },
        purchase_order: true,
        grn:            true,
      },
    });
  }

  /**
   * Update a ThreeWayMatch record.
   */
  async update(id, data) {
    return prisma.threeWayMatch.update({
      where: { id },
      data,
      include: {
        invoice:        { include: { vendor: true, purchase_order: true } },
        purchase_order: true,
        grn:            true,
      },
    });
  }

  /**
   * Get the latest match for an invoice.
   */
  async findLatestByInvoiceId(invoiceId) {
    return prisma.threeWayMatch.findFirst({
      where:   { invoice_id: invoiceId },
      orderBy: { created_at: 'desc' },
      include: {
        grn:          true,
        completed_by: { select: { id: true, first_name: true, last_name: true } },
      },
    });
  }

  /**
   * List all matches with filters and pagination.
   */
  async findAll({ where = {}, skip = 0, take = 20 } = {}) {
    const [matches, total] = await Promise.all([
      prisma.threeWayMatch.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          invoice:        { select: { id: true, invoice_number: true, amount: true, status: true } },
          purchase_order: { select: { id: true, po_number: true } },
          grn:            { select: { id: true, grn_number: true } },
          completed_by:   { select: { id: true, first_name: true, last_name: true } },
        },
      }),
      prisma.threeWayMatch.count({ where }),
    ]);
    return { matches, total };
  }

  /**
   * Transaction wrapper.
   */
  async transaction(fn) {
    return prisma.$transaction(fn);
  }
}

export default new MatchingRepository();
