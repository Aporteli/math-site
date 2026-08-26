/**
 * One-shot: ensure default curriculum branches + Algebra topics.
 * Usage: npx tsx -r dotenv/config scripts/seed-taxonomy-branches.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const BRANCH_SEED = [
  {
    slug: "arithmetic",
    ka: "არითმეტიკა",
    en: "Arithmetic",
    ru: "Арифметика",
  },
  {
    slug: "algebra",
    ka: "ალგებრა",
    en: "Algebra",
    ru: "Алгебра",
  },
  {
    slug: "geometry",
    ka: "გეომეტრია",
    en: "Geometry",
    ru: "Геометрия",
  },
  {
    slug: "calculus",
    ka: "კალკულუსი (მათემატიკური ანალიზი)",
    en: "Calculus (Mathematical Analysis)",
    ru: "Калькулюс (математический анализ)",
  },
  {
    slug: "probability-statistics",
    ka: "ალბათობა და სტატისტიკა",
    en: "Probability and Statistics",
    ru: "Вероятность и статистика",
  },
  {
    slug: "discrete-mathematics",
    ka: "დისკრეტული მათემატიკა",
    en: "Discrete Mathematics",
    ru: "Дискретная математика",
  },
  {
    slug: "number-theory",
    ka: "რიცხვთა თეორია",
    en: "Number Theory",
    ru: "Теория чисел",
  },
  {
    slug: "topology",
    ka: "ტოპოლოგია",
    en: "Topology",
    ru: "Топология",
  },
] as const;

const ALGEBRA_TOPICS = [
  {
    slug: "elementary-classical-algebra",
    ka: "დაწყებითი და კლასიკური ალგებრა",
    en: "Elementary & Classical Algebra",
    ru: "Элементарная и классическая алгебра",
  },
  {
    slug: "equations-inequalities",
    ka: "განტოლებები და უტოლობები",
    en: "Equations & Inequalities",
    ru: "Уравнения и неравенства",
  },
  {
    slug: "linear-multilinear-algebra",
    ka: "წრფივი და მრავალწრფივი ალგებრა",
    en: "Linear & Multilinear Algebra",
    ru: "Линейная и мультилинейная алгебра",
  },
  {
    slug: "abstract-modern-algebra",
    ka: "აბსტრაქტული (თანამედროვე) ალგებრა",
    en: "Abstract (Modern) Algebra",
    ru: "Абстрактная (современная) алгебра",
  },
  {
    slug: "commutative-computational-algebra",
    ka: "კომუტაციური და გამოთვლითი ალგებრა",
    en: "Commutative & Computational Algebra",
    ru: "Коммутативная и вычислительная алгебра",
  },
  {
    slug: "non-commutative-algebra",
    ka: "არაკომუტაციური ალგებრა",
    en: "Non-Commutative Algebra",
    ru: "Некоммутативная алгебра",
  },
  {
    slug: "representation-lie-theory",
    ka: "წარმოდგენების თეორია და ლის თეორია",
    en: "Representation Theory & Lie Theory",
    ru: "Теория представлений и теория Ли",
  },
  {
    slug: "algebraic-geometry",
    ka: "ალგებრული გეომეტრია",
    en: "Algebraic Geometry",
    ru: "Алгебраическая геометрия",
  },
  {
    slug: "algebraic-number-theory",
    ka: "ალგებრული რიცხვთა თეორია",
    en: "Algebraic Number Theory",
    ru: "Алгебраическая теория чисел",
  },
  {
    slug: "homological-category-theory",
    ka: "ჰომოლოგიური ალგებრა და კატეგორიების თეორია",
    en: "Homological Algebra & Category Theory",
    ru: "Гомологическая алгебра и теория категорий",
  },
  {
    slug: "discrete-boolean-applied-algebra",
    ka: "დისკრეტული, ბულის და გამოყენებითი ალგებრა",
    en: "Discrete, Boolean & Applied Algebra",
    ru: "Дискретная, булева и прикладная алгебра",
  },
] as const;

const LEGACY_TOPIC_BRANCH: Record<string, (typeof BRANCH_SEED)[number]["slug"]> =
  {
    algebra: "algebra",
    equations: "algebra",
    functions: "algebra",
    geometry: "geometry",
    vectors: "geometry",
    percent: "arithmetic",
    calculus: "calculus",
    combinatorics: "discrete-mathematics",
  };

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.taxonomyNode.findMany({
      where: { level: "branch" },
    });
    const bySlug = new Map(existing.map((row) => [row.slug, row.id]));

    for (const [index, branch] of BRANCH_SEED.entries()) {
      const id = bySlug.get(branch.slug);
      if (id) {
        await prisma.taxonomyNode.update({
          where: { id },
          data: {
            nameKa: branch.ka,
            nameEn: branch.en,
            nameRu: branch.ru,
            sortOrder: index,
          },
        });
        continue;
      }
      const created = await prisma.taxonomyNode.create({
        data: {
          level: "branch",
          slug: branch.slug,
          nameKa: branch.ka,
          nameEn: branch.en,
          nameRu: branch.ru,
          sortOrder: index,
        },
      });
      bySlug.set(branch.slug, created.id);
    }

    const math = await prisma.taxonomyNode.findFirst({
      where: { level: "branch", slug: "mathematics" },
    });
    if (math) {
      const topics = await prisma.taxonomyNode.findMany({
        where: { parentId: math.id, level: "topic" },
      });
      for (const topic of topics) {
        const targetSlug = LEGACY_TOPIC_BRANCH[topic.slug];
        const parentId = targetSlug ? bySlug.get(targetSlug) : undefined;
        if (!parentId) continue;
        await prisma.taxonomyNode.update({
          where: { id: topic.id },
          data: { parentId },
        });
      }
      const remaining = await prisma.taxonomyNode.count({
        where: { parentId: math.id },
      });
      if (remaining === 0) {
        await prisma.taxonomyNode.delete({ where: { id: math.id } });
      }
    }

    const algebraId = bySlug.get("algebra");
    if (!algebraId) throw new Error("Algebra branch missing");

    const existingTopics = await prisma.taxonomyNode.findMany({
      where: { parentId: algebraId, level: "topic" },
    });
    const topicBySlug = new Map(existingTopics.map((row) => [row.slug, row.id]));

    for (const [index, topic] of ALGEBRA_TOPICS.entries()) {
      const id = topicBySlug.get(topic.slug);
      if (id) {
        await prisma.taxonomyNode.update({
          where: { id },
          data: {
            nameKa: topic.ka,
            nameEn: topic.en,
            nameRu: topic.ru,
            sortOrder: index,
          },
        });
        continue;
      }
      await prisma.taxonomyNode.create({
        data: {
          level: "topic",
          slug: topic.slug,
          nameKa: topic.ka,
          nameEn: topic.en,
          nameRu: topic.ru,
          parentId: algebraId,
          sortOrder: index,
        },
      });
    }

    const algebraTopics = await prisma.taxonomyNode.findMany({
      where: { parentId: algebraId, level: "topic" },
      orderBy: { sortOrder: "asc" },
    });
    console.log("Algebra topics:");
    for (const topic of algebraTopics) {
      console.log(`  ${topic.sortOrder} ${topic.slug} | ${topic.nameEn}`);
    }
    console.log("count:", algebraTopics.length);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});