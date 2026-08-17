import { timingSafeEqual } from "node:crypto";
import type { UserRole } from "@/lib/auth/roles";

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
    id: "teacher-1",
    name: "შოთა მიკოლაიჩუკი",
    email: "teacher@mathlab.ge",
    role: "TEACHER",
    password: "mathlab-demo",
  },
  {
    id: "student-1",
    name: "ნინო ბერიძე",
    email: "student@mathlab.ge",
    role: "STUDENT",
    password: "mathlab-demo",
  },
  {
    id: "admin-1",
    name: "MathLab Admin",
    email: "admin@mathlab.ge",
    role: "ADMIN",
    password: "mathlab-demo",
  },
];

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return DEMO_USERS.find((user) => user.email === normalized) ?? null;
}

export function passwordsMatch(input: string, expected: string) {
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function toPublicUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
