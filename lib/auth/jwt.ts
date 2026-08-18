// lib/auth/jwt.ts
// Uses 'jose' for Edge-runtime & Node.js runtime compatibility (Vercel middleware ready)
import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from '@/lib/types';

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'default-secret-key-change-in-production-32-chars';
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const secretKey = getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
