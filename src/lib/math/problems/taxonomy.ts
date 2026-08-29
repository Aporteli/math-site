import "server-only";

import { prisma } from "@/lib/prisma";
import {
  LEVEL_PARENT,
  type TaxonomyNodeDto,
  type TaxonomyUpsertInput,
} from "./taxonomy-shared";

export {
  TAXONOMY_LEVELS,
  LEVEL_PARENT,
  childrenOf,
  taxonomyLabel,
  taxonomyUpsertSchema,
  type TaxonomyLevel,
  type TaxonomyNodeDto,
  type TaxonomyUpsertInput,
} from "./taxonomy-shared";

/** Default subject branches (Curriculum → Branch filter). */
export const BRANCH_SEED = [
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

type BranchSlug = (typeof BRANCH_SEED)[number]["slug"];

type TopicSeed = {
  slug: string;
  ka: string;
  en: string;
  ru: string;
};

/** Default topics keyed by branch slug. */
export const TOPIC_SEED_BY_BRANCH: Partial<Record<BranchSlug, readonly TopicSeed[]>> =
  {
    algebra: [
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
    ],
  };

/** Map legacy topic slugs (under Mathematics) onto the new branches. */
const LEGACY_TOPIC_BRANCH: Record<string, BranchSlug> = {
  algebra: "algebra",
  equations: "algebra",
  functions: "algebra",
  geometry: "geometry",
  vectors: "geometry",
  percent: "arithmetic",
  calculus: "calculus",
  combinatorics: "discrete-mathematics",
};

function mapNode(row: {
  id: string;
  level: string;
  slug: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  parentId: string | null;
  sortOrder: number;
}): TaxonomyNodeDto {
  return {
    id: row.id,
    level: row.level as TaxonomyNodeDto["level"],
    slug: row.slug,
    nameKa: row.nameKa,
    nameEn: row.nameEn,
    nameRu: row.nameRu,
    parentId: row.parentId,
    sortOrder: row.sortOrder,
  };
}

export async function listTaxonomyNodes(): Promise<TaxonomyNodeDto[]> {
  const rows = await prisma.taxonomyNode.findMany({
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { nameEn: "asc" }],
  });
  return rows.map(mapNode);
}

async function ensureSeedBranches(): Promise<Map<string, string>> {
  const existing = await prisma.taxonomyNode.findMany({
    where: { level: "branch" },
  });
  const bySlug = new Map(existing.map((row) => [row.slug, row.id]));

  for (const [index, branch] of BRANCH_SEED.entries()) {
    const currentId = bySlug.get(branch.slug);
    if (currentId) {
      await prisma.taxonomyNode.update({
        where: { id: currentId },
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

  return bySlug;
}

/** Move legacy Mathematics topics onto the new subject branches, then drop empty Math. */
async function migrateLegacyMathematics(
  branchIdsBySlug: Map<string, string>,
): Promise<void> {
  const math = await prisma.taxonomyNode.findFirst({
    where: { level: "branch", slug: "mathematics" },
  });
  if (!math) return;

  const topics = await prisma.taxonomyNode.findMany({
    where: { parentId: math.id, level: "topic" },
  });

  for (const topic of topics) {
    const targetSlug = LEGACY_TOPIC_BRANCH[topic.slug];
    const parentId = targetSlug ? branchIdsBySlug.get(targetSlug) : undefined;
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

async function ensureSeedTopics(
  branchIdsBySlug: Map<string, string>,
): Promise<void> {
  for (const [branchSlug, topics] of Object.entries(TOPIC_SEED_BY_BRANCH) as [
    BranchSlug,
    readonly TopicSeed[],
  ][]) {
    const parentId = branchIdsBySlug.get(branchSlug);
    if (!parentId || !topics?.length) continue;

    const existing = await prisma.taxonomyNode.findMany({
      where: { parentId, level: "topic" },
    });
    const bySlug = new Map(existing.map((row) => [row.slug, row.id]));

    for (const [index, topic] of topics.entries()) {
      const currentId = bySlug.get(topic.slug);
      if (currentId) {
        await prisma.taxonomyNode.update({
          where: { id: currentId },
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
          parentId,
          sortOrder: index,
        },
      });
    }
  }
}

let seedDataPromise: Promise<void> | null = null;

/** Runs the idempotent seed + legacy-migration writes once per server process. */
async function ensureSeedData(): Promise<void> {
  if (!seedDataPromise) {
    seedDataPromise = (async () => {
      const branchIds = await ensureSeedBranches();
      await migrateLegacyMathematics(branchIds);
      await ensureSeedTopics(branchIds);
    })().catch((error) => {
      seedDataPromise = null;
      throw error;
    });
  }
  return seedDataPromise;
}

/** Ensure default subject branches and seeded topics exist (idempotent). */
export async function ensureDefaultTaxonomy(): Promise<TaxonomyNodeDto[]> {
  await ensureSeedData();
  return listTaxonomyNodes();
}

export async function upsertTaxonomyNode(
  input: TaxonomyUpsertInput,
): Promise<TaxonomyNodeDto> {
  const expectedParent = LEVEL_PARENT[input.level];
  const parentId = input.parentId ?? null;

  if (expectedParent === null) {
    if (parentId) throw new Error("branch_no_parent");
  } else {
    if (!parentId) throw new Error("parent_required");
    const parent = await prisma.taxonomyNode.findUnique({
      where: { id: parentId },
    });
    if (!parent || parent.level !== expectedParent) {
      throw new Error("bad_parent");
    }
  }

  const slug = input.slug.toLowerCase();
  const data = {
    level: input.level,
    slug,
    nameKa: input.nameKa,
    nameEn: input.nameEn,
    nameRu: input.nameRu,
    parentId,
    sortOrder: input.sortOrder ?? 0,
  };

  if (input.id) {
    const updated = await prisma.taxonomyNode.update({
      where: { id: input.id },
      data,
    });
    return mapNode(updated);
  }

  const created = await prisma.taxonomyNode.create({ data });
  return mapNode(created);
}

export async function deleteTaxonomyNode(id: string): Promise<void> {
  await prisma.taxonomyNode.delete({ where: { id } });
}
