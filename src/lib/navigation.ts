import type { Dictionary } from "@/i18n/types";

export type NavId = keyof Dictionary["nav"];
export type FooterGroupId = keyof Dictionary["footer"]["groups"];
export type ResourceId = keyof Dictionary["home"]["resources"]["items"];
export type StatId = keyof Dictionary["home"]["stats"]["items"];
export type LegalId = keyof Dictionary["footer"]["legal"];

/**
 * Hrefs live in code, labels live in `@/i18n/messages`. The shared ids are
 * type-checked against the dictionary, so a renamed key breaks the build.
 */
export const mainNavLinks: { id: NavId; href: string }[] = [
  { id: "home", href: "/" },
  { id: "about", href: "/about" },
  { id: "tools", href: "/tools" },
  { id: "students", href: "/student" },
  { id: "teacher", href: "/teacher" },
];

export const footerGroupOrder: FooterGroupId[] = ["platform", "learning", "info"];

export const footerLinkHrefs: Record<string, string> = {
  tools: "/tools",
  courses: "/courses",
  blog: "/blog",
  formulas: "/formulas",
  student: "/student",
  teacher: "/teacher",
  assignments: "/student/assignments",
  login: "/login",
  about: "/about",
  pricing: "/pricing",
  faq: "/faq",
  contact: "/contact",
};

export const legalLinks: { id: LegalId; href: string }[] = [
  { id: "privacy", href: "/privacy" },
  { id: "terms", href: "/terms" },
];
