"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Bot,
  CreditCard,
  Database,
  Flag,
  FolderTree,
  Globe2,
  Languages,
  LayoutDashboard,
  Library,
  School,
  Shield,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { TaxonomyManager } from "@/components/lms/problem-bank/taxonomy-manager";
import { PageHero } from "@/components/ui/page-hero";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import type { TaxonomyNodeDto } from "@/lib/math/problems/taxonomy-shared";

type AdminCopy = Dictionary["dashboard"]["teacher"]["admin"];
type TaxonomyCopy = Dictionary["dashboard"]["teacher"]["taxonomy"];

export type AdminSectionId = keyof AdminCopy["sections"];

const SECTION_ICONS: Record<AdminSectionId, LucideIcon> = {
  overview: LayoutDashboard,
  taxonomy: FolderTree,
  users: Users,
  roles: Shield,
  ai: Bot,
  prompts: Sparkles,
  content: Library,
  storage: Database,
  lms: School,
  analytics: BarChart3,
  i18n: Languages,
  locales: Globe2,
  billing: CreditCard,
  featureFlags: Flag,
  system: Wrench,
};

const SECTION_ORDER: AdminSectionId[] = [
  "overview",
  "taxonomy",
  "users",
  "roles",
  "ai",
  "prompts",
  "content",
  "storage",
  "lms",
  "analytics",
  "i18n",
  "locales",
  "billing",
  "featureFlags",
  "system",
];

function ComingSoonCard({
  title,
  description,
  soon,
  hint,
}: {
  title: string;
  description: string;
  soon: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight text-ink">
            {title}
          </h3>
          <p className="mt-1 text-sm text-body">{description}</p>
        </div>
        <span className="rounded-full bg-brass-tint px-2.5 py-1 text-[11px] font-semibold text-brass">
          {soon}
        </span>
      </div>
      <p className="mt-4 rounded-xl border border-hairline-soft bg-paper px-4 py-3 text-sm text-muted">
        {hint}
      </p>
    </div>
  );
}

export function AdminPanel({
  locale,
  copy,
  taxonomyCopy,
  taxonomyNodes,
}: {
  locale: Locale;
  copy: AdminCopy;
  taxonomyCopy: TaxonomyCopy;
  taxonomyNodes: TaxonomyNodeDto[];
}) {
  const [section, setSection] = useState<AdminSectionId>("overview");

  const active = useMemo(() => copy.sections[section], [copy.sections, section]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHero
        icon={Shield}
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.subtitle}
      />

      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-hairline bg-white p-2 shadow-sm lg:sticky lg:top-4">
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {copy.sectionsNav}
          </p>
          <nav aria-label={copy.sectionsNav} className="space-y-0.5">
            {SECTION_ORDER.map((id) => {
              const Icon = SECTION_ICONS[id];
              const item = copy.sections[id];
              const selected = section === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  className={[
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    selected
                      ? "bg-navy-tint font-semibold text-navy"
                      : "text-body hover:bg-paper hover:text-navy",
                  ].join(" ")}
                  onClick={() => setSection(id)}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-4">
          {section === "overview" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-hairline bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold tracking-tight text-ink">
                  {active.title}
                </h2>
                <p className="mt-1 text-sm text-body">{active.description}</p>
                <p className="mt-4 text-sm text-muted">{copy.overviewHint}</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {SECTION_ORDER.filter((id) => id !== "overview").map((id) => {
                  const Icon = SECTION_ICONS[id];
                  const item = copy.sections[id];
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className="flex h-full w-full flex-col gap-2 rounded-2xl border border-hairline bg-white p-4 text-left shadow-sm transition-colors hover:border-navy/30 hover:shadow-md"
                        onClick={() => setSection(id)}
                      >
                        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-navy-tint text-navy">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="text-sm font-semibold text-ink">
                          {item.title}
                        </span>
                        <span className="text-xs text-body">
                          {item.description}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {section === "taxonomy" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-hairline bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold tracking-tight text-ink">
                  {active.title}
                </h2>
                <p className="mt-1 text-sm text-body">{active.description}</p>
              </div>
              <div className="rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5">
                <TaxonomyManager
                  locale={locale}
                  copy={taxonomyCopy}
                  initialNodes={taxonomyNodes}
                  embedded
                />
              </div>
            </div>
          ) : null}

          {section !== "overview" && section !== "taxonomy" ? (
            <ComingSoonCard
              title={active.title}
              description={active.description}
              soon={copy.comingSoon}
              hint={copy.comingSoonHint}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
