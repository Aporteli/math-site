import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const branches = await prisma.taxonomyNode.findMany({
      where: { level: "branch" },
      orderBy: { sortOrder: "asc" },
    });

    console.log(`Found ${branches.length} branches:`);
    for (const branch of branches) {
      console.log(`- [${branch.slug}] ${branch.nameKa} / ${branch.nameEn}`);
    }

    const algebraBranch = branches.find((b) => b.slug === "algebra");
    if (algebraBranch) {
      const algebraTopics = await prisma.taxonomyNode.findMany({
        where: { parentId: algebraBranch.id, level: "topic" },
        orderBy: { sortOrder: "asc" },
      });

      console.log(`\nAlgebra topics (${algebraTopics.length}):`);
      for (const topic of algebraTopics) {
        console.log(`  ${topic.sortOrder}: [${topic.slug}] ${topic.nameKa} / ${topic.nameEn}`);
      }
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});