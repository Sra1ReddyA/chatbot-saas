import * as jose from 'jose';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import type { AuthPayload } from '../types';

const jwtSecret = new TextEncoder().encode(config.JWT_SECRET);
const refreshSecret = new TextEncoder().encode(config.JWT_REFRESH_SECRET);

export async function generateTokens(payload: AuthPayload): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const now = Math.floor(Date.now() / 1000);

  const accessToken = await new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(config.JWT_EXPIRES_IN)
    .setSubject(payload.userId)
    .sign(jwtSecret);

  const refreshToken = await new jose.SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(config.JWT_REFRESH_EXPIRES_IN)
    .setSubject(payload.userId)
    .sign(refreshSecret);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

export async function verifyAccessToken(token: string): Promise<AuthPayload> {
  const { payload } = await jose.jwtVerify(token, jwtSecret, {
    algorithms: ['HS256'],
  });

  return {
    userId: payload.userId as string,
    organizationId: payload.organizationId as string,
    email: payload.email as string,
    role: payload.role as string,
  };
}

export async function verifyRefreshToken(token: string): Promise<string> {
  const { payload } = await jose.jwtVerify(token, refreshSecret, {
    algorithms: ['HS256'],
  });
  return payload.sub as string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.BCRYPT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateApiKey(): { key: string; prefix: string; hash: Promise<string> } {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk_live_';
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const prefix = key.substring(0, 12);
  const hash = bcrypt.hash(key, 10);
  return { key, prefix, hash };
}

export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

export function generateSecureToken(length = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}
