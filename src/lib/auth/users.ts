import { timingSafeEqual, scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import type { UserRole } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';

const scryptAsync = promisify(scrypt);

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalized },
    });
    if (user) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        password: user.passwordHash,
      };
    }
  } catch (error) {
    console.warn('Prisma user lookup failed, falling back to demo users:', error);
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(input: string, hashed: string): Promise<boolean> {
  if (!input || !hashed) return false;
  const [salt, key] = hashed.split(':');
  if (!salt || !key) return false;
  const derivedKey = (await scryptAsync(input, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(key, 'hex');
  return timingSafeEqual(derivedKey, keyBuffer);
}

export function toPublicUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<AuthUser> {
  const passwordHash = await hashPassword(data.password);
  const normalizedEmail = data.email.trim().toLowerCase();

  try {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: normalizedEmail,
        passwordHash,
        role: data.role,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      password: user.passwordHash,
    };
  } catch (error) {
    console.warn('Prisma user creation failed, falling back to demo users:', error);
    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      name: data.name,
      email: normalizedEmail,
      role: data.role,
      password: passwordHash,
    };
    return newUser;
  }
}
