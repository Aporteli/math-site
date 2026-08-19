import type { ProblemTopic, ProblemYear } from "./types";
import type { ProblemTemplate } from "./templates/schema";

export const FAMILY_KIND_PREFIX = "family:";

export function familyKindValue(slug: string) {
  return `${FAMILY_KIND_PREFIX}${slug}`;
}

export function parseFamilyKind(kind: string | undefined): string | null {
  if (!kind?.startsWith(FAMILY_KIND_PREFIX)) return null;
  const slug = kind.slice(FAMILY_KIND_PREFIX.length).trim();
  return slug || null;
}

export function slugFromTitle(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || `kind-${Date.now().toString(36)}`;
}

function yearsForTopic(topic: ProblemTopic): ProblemYear[] {
  if (topic === "calculus") return ["11", "12"];
  if (topic === "algebra") return ["8", "9", "10", "11"];
  if (topic === "percent") return ["7", "8", "9"];
  return ["8", "9", "10"];
}

export function stubFamilyTemplate(
  slug: string,
  topic: ProblemTopic,
  title: string,
): ProblemTemplate {
  const prompt = title.trim() || slug;
  return {
    id: slug,
    topic,
    difficulties: ["medium"],
    years: yearsForTopic(topic),
    instructionId: "solve",
    variants: [
      {
        id: "main",
        params: { n: { pick: [1] } },
        derived: {},
        constraints: [],
        prompt,
        solutionSteps: ["{{n}}"],
        formula: "n",
        example: { n: 1 },
      },
    ],
  };
}
