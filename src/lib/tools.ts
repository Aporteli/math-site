import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
  AudioWaveform,
  Award,
  BarChart3,
  Binary,
  BookCheck,
  BookOpen,
  Box,
  Boxes,
  Calculator,
  CircleDot,
  ClipboardCheck,
  Compass,
  Dices,
  Divide,
  Equal,
  Eye,
  Gamepad2,
  Gauge,
  Globe2,
  GraduationCap,
  Grid3x3,
  Hash,
  HelpCircle,
  Image,
  Infinity as InfinityIcon,
  Layers,
  Lightbulb,
  LineChart,
  ListOrdered,
  MoveDiagonal,
  Network,
  Orbit,
  Palette,
  Percent,
  PenTool,
  Pi,
  Printer,
  Shuffle,
  Shapes,
  Sigma,
  Sliders,
  Sparkles,
  Spline,
  Superscript,
  Target,
  Timer,
  Triangle,
  Trophy,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { Dictionary } from "@/i18n/types";

export type ToolSectionId = keyof Dictionary["toolsPage"]["sections"];
export type ToolItemId = keyof Dictionary["toolsPage"]["items"];

/**
 * Badge tones map onto the site palette (navy / brass / paper), not raw
 * Tailwind scales. Add a tone here only if a new semantic token exists.
 */
export type ToolBadgeColor = "navy" | "brass" | "ink" | "soft";

export interface ToolItem {
  id: ToolItemId;
  icon: LucideIcon;
  badgeColor: ToolBadgeColor;
  href: string;
}

export interface ToolSection {
  id: ToolSectionId;
  tools: ToolItem[];
}

/**
 * Catalog configuration. Hrefs, icons and order live here; titles, subtitles
 * and badges live in `@/i18n/messages` under the same ids.
 *
 * To add a section later: append an entry to `TOOL_SECTIONS` and add matching
 * keys under `toolsPage.sections` / `toolsPage.items` in ka/en/ru.
 */
export const TOOL_SECTIONS: ToolSection[] = [
  {
    id: "calculators",
    tools: [
      {
        id: "graphing",
        icon: LineChart,
        badgeColor: "navy",
        href: "/tools/graphing",
      },
      {
        id: "equations",
        icon: Equal,
        badgeColor: "brass",
        href: "/tools/equation-solver",
      },
      {
        id: "fractions",
        icon: Percent,
        badgeColor: "ink",
        href: "/tools/fractions",
      },
      {
        id: "systemSolver",
        icon: Binary,
        badgeColor: "navy",
        href: "/tools/system-solver",
      },
      {
        id: "polynomials",
        icon: Divide,
        badgeColor: "navy",
        href: "/tools/polynomials",
      },
      {
        id: "inequalities",
        icon: Spline,
        badgeColor: "navy",
        href: "/tools/inequalities",
      },
      {
        id: "logarithms",
        icon: Superscript,
        badgeColor: "navy",
        href: "/tools/logarithms",
      },
      {
        id: "triangle",
        icon: Triangle,
        badgeColor: "brass",
        href: "/tools/triangle-solver",
      },
      {
        id: "unitCircle",
        icon: CircleDot,
        badgeColor: "brass",
        href: "/tools/unit-circle",
      },
      {
        id: "geometry",
        icon: Box,
        badgeColor: "brass",
        href: "/tools/geometry-3d",
      },
      {
        id: "vectors",
        icon: MoveDiagonal,
        badgeColor: "brass",
        href: "/tools/vectors",
      },
      {
        id: "derivatives",
        icon: Gauge,
        badgeColor: "navy",
        href: "/tools/derivatives",
      },
      {
        id: "integrals",
        icon: Sigma,
        badgeColor: "navy",
        href: "/tools/integrals",
      },
      {
        id: "ode",
        icon: Activity,
        badgeColor: "navy",
        href: "/tools/ode-solver",
      },
      {
        id: "matrices",
        icon: Grid3x3,
        badgeColor: "brass",
        href: "/tools/matrix",
      },
      {
        id: "combinatorics",
        icon: Shuffle,
        badgeColor: "ink",
        href: "/tools/combinatorics",
      },
      {
        id: "sequences",
        icon: ListOrdered,
        badgeColor: "ink",
        href: "/tools/sequences",
      },
      {
        id: "numberTheory",
        icon: Hash,
        badgeColor: "ink",
        href: "/tools/number-theory",
      },
    ],
  },
  {
    id: "advanced",
    tools: [
      {
        id: "calculusSolver",
        icon: Sigma,
        badgeColor: "navy",
        href: "/tools/calculus-solver",
      },
      {
        id: "linearAlgebra",
        icon: Grid3x3,
        badgeColor: "brass",
        href: "/tools/linear-algebra",
      },
      {
        id: "odeLab",
        icon: Activity,
        badgeColor: "soft",
        href: "/tools/ode",
      },
      {
        id: "limitsSeries",
        icon: InfinityIcon,
        badgeColor: "navy",
        href: "/tools/limits-series",
      },
      {
        id: "multivariable",
        icon: Layers,
        badgeColor: "brass",
        href: "/tools/multivariable-3d",
      },
      {
        id: "vectorCalculus",
        icon: Compass,
        badgeColor: "ink",
        href: "/tools/vector-calculus",
      },
      {
        id: "complexAnalysis",
        icon: CircleDot,
        badgeColor: "brass",
        href: "/tools/complex-analysis",
      },
      {
        id: "transforms",
        icon: AudioWaveform,
        badgeColor: "navy",
        href: "/tools/transforms",
      },
    ],
  },
  {
    id: "applied",
    tools: [
      {
        id: "probability",
        icon: Dices,
        badgeColor: "ink",
        href: "/tools/probability",
      },
      {
        id: "statistics",
        icon: BarChart3,
        badgeColor: "navy",
        href: "/tools/statistics",
      },
      {
        id: "finance",
        icon: TrendingUp,
        badgeColor: "brass",
        href: "/tools/financial-math",
      },
      {
        id: "physicsSim",
        icon: Orbit,
        badgeColor: "soft",
        href: "/tools/physics-simulations",
      },
      {
        id: "gameTheory",
        icon: Target,
        badgeColor: "navy",
        href: "/tools/game-theory",
      },
      {
        id: "graphTheory",
        icon: Network,
        badgeColor: "ink",
        href: "/tools/graph-theory",
      },
      {
        id: "optimization",
        icon: Sliders,
        badgeColor: "brass",
        href: "/tools/optimization",
      },
    ],
  },
  {
    id: "exam",
    tools: [
      {
        id: "nationalExam",
        icon: GraduationCap,
        badgeColor: "navy",
        href: "/tools/national-exam-trainer",
      },
      {
        id: "olympiadPrep",
        icon: Trophy,
        badgeColor: "brass",
        href: "/tools/olympiad-prep",
      },
      {
        id: "mockTests",
        icon: ClipboardCheck,
        badgeColor: "soft",
        href: "/tools/mock-tests",
      },
      {
        id: "schoolDiagnostics",
        icon: BookCheck,
        badgeColor: "ink",
        href: "/tools/school-diagnostics",
      },
      {
        id: "internationalTests",
        icon: Globe2,
        badgeColor: "navy",
        href: "/tools/international-tests",
      },
      {
        id: "mistakeAnalysis",
        icon: AlertCircle,
        badgeColor: "brass",
        href: "/tools/mistake-analysis",
      },
      {
        id: "formulaBlitz",
        icon: Zap,
        badgeColor: "ink",
        href: "/tools/formula-blitz",
      },
      {
        id: "universityExams",
        icon: Award,
        badgeColor: "navy",
        href: "/tools/university-exams",
      },
    ],
  },
  {
    id: "teacher",
    tools: [
      {
        id: "worksheetBuilder",
        icon: Printer,
        badgeColor: "navy",
        href: "/tools/worksheet-builder",
      },
      {
        id: "whiteboard",
        icon: PenTool,
        badgeColor: "brass",
        href: "/tools/whiteboard",
      },
      {
        id: "diagramExporter",
        icon: Image,
        badgeColor: "ink",
        href: "/tools/diagram-exporter",
      },
      {
        id: "classroomTimer",
        icon: Timer,
        badgeColor: "soft",
        href: "/tools/classroom-timer",
      },
      {
        id: "gradeCalculator",
        icon: Calculator,
        badgeColor: "brass",
        href: "/tools/grade-calculator",
      },
    ],
  },
  {
    id: "formulas",
    tools: [
      {
        id: "formulas",
        icon: BookOpen,
        badgeColor: "navy",
        href: "/tools/formulas/search",
      },
      {
        id: "identities",
        icon: Equal,
        badgeColor: "brass",
        href: "/tools/formulas/algebra",
      },
      {
        id: "constants",
        icon: Pi,
        badgeColor: "soft",
        href: "/tools/formulas/constants",
      },
      {
        id: "formulaGeometry",
        icon: Shapes,
        badgeColor: "brass",
        href: "/tools/formulas/geometry",
      },
      {
        id: "formulaTrig",
        icon: CircleDot,
        badgeColor: "navy",
        href: "/tools/formulas/trigonometry",
      },
      {
        id: "formulaCalculus",
        icon: Sigma,
        badgeColor: "navy",
        href: "/tools/formulas/calculus",
      },
      {
        id: "formulaSeries",
        icon: InfinityIcon,
        badgeColor: "ink",
        href: "/tools/formulas/series",
      },
      {
        id: "formulaVectors",
        icon: MoveDiagonal,
        badgeColor: "brass",
        href: "/tools/formulas/vectors",
      },
    ],
  },
  {
    id: "widgets",
    tools: [
      {
        id: "problem",
        icon: Lightbulb,
        badgeColor: "brass",
        href: "/tools/daily-problem",
      },
      {
        id: "quizzes",
        icon: HelpCircle,
        badgeColor: "ink",
        href: "/tools/quizzes",
      },
      {
        id: "visualProofs",
        icon: Eye,
        badgeColor: "navy",
        href: "/tools/visual-proofs",
      },
      {
        id: "mentalMath",
        icon: Zap,
        badgeColor: "brass",
        href: "/tools/mental-math",
      },
      {
        id: "flashcards",
        icon: Layers,
        badgeColor: "soft",
        href: "/tools/flashcards",
      },
      {
        id: "converters",
        icon: ArrowLeftRight,
        badgeColor: "ink",
        href: "/tools/converters",
      },
      {
        id: "paradoxes",
        icon: Sparkles,
        badgeColor: "brass",
        href: "/tools/paradoxes",
      },
      {
        id: "functionSandbox",
        icon: Sliders,
        badgeColor: "navy",
        href: "/tools/function-sandbox",
      },
    ],
  },
  {
    id: "games",
    tools: [
      {
        id: "duel",
        icon: Zap,
        badgeColor: "brass",
        href: "/tools/speed-duel",
      },
      {
        id: "lissajous",
        icon: Sparkles,
        badgeColor: "navy",
        href: "/tools/math-art",
      },
      {
        id: "game24",
        icon: Gamepad2,
        badgeColor: "ink",
        href: "/tools/game-24",
      },
      {
        id: "fractalExplorer",
        icon: Orbit,
        badgeColor: "brass",
        href: "/tools/fractal-explorer",
      },
      {
        id: "tangram",
        icon: Shapes,
        badgeColor: "soft",
        href: "/tools/tangram",
      },
      {
        id: "towerOfHanoi",
        icon: Boxes,
        badgeColor: "navy",
        href: "/tools/tower-of-hanoi",
      },
      {
        id: "mapColoring",
        icon: Palette,
        badgeColor: "brass",
        href: "/tools/map-coloring",
      },
      {
        id: "primeMaze",
        icon: Compass,
        badgeColor: "ink",
        href: "/tools/prime-maze",
      },
    ],
  },
];

export const badgeToneClass: Record<
  ToolBadgeColor,
  { chip: string; badge: string }
> = {
  navy: {
    chip: "bg-navy-tint text-navy",
    badge: "bg-navy-tint text-navy",
  },
  brass: {
    chip: "bg-brass-tint text-brass-strong",
    badge: "bg-brass-tint text-brass-strong",
  },
  ink: {
    chip: "bg-paper-deep text-ink",
    badge: "bg-paper-deep text-ink",
  },
  soft: {
    chip: "bg-paper-deep text-navy",
    badge: "bg-hairline-soft text-body",
  },
};

export function catalogTools() {
  return TOOL_SECTIONS.flatMap((section) =>
    section.tools.map((tool) => ({ ...tool, sectionId: section.id })),
  );
}

export type CatalogTool = ReturnType<typeof catalogTools>[number];

export function toolPathFromHref(href: string) {
  return href.replace(/^\/tools\//, "");
}

export function getCatalogToolByPath(path: string) {
  const href = path.startsWith("/tools/") ? path : `/tools/${path}`;
  return catalogTools().find((tool) => tool.href === href);
}

export function getCatalogToolBySlug(slug: string) {
  return getCatalogToolByPath(slug);
}

export function catalogToolStaticParams() {
  return catalogTools().map((tool) => ({
    toolSlug: toolPathFromHref(tool.href).split("/"),
  }));
}
