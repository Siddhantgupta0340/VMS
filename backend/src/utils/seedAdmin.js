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
        [UserEntity.columns.IS_ACTIVE]: true,
      });

      console.log('Seeding process: Super Admin created successfully.');
    } else {
      console.log('Seeding process: Super Admin already exists.');
    }
  } catch (error) {
    console.error('Seeding process failed:', error.message);
    // We do not throw here to prevent the server from failing to start 
    // solely due to seeding issues in production.
  }
};

export default seedAdmin;