import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const PRISMA_GENERATION = 'livekit-diagnostics-v1';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
  prismaGeneration: string | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  const ca = process.env.DATABASE_CA;

  if (!ca) {
    throw new Error('DATABASE_CA is not set');
  }

  const pool = new Pool({
    connectionString: url,
    max: 2,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
    ssl: {
      ca,
      rejectUnauthorized: true,
    },
  });

  try {
    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({ adapter });
    globalForPrisma.prismaPool = pool;
    return client;
  } catch (error) {
    void pool.end().catch(() => undefined);
    throw error;
  }
}

function hasCurrentDelegates(client: PrismaClient | undefined) {
  if (!client) return false;

  const family = (client as { problemFamily?: { findMany?: unknown } }).problemFamily;
  if (typeof family?.findMany !== 'function') return false;

  const homeGroup = (client as { homeGroup?: { findMany?: unknown } }).homeGroup;
  if (typeof homeGroup?.findMany !== 'function') return false;

  const diagnostics = (
    client as {
      liveKitDiagnosticSession?: { findMany?: unknown };
    }
  ).liveKitDiagnosticSession;

  if (typeof diagnostics?.findMany !== 'function') return false;

  const dmmf = (
    client as {
      _runtimeDataModel?: {
        models?: {
          Problem?: {
            fields?: { name: string }[];
          };
        };
      };
    }
  )._runtimeDataModel?.models?.Problem?.fields;

  if (!Array.isArray(dmmf)) return true;

  const names = new Set(dmmf.map((field) => field.name));

  return names.has('collection') && names.has('originId');
}

function discardStaleDevelopmentClient() {
  if (process.env.NODE_ENV === 'production') return;

  const existing = globalForPrisma.prisma;
  if (!existing) return;
  if (
    globalForPrisma.prismaGeneration === PRISMA_GENERATION &&
    hasCurrentDelegates(existing)
  ) {
    return;
  }

  void existing.$disconnect().catch(() => undefined);
  void globalForPrisma.prismaPool?.end().catch(() => undefined);
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaPool = undefined;
  globalForPrisma.prismaGeneration = undefined;
}

discardStaleDevelopmentClient();

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
globalForPrisma.prismaGeneration = PRISMA_GENERATION;
