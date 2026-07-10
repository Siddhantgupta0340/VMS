import 'dotenv/config';
import bcrypt from 'bcryptjs';
import userRepository from '../modules/users/user.repository.js';

import { ROLES, UserEntity } from '../zodSchema/index.js';

/**
 * Seed development users for all roles.
 *
 * Requirements:
 * - Uses backend role constants (ROLES.*)
 * - Does NOT hardcode DB ids.
 * - Uses bcrypt hashing.
 * - Seed accounts if they do not already exist:
 *    admin@vms.com
 *    finance@vms.com
 *    l1@vms.com
 *    l2@vms.com
 *    l3@vms.com
 *    casemanager@vms.com
 * - Password for all: Admin@123
 */

const DEV_USERS = [
  {
    email: 'admin@vms.com',
    password: 'Admin@123',
    role: ROLES.SUPER_ADMIN,
    first_name: 'System',
    last_name: 'Admin',
  },
  {
    email: 'finance@vms.com',
    password: 'Admin@123',
    role: ROLES.FINANCE_HEAD,
    first_name: 'Finance',
    last_name: 'Head',
  },
  {
    email: 'l1@vms.com',
    password: 'Admin@123',
    role: ROLES.TEAM_LEAD,
    first_name: 'L1',
    last_name: 'Team Lead',
  },
  {
    email: 'l2@vms.com',
    password: 'Admin@123',
    role: ROLES.MANAGER,
    first_name: 'L2',
    last_name: 'Account Manager',
  },
  {
    // Backend workflow uses FINANCE_HEAD as the final approval.
    // Your requested "L3 Senior Approver" maps to FINANCE_HEAD.
    email: 'l3@vms.com',
    password: 'Admin@123',
    role: ROLES.FINANCE_HEAD,
    first_name: 'L3',
    last_name: 'Senior Approver',
  },
  {
    email: 'casemanager@vms.com',
    password: 'Admin@123',
    role: ROLES.CASE_MANAGER,
    first_name: 'Case',
    last_name: 'Manager',
  },
];

const seedDevUsers = async () => {
  const isDev = (process.env.NODE_ENV || 'development') !== 'production';
  if (!isDev) return;

  for (const u of DEV_USERS) {
    try {
      console.log('[seedDevUsers] checking existing user for', u.email);
      const existing = await userRepository.findByEmail(u.email);

      if (existing) {
        // Keep existing user data stable.
        continue;
      }

      const hashedPassword = await bcrypt.hash(u.password, 10);

      await userRepository.createUser({
        [UserEntity.columns.EMAIL]: u.email,
        [UserEntity.columns.PASSWORD]: hashedPassword,
        [UserEntity.columns.ROLE]: u.role,
        [UserEntity.columns.FIRST_NAME]: u.first_name,
        [UserEntity.columns.LAST_NAME]: u.last_name,
        [UserEntity.columns.STATUS]: 'ACTIVE',
      });

      console.log(`[seedDevUsers] Created dev user ${u.email} (${u.role})`);
    } catch (e) {
      console.error('[seedDevUsers] Failed for', u.email);
      console.error(e);
      throw e;
    }
  }
};

export default seedDevUsers;

