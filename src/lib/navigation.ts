import type { Dictionary } from "@/i18n/types";
import { TELEGRAM_HREF } from "@/lib/contact";

export type NavId = keyof Dictionary["nav"];
export type NavMenuId = keyof Dictionary["menus"];
export type LegalId = keyof Dictionary["footer"]["legal"];

/**
 * Hrefs live in code, labels live in `@/i18n/messages`. The shared ids are
 * type-checked against the dictionary, so a renamed key breaks the build.
 */
export const mainNavLinks: { id: NavId; href: string; menu?: NavMenuId }[] = [
  { id: "home", href: "/" },
  { id: "tools", href: "/tools", menu: "tools" },
  { id: "courses", href: "/courses" },
  { id: "blog", href: "/blog", menu: "blog" },
  { id: "contact", href: "/contact" },
];

/** Submenu hrefs; order comes from the matching keys in `menus` in the dictionaries. */
export const navMenuHrefs: Record<NavMenuId, Record<string, string>> = {
  tools: {
    calculators: "/tools#calculators",
    graphing: "/tools/graphing",
    matrices: "/tools/matrix",
    calculus: "/tools/derivatives",
  },
  blog: {
    articles: "/blog",
    formulas: "/tools/formulas/search",
    problems: "/resources/problems",
    videos: "/resources/videos",
  },
};

export const legalLinks: { id: LegalId; href: string }[] = [
  { id: "privacy", href: "/privacy" },
  { id: "terms", href: "/terms" },
];

export const telegramHref = TELEGRAM_HREF;
