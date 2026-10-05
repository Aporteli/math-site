import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const PRISMA_GENERATION = 'livekit-diagnostics-v1';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaGeneration: string | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  //როცა Neon ზე გადახვალ, ჩართე ეს კოდი, რომ Neon ზე მუშაობდეს
  // const pool = new Pool({ connectionString: url });

//როცა Neon ზე გადახვალ, გათიშე ეს კოდი, აქედან...
  const ca = process.env.DATABASE_CA;
  if (!ca) {
    throw new Error('DATABASE_CA is not set');
  }
  const pool = new Pool({
  connectionString: url,
  ssl: {
    ca,
    rejectUnauthorized: true,
  },
});დ
//აქამდე

  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

function hasCurrentDelegates(client: PrismaClient | undefined) {
  if (!client) return false;
  const family = (client as { problemFamily?: { findMany?: unknown } }).problemFamily;
  if (typeof family?.findMany !== 'function') return false;
  const homeGroup = (client as { homeGroup?: { findMany?: unknown } }).homeGroup;
  if (typeof homeGroup?.findMany !== 'function') return false;
  const diagnostics = (client as { liveKitDiagnosticSession?: { findMany?: unknown } }).liveKitDiagnosticSession;
  if (typeof diagnostics?.findMany !== 'function') return false;
  const dmmf = (
    client as {
      _runtimeDataModel?: { models?: { Problem?: { fields?: { name: string }[] } } };
    }
  )._runtimeDataModel?.models?.Problem?.fields;
  if (!Array.isArray(dmmf)) return true;
  const names = new Set(dmmf.map((field) => field.name));
  return names.has('collection') && names.has('originId');
}

if (
  process.env.NODE_ENV !== 'production' &&
  globalForPrisma.prisma &&
  (globalForPrisma.prismaGeneration !== PRISMA_GENERATION || !hasCurrentDelegates(globalForPrisma.prisma))
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaGeneration = PRISMA_GENERATION;
}
