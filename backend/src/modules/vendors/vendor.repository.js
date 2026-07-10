import prisma from '../../config/prisma.js';

const vendorInclude = {
  created_by: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
  approved_by: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
};

class VendorRepository {
  async create(data) {
    return prisma.vendor.create({ data, include: vendorInclude });
  }

  async findAll({ where, skip, take }) {
    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: vendorInclude,
      }),
      prisma.vendor.count({ where }),
    ]);

    return { vendors, total };
  }

  async findById(id) {
    return prisma.vendor.findFirst({
      where: { id, deleted_at: null },
      include: vendorInclude,
    });
  }

  async update(id, data) {
    return prisma.vendor.update({
      where: { id },
      data,
      include: vendorInclude,
    });
  }

  async softDelete(id) {
    return prisma.vendor.update({
      where: { id },
      data: { deleted_at: new Date(), is_active: false },
      include: vendorInclude,
    });
  }
}

export default new VendorRepository();
