import test from 'node:test';
import assert from 'node:assert/strict';
import { UserEntity } from '../src/zodSchema/index.js';

test('UserEntity exposes Prisma-compatible password reset columns', () => {
  assert.equal(UserEntity.columns.PASSWORD_RESET_OTP, 'password_reset_otp');
  assert.equal(UserEntity.columns.PASSWORD_RESET_OTP_EXPIRES, 'password_reset_otp_expires');
  assert.ok(Object.values(UserEntity.columns).includes('password_reset_otp'));
  assert.ok(Object.values(UserEntity.columns).includes('password_reset_otp_expires'));
});
