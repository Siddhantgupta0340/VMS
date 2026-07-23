<<<<<<< HEAD
import bcrypt from 'bcryptjs';
import userRepository from '../modules/users/user.repository.js'; // Corrected import path
import { ROLES, UserEntity } from '../zodSchema/index.js';

/**
 * Seeding script to ensure a Super Admin exists in the system on startup.
 * This uses the predefined credentials: admin@vms.com / Admin@123
 */
const seedAdmin = async () => {
  try {
    // Use environment variables for credentials with sensible defaults for development.
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@vms.com'; 
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123';

    // Check if the super admin already exists
    const adminExists = await userRepository.findByEmail(adminEmail);

    if (!adminExists) {
      console.log(`Seeding process: Super Admin with email '${adminEmail}' not found. Creating...`);

      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await userRepository.createUser({
        [UserEntity.columns.EMAIL]: adminEmail,
        [UserEntity.columns.PASSWORD]: hashedPassword,
        [UserEntity.columns.ROLE]: ROLES.SUPER_ADMIN,
        [UserEntity.columns.FIRST_NAME]: 'System',
        [UserEntity.columns.LAST_NAME]: 'Admin',
        [UserEntity.columns.STATUS]: 'ACTIVE',
      });

      console.log('Seeding process: Super Admin created successfully.');
    } else {
      console.log('Seeding process: Super Admin already exists.');
    }
  } catch (error) {
    console.error('Seeding process failed:', error.message);
    // We do not throw here to prevent the server from failing to start 
    // solely due to seeding issues in production.
=======
import bcrypt from "bcryptjs";
import userRepository from "../modules/users/user.repository.js";
import { ROLES, UserEntity } from "../zodSchema/index.js";

const DEFAULT_PASSWORD =
  process.env.DEFAULT_DEV_PASSWORD || "Admin@123";

const USERS = [
  {
    email: process.env.SUPER_ADMIN_EMAIL || "admin@vms.com",
    firstName: "System",
    lastName: "Admin",
    role: ROLES.SUPER_ADMIN,
  },
  {
    email: "casemanager@vms.com",
    firstName: "Case",
    lastName: "Manager",
    role: ROLES.CASE_MANAGER,
  },
  {
    email: "teamlead@vms.com",
    firstName: "Team",
    lastName: "Lead",
    role: ROLES.TEAM_LEAD,
  },
  {
    email: "manager@vms.com",
    firstName: "Account",
    lastName: "Manager",
    role: ROLES.MANAGER,
  },
  {
    email: "finance@vms.com",
    firstName: "Finance",
    lastName: "Head",
    role: ROLES.FINANCE_HEAD,
  },
];

const seedAdmin = async () => {
  try {
    for (const user of USERS) {
      const exists = await userRepository.findByEmail(user.email);

      if (exists) {
        console.log(`✔ ${user.role} already exists.`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

      await userRepository.createUser({
        [UserEntity.columns.EMAIL]: user.email,
        [UserEntity.columns.PASSWORD]: hashedPassword,
        [UserEntity.columns.ROLE]: user.role,
        [UserEntity.columns.FIRST_NAME]: user.firstName,
        [UserEntity.columns.LAST_NAME]: user.lastName,
        [UserEntity.columns.STATUS]: "ACTIVE",
      });

      console.log(`✔ ${user.role} created.`);
    }

    console.log("Development users seeded successfully.");
  } catch (error) {
    console.error("Seeding failed:", error);
>>>>>>> origin/main
  }
};

export default seedAdmin;