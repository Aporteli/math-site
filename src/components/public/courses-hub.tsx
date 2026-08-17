"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { PageHero, SectionHeading } from "@/components/ui/page-hero";
import {
  COURSE_FAQS,
  COURSE_FILTERS,
  COURSE_HIGHLIGHTS,
  COURSE_STEPS,
  COURSES,
  type CourseFilterId,
  type CourseItem,
} from "@/lib/courses";

type CoursesCopy = Dictionary["coursesPage"];

interface CoursesHubProps {
  locale: Locale;
  copy: CoursesCopy;
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`max-w-full rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-200 sm:px-4 ${
        active
          ? "border-navy bg-navy text-white shadow-sm"
          : "border-hairline bg-white text-body hover:border-navy/30 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function CourseCard({
  locale,
  course,
  item,
  cta,
  scheduleLabel,
}: {
  locale: Locale;
  course: CourseItem;
  item: CoursesCopy["items"][CourseItem["id"]];
  cta: string;
  scheduleLabel: string;
}) {
  const Icon = course.icon;

  return (
    <article className="flex h-full min-w-0 flex-col rounded-2xl border border-hairline bg-white p-5 shadow-sm transition-all hover:border-navy/30 hover:shadow-md sm:p-6">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-tint text-navy">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 break-words text-lg font-semibold leading-snug text-ink">
        {item.title}
      </h3>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {item.badges.map((badge) => (
          <li
            key={badge}
            className="rounded-full bg-paper-deep px-2.5 py-1 text-xs font-semibold leading-none text-ink"
          >
            {badge}
          </li>
        ))}
      </ul>
      <p className="mt-4 inline-flex items-start gap-2 text-sm text-body">
        <Calendar className="mt-0.5 size-4 shrink-0 text-brass" aria-hidden="true" />
        <span>
          <span className="font-semibold text-ink">{scheduleLabel}: </span>
          {item.schedule}
        </span>
      </p>
      <ul className="mt-4 flex-1 space-y-2.5">
        {item.features.map((feature) => (
          <li key={feature} className="flex gap-2 text-sm leading-relaxed text-body">
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-navy"
              aria-hidden="true"
            />
            <span className="min-w-0 break-words">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href={localePath(locale, course.href)}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-strong"
      >
        {cta}
        <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
      </Link>
    </article>
  );
}

function ProcessStep({
  index,
  icon: Icon,
  title,
  text,
}: {
  index: number;
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <li className="relative min-w-0 rounded-2xl border border-hairline bg-white p-5">
      <span className="text-xs font-semibold tracking-wide text-brass">
        {String(index).padStart(2, "0")}
      </span>
      <span className="mt-3 flex size-10 items-center justify-center rounded-xl bg-navy-tint text-navy">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-body">{text}</p>
    </li>
  );
}

export function CoursesHub({ locale, copy }: CoursesHubProps) {
  const [filter, setFilter] = useState<CourseFilterId>("all");
  const visibleCourses =
    filter === "all" ? COURSES : COURSES.filter((course) => course.id === filter);

  return (
    <div className="overflow-x-clip">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <PageHero
          icon={GraduationCap}
          eyebrow={copy.hero.eyebrow}
          title={copy.hero.title}
          description={copy.hero.subtitle}
          aside={
            <ul className="flex flex-col gap-2">
              {COURSE_HIGHLIGHTS.map(({ id, icon: Icon }) => (
                <li
                  key={id}
                  className="inline-flex max-w-full items-center gap-2 rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm font-medium text-ink"
                >
                  <Icon className="size-4 shrink-0 text-navy" aria-hidden="true" />
                  <span className="min-w-0 break-words">{copy.highlights[id]}</span>
                </li>
              ))}
            </ul>
          }
          footer={
            <nav aria-label={copy.filters.aria}>
              <div className="flex flex-wrap gap-2">
                {COURSE_FILTERS.map((id) => (
                  <FilterPill
                    key={id}
                    active={filter === id}
                    onClick={() => setFilter(id)}
                  >
                    {copy.filters[id]}
                  </FilterPill>
                ))}
              </div>
            </nav>
          }
        />

        <section className="mt-10" aria-label={copy.hero.eyebrow}>
          {visibleCourses.length === 0 ? (
            <p className="rounded-2xl border border-hairline bg-white px-6 py-16 text-center text-body shadow-sm">
              {copy.empty}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visibleCourses.map((course) => (
                <li key={course.id} className="min-w-0">
                  <CourseCard
                    locale={locale}
                    course={course}
                    item={copy.items[course.id]}
                    cta={copy.cta}
                    scheduleLabel={copy.scheduleLabel}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-16 sm:mt-20" aria-labelledby="process-title">
          <SectionHeading
            id="process-title"
            title={copy.process.title}
            description={copy.process.subtitle}
          />
          <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            {COURSE_STEPS.map(({ id, icon }, index) => (
              <ProcessStep
                key={id}
                index={index + 1}
                icon={icon}
                title={copy.process.steps[id].title}
                text={copy.process.steps[id].text}
              />
            ))}
          </ol>
        </section>

        <section className="mt-16 sm:mt-20" aria-labelledby="faq-title">
          <SectionHeading id="faq-title" title={copy.faq.title} />
          <ul className="mt-8 space-y-3">
            {COURSE_FAQS.map((id) => (
              <li key={id}>
                <details className="group rounded-2xl border border-hairline bg-white px-5 py-4 shadow-sm open:border-navy/20">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 break-words">
                      {copy.faq.items[id].question}
                    </span>
                    <ChevronDown
                      className="mt-0.5 size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-body">
                    {copy.faq.items[id].answer}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16 rounded-2xl bg-navy px-6 py-10 text-center text-white sm:mt-20 sm:px-10 sm:py-12">
          <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            {copy.banner.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-pretty text-paper/80">
            {copy.banner.subtitle}
          </p>
          <Link
            href={localePath(locale, "/contact")}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-navy shadow-sm transition-colors hover:bg-paper"
          >
            {copy.banner.cta}
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
