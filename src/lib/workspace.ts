import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Calculator,
  CalendarDays,
  Library,
} from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import { TOOL_SECTIONS, type ToolItem } from "@/lib/tools";

export type WorkspaceModuleId = keyof Dictionary["home"]["modules"]["items"];
export type LookupKindId = keyof Dictionary["home"]["lookup"]["kinds"];
export type LookupRowId = keyof Dictionary["home"]["lookup"]["rows"];

export interface WorkspaceLink {
  id: string;
  href: string;
}

export interface WorkspaceModule {
  id: WorkspaceModuleId;
  icon: LucideIcon;
  href: string;
  links: WorkspaceLink[];
}

export interface LookupRow {
  id: LookupRowId;
  kind: LookupKindId;
  href: string;
}

export const WORKSPACE_MODULES: WorkspaceModule[] = [
  {
    id: "compute",
    icon: Calculator,
    href: "/tools",
    links: [
      { id: "graphing", href: "/tools/graphing" },
      { id: "equations", href: "/tools/equation-solver" },
      { id: "ode", href: "/tools/ode-solver" },
      { id: "matrices", href: "/tools/matrix" },
    ],
  },
  {
    id: "reference",
    icon: BookOpen,
    href: "/tools/formulas/search",
    links: [
      { id: "algebra", href: "/tools/formulas/algebra" },
      { id: "geometry", href: "/tools/formulas/geometry" },
      { id: "calculus", href: "/tools/formulas/calculus" },
    ],
  },
  {
    id: "problems",
    icon: Library,
    href: "/tools",
    links: [
      { id: "school", href: "/tools/national-exam-trainer" },
      { id: "olympiad", href: "/tools/olympiad-prep" },
      { id: "university", href: "/courses" },
    ],
  },
  {
    id: "schedule",
    icon: CalendarDays,
    href: "/courses",
    links: [
      { id: "national", href: "/contact?course=national-exams" },
      { id: "school", href: "/contact?course=school" },
      { id: "olympiad", href: "/contact?course=olympiad" },
      { id: "university", href: "/contact?course=university" },
    ],
  },
];

export const LOOKUP_ROWS: LookupRow[] = [
  { id: "graphing", kind: "calculator", href: "/tools/graphing" },
  { id: "equations", kind: "calculator", href: "/tools/equation-solver" },
  { id: "matrices", kind: "calculator", href: "/tools/matrix" },
  { id: "calculus", kind: "calculator", href: "/tools/derivatives" },
  { id: "ode", kind: "calculator", href: "/tools/ode-solver" },
  { id: "triangle", kind: "calculator", href: "/tools/triangle-solver" },
  { id: "formulas", kind: "formula", href: "/tools/formulas/search" },
  { id: "identities", kind: "formula", href: "/tools/formulas/algebra" },
  { id: "unitCircle", kind: "formula", href: "/tools/unit-circle" },
];

const lookupHrefs = new Set(LOOKUP_ROWS.map((row) => row.href));

export function catalogTools(): ToolItem[] {
  return TOOL_SECTIONS.flatMap((section) => section.tools);
}

export function extraCatalogTools() {
  return catalogTools().filter((tool) => !lookupHrefs.has(tool.href));
}
