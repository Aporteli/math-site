import type { ProblemDifficulty, ProblemYear } from "../types";
import { parseProblemTemplate, parseTeacherJson } from "./adapt";
import { FAMILY_VARIANT_MAX } from "./schema";
import type { ProblemTemplate, TemplateVariant } from "./schema";

function uniquifyVariantIds(variants: TemplateVariant[]): TemplateVariant[] {
  const used = new Set<string>();
  return variants.map((variant, index) => {
    let id = (variant.id?.trim() || `task-${index + 1}`).slice(0, 48);
    if (used.has(id)) {
      const stem = (id.replace(/-\d+$/, "") || "task").slice(0, 40);
      let n = 2;
      do {
        id = `${stem}-${n}`.slice(0, 48);
        n += 1;
      } while (used.has(id));
    }
    used.add(id);
    return { ...variant, id };
  });
}

function uniqueList<T extends string>(values: T[]): T[] {
  return [...new Set(values)];
}

function parseFamilyText(raw: string) {
  try {
    return parseProblemTemplate(parseTeacherJson(raw));
  } catch {
    return { success: false as const };
  }
}

export type RemoveVariantResult =
  | { ok: true; json: string }
  | { ok: false; reason: "schema" | "missing" };

function relabelFamily(template: ProblemTemplate): ProblemTemplate {
  const years = uniqueList(template.variants.flatMap((item) => item.years ?? []));
  const difficulties = uniqueList(
    template.variants.flatMap((item) => item.difficulties ?? []),
  );
  return {
    ...template,
    years: years.length > 0 ? years : template.years,
    difficulties: difficulties.length > 0 ? difficulties : template.difficulties,
  };
}

/**
 * Drop one or more skeletons from the open family.
 * An empty family is allowed; add cards again when ready.
 */
export function removeVariantsFromFamilyJson(
  familyRaw: string,
  indexes: readonly number[],
): RemoveVariantResult {
  const parsed = parseFamilyText(familyRaw);
  if (!parsed.success) return { ok: false, reason: "schema" };
  const family = parsed.data;
  const drop = new Set(
    indexes.filter((index) => index >= 0 && index < family.variants.length),
  );
  if (drop.size === 0) return { ok: false, reason: "missing" };
  const variants = family.variants.filter((_, index) => !drop.has(index));
  const merged = relabelFamily({ ...family, variants });
  return { ok: true, json: `${JSON.stringify(merged, null, 2)}\n` };
}

export function removeVariantFromFamilyJson(
  familyRaw: string,
  index: number,
): RemoveVariantResult {
  return removeVariantsFromFamilyJson(familyRaw, [index]);
}

export type RelabelVariantLabels = {
  year?: ProblemYear;
  difficulty?: ProblemDifficulty;
};

/** Set year and/or difficulty on one skeleton; family labels follow the cards. */
export function relabelVariantInFamilyJson(
  familyRaw: string,
  index: number,
  labels: RelabelVariantLabels,
): RemoveVariantResult {
  const parsed = parseFamilyText(familyRaw);
  if (!parsed.success) return { ok: false, reason: "schema" };
  const family = parsed.data;
  const current = family.variants[index];
  if (!current) return { ok: false, reason: "missing" };

  const variants = family.variants.map((variant, variantIndex) =>
    variantIndex === index
      ? {
          ...variant,
          years: labels.year ? [labels.year] : variant.years,
          difficulties: labels.difficulty
            ? [labels.difficulty]
            : variant.difficulties,
        }
      : variant,
  );

  const merged = relabelFamily({ ...family, variants });
  return { ok: true, json: `${JSON.stringify(merged, null, 2)}\n` };
}

export type IncomingFamilyLabels = {
  difficulty?: ProblemDifficulty;
  year?: ProblemYear;
};

export type MergeIncomingFamilyResult =
  | { ok: true; json: string; added: number }
  | { ok: false; reason: "json" | "schema" | "full" | "family" };

/**
 * Keep the open family; append variants parsed from a pasted card,
 * a comma-separated pair, or a wrapped list such as vector_space_problems.
 * Selected difficulty/year (when not Any) label the new cards.
 */
export function mergeIncomingFamilyJson(
  familyRaw: string,
  incomingRaw: string,
  labels: IncomingFamilyLabels = {},
): MergeIncomingFamilyResult {
  if (!incomingRaw.replace(/^\uFEFF/, "").trim()) {
    return { ok: false, reason: "json" };
  }

  const familyParsed = parseFamilyText(familyRaw);
  if (!familyParsed.success) return { ok: false, reason: "family" };

  let incomingParsed: ReturnType<typeof parseProblemTemplate>;
  try {
    incomingParsed = parseProblemTemplate(parseTeacherJson(incomingRaw));
  } catch {
    return { ok: false, reason: "json" };
  }
  if (!incomingParsed.success) return { ok: false, reason: "schema" };

  const family = familyParsed.data;
  const incoming = incomingParsed.data;
  if (incoming.variants.length === 0) return { ok: false, reason: "schema" };
  if (family.variants.length + incoming.variants.length > FAMILY_VARIANT_MAX) {
    return { ok: false, reason: "full" };
  }

  const labeledIncoming = incoming.variants.map((variant) => ({
    ...variant,
    years: labels.year
      ? [labels.year]
      : variant.years?.length
        ? variant.years
        : incoming.years,
    difficulties: labels.difficulty
      ? [labels.difficulty]
      : variant.difficulties?.length
        ? variant.difficulties
        : incoming.difficulties,
  }));

  const merged = relabelFamily({
    ...family,
    variants: uniquifyVariantIds([...family.variants, ...labeledIncoming]),
  });

  return {
    ok: true,
    added: incoming.variants.length,
    json: `${JSON.stringify(merged, null, 2)}\n`,
  };
}
