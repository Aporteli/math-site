import { PrismaClient } from "@prisma/client";

const PRISMA_GENERATION = "taxonomy-nodes-v1";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaGeneration: string | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function hasCurrentDelegates(client: PrismaClient | undefined) {
  if (!client) return false;
  const family = (client as { problemFamily?: { findMany?: unknown } }).problemFamily;
  if (typeof family?.findMany !== "function") return false;
  const dmmf = (
    client as {
      _runtimeDataModel?: { models?: { Problem?: { fields?: { name: string }[] } } };
    }
  )._runtimeDataModel?.models?.Problem?.fields;
  if (!Array.isArray(dmmf)) return true;
  const names = new Set(dmmf.map((field) => field.name));
  return names.has("collection") && names.has("originId");
}

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  (globalForPrisma.prismaGeneration !== PRISMA_GENERATION ||
    !hasCurrentDelegates(globalForPrisma.prisma))
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaGeneration = PRISMA_GENERATION;
}