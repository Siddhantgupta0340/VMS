import prisma from '../../config/prisma.js';

const poInclude = {
  vendor: true,
  created_by: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
};

class PurchaseOrderRepository {
  async create(data) {
    return prisma.purchaseOrder.create({ data, include: poInclude });
  }

  async findAll({ where, skip, take }) {
    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: poInclude,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return { purchaseOrders, total };
  }

  async findById(id) {
    return prisma.purchaseOrder.findUnique({
      where: { id },
      include: poInclude,
    });
  }

  async update(id, data) {
    return prisma.purchaseOrder.update({
      where: { id },
      data,
      include: poInclude,
    });
  }
<<<<<<< HEAD
=======

  async transaction(callback) {
    return prisma.$transaction(callback);
  }
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
}

export default new PurchaseOrderRepository();
