import 'server-only';

import { prisma } from '@/lib/prisma';
import { LEVEL_PARENT, type TaxonomyNodeDto, type TaxonomyUpsertInput } from './taxonomy-shared';

export {
  TAXONOMY_LEVELS,
  LEVEL_PARENT,
  childrenOf,
  taxonomyLabel,
  taxonomyUpsertSchema,
  type TaxonomyLevel,
  type TaxonomyNodeDto,
  type TaxonomyUpsertInput,
} from './taxonomy-shared';

export const BRANCH_SEED = [] as const;

export type BranchSlug = string;

type TopicSeed = {
  slug: string;
  ka: string;
  en: string;
  ru: string;
};

export const TOPIC_SEED_BY_BRANCH: Partial<Record<string, readonly TopicSeed[]>> = {};

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
    level: row.level as TaxonomyNodeDto['level'],
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
    orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { nameEn: 'asc' }],
  });
  return rows.map(mapNode);
}

/** Ensure default subject branches and seeded topics exist (idempotent). */
export async function ensureDefaultTaxonomy(): Promise<TaxonomyNodeDto[]> {
  return listTaxonomyNodes();
}

export async function upsertTaxonomyNode(input: TaxonomyUpsertInput): Promise<TaxonomyNodeDto> {
  const expectedParent = LEVEL_PARENT[input.level];
  const parentId = input.parentId ?? null;

  if (expectedParent === null) {
    if (parentId) throw new Error('branch_no_parent');
  } else {
    if (!parentId) throw new Error('parent_required');
    const parent = await prisma.taxonomyNode.findUnique({
      where: { id: parentId },
    });
    if (!parent || parent.level !== expectedParent) {
      throw new Error('bad_parent');
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