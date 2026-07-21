import 'dotenv/config';
import prismaModule from './src/config/prisma.js';


const prisma = prismaModule?.default ?? prismaModule;
const emails = [
  'admin@vms.com',
  'finance@vms.com',
  'l1@vms.com',
  'l2@vms.com',
  'l3@vms.com',
  'casemanager@vms.com',
];

const rows = await prisma.user.findMany({
  where: { email: { in: emails } },
  select: { email: true, role: true, status: true },
});

console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();

