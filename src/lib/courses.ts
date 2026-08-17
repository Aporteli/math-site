import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  ChartColumn,
  ClipboardCheck,
  GraduationCap,
  House,
  Laptop,
  ListChecks,
  Sigma,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { Dictionary } from "@/i18n/types";

export type CourseId = keyof Dictionary["coursesPage"]["items"];
export type CourseFilterId = Exclude<
  keyof Dictionary["coursesPage"]["filters"],
  "aria"
>;
export type CourseHighlightId = keyof Dictionary["coursesPage"]["highlights"];
export type CourseStepId = keyof Dictionary["coursesPage"]["process"]["steps"];
export type CourseFaqId = keyof Dictionary["coursesPage"]["faq"]["items"];

/**
 * Catalog row for a course. Titles, badges, schedule and feature lists live
 * in i18n. Ready to map from a Prisma `Course` model later.
 */
export interface CourseItem {
  id: CourseId;
  icon: LucideIcon;
  href: string;
}

export const COURSE_FILTERS: CourseFilterId[] = [
  "all",
  "national",
  "school",
  "olympiad",
  "university",
];

export const COURSE_HIGHLIGHTS: { id: CourseHighlightId; icon: LucideIcon }[] = [
  { id: "onsite", icon: House },
  { id: "online", icon: Laptop },
  { id: "lms", icon: BarChart3 },
];

export const COURSE_STEPS: { id: CourseStepId; icon: LucideIcon }[] = [
  { id: "diagnose", icon: ClipboardCheck },
  { id: "plan", icon: ListChecks },
  { id: "practice", icon: Sparkles },
  { id: "monitor", icon: ChartColumn },
];

export const COURSE_FAQS: CourseFaqId[] = [
  "online",
  "missed",
  "parent",
  "switch",
];

export const COURSES: CourseItem[] = [
  {
    id: "national",
    icon: GraduationCap,
    href: "/contact?course=national-exams",
  },
  {
    id: "school",
    icon: BookOpen,
    href: "/contact?course=school",
  },
  {
    id: "olympiad",
    icon: Trophy,
    href: "/contact?course=olympiad",
  },
  {
    id: "university",
    icon: Sigma,
    href: "/contact?course=university",
  },
];
