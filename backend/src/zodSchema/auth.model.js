export const USER_TABLE = 'users';

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CASE_MANAGER: 'CASE_MANAGER',
  FINANCE_MANAGER: 'FINANCE_MANAGER',
  L1: 'L1',
  L2: 'L2',
  L3: 'L3',
};

export const AUTH_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
};

export const USER_COLUMNS = {
  ID: 'id',
  EMAIL: 'email',
  PASSWORD: 'password',
  ROLE: 'role',
  FIRST_NAME: 'first_name',
  LAST_NAME: 'last_name',
  IS_ACTIVE: 'is_active',
  DELETED_AT: 'deleted_at',
  LAST_LOGIN_AT: 'last_login_at',
  REFRESH_TOKEN: 'refresh_token',
  PASSWORD_RESET_TOKEN: 'password_reset_token',
  PASSWORD_RESET_EXPIRES: 'password_reset_expires',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
};

export const USER_DEFAULTS = {
  ROLE: ROLES.L1,
  IS_ACTIVE: true,
};

export const UserEntity = {
  table: USER_TABLE,
  columns: USER_COLUMNS,
};