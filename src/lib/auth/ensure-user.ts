import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import type { UserRole } from "@/lib/auth/roles";

const UNUSABLE_PASSWORD_HASH = "unusable";

export async function ensureDbUser(input: {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
}) {
  const email = input.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("missing_email");
  }

  const name = input.name?.trim() || email;
  const role = input.role as Role;

  return prisma.user.upsert({
    where: { email },
    create: {
      id: input.id,
      name,
      email,
      passwordHash: UNUSABLE_PASSWORD_HASH,
      role,
    },
    update: { name, role },
  });
}
