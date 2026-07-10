import prisma from '../../config/prisma.js';

const paymentInclude = {
  invoice: true,
  vendor: true,
  purchase_order: true,
  created_by: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
  approved_by: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
  processed_by: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
  updated_by: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
};

class PaymentRepository {
  async create(data) {
    return prisma.payment.create({ data, include: paymentInclude });
  }

  async findAll({ where, skip = 0, take = 10 }) {
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(take),
        orderBy: { created_at: 'desc' },
        include: paymentInclude,
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total };
  }

  async findById(id) {
    return prisma.payment.findUnique({
      where: { id },
      include: paymentInclude,
    });
  }

  async update(id, data) {
    return prisma.payment.update({
      where: { id },
      data,
      include: paymentInclude,
    });
  }

  async delete(id) {
    return prisma.payment.delete({
      where: { id },
      include: paymentInclude,
    });
  }

  async transaction(callback) {
    return prisma.$transaction(callback);
  }
}

export default new PaymentRepository();
