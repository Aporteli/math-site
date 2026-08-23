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

/**
 * Seed accounts used until Prisma `User` is wired. Swap `findUserByEmail`
 * for `prisma.user.findUnique({ where: { email } })` without changing callers.
 */
const DEMO_USERS: AuthUser[] = [
  {
    id: 'teacher-1',
    name: 'შოთა მიკოლაიჩუკი',
    email: 'teacher@mathlab.ge',
    role: 'TEACHER',
    password: 'mathlab-demo',
  },
  {
    id: 'student-1',
    name: 'ნინო ბერიძე',
    email: 'student@mathlab.ge',
    role: 'STUDENT',
    password: 'mathlab-demo',
  },
  {
    id: 'admin-1',
    name: 'MathLab Admin',
    email: 'admin@mathlab.ge',
    role: 'ADMIN',
    password: 'mathlab-demo',
  },
];

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();

  // Try Prisma first
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

  // Fallback to demo users
  return DEMO_USERS.find((user) => user.email === normalized) ?? null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const [salt, key] = hashedPassword.split(':');
  if (!salt || !key) return false;
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(key, 'hex');
  return timingSafeEqual(derivedKey, keyBuffer);
}

export async function passwordsMatch(input: string, hashed: string): Promise<boolean> {
  if (!input || !hashed) return false;

  // სატესტო დემო მომხმარებლების შემოწმება
  if (hashed === 'mathlab-demo') {
    return input === hashed;
  }

  // ბაზიდან წამოღებული scrypt ჰეშის შემოწმება
  try {
    return await verifyPassword(input, hashed);
  } catch {
    return false;
  }
}

export function toPublicUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

/**
 * Create a new user using Prisma.
 */
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
    DEMO_USERS.push(newUser);
    return newUser;
  }
}