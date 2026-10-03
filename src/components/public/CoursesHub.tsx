'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, CheckCircle2, ChevronDown, GraduationCap, type LucideIcon } from 'lucide-react';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import { PageHero, SectionHeading } from '@/components/ui/PageHero';
import {
  COURSE_FAQS,
  COURSE_FILTERS,
  COURSE_HIGHLIGHTS,
  COURSE_STEPS,
  COURSES,
  type CourseFilterId,
  type CourseItem,
} from '@/lib/courses';

type CoursesCopy = Dictionary['coursesPage'];

interface CoursesHubProps {
  locale: Locale;
  copy: CoursesCopy;
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`max-w-full cursor-pointer rounded-box border px-3.5 py-2 text-sm transition-all duration-200 sm:px-4 ${
        active
          ? 'border-transparent bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
          : 'border-hairline bg-main font-medium text-mainText hover:bg-sectionHeader'
      }`}>
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
  item: CoursesCopy['items'][CourseItem['id']];
  cta: string;
  scheduleLabel: string;
}) {
  const Icon = course.icon;

  return (
    <article className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-box border border-hairline bg-main p-5 shadow-sm transition-all duration-200 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-box bg-brass-tint text-brass-strong">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 break-words text-lg font-semibold leading-snug text-ink">{item.title}</h3>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {item.badges.map((badge) => (
          <li
            key={badge}
            className="rounded-box bg-paper-deep px-2.5 py-1 text-xs font-semibold leading-none text-ink">
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
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-win" aria-hidden="true" />
            <span className="min-w-0 break-words">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href={localePath(locale, course.href)}
        className="mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-box bg-[#465D73] px-4 py-2.5 text-center text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98]">
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
    <li className="relative min-w-0 overflow-hidden rounded-box border border-hairline bg-main p-5 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass">
      <span className="text-xs font-semibold tracking-wide text-brass">{String(index).padStart(2, '0')}</span>
      <span className="mt-3 flex size-10 items-center justify-center rounded-box bg-brass-tint text-brass-strong">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-body">{text}</p>
    </li>
  );
}

export function CoursesHub({ locale, copy }: CoursesHubProps) {
  const [filter, setFilter] = useState<CourseFilterId>('all');
  const visibleCourses = filter === 'all' ? COURSES : COURSES.filter((course) => course.id === filter);

  return (
    <div className="overflow-x-clip">
    <div className="mx-auto w-full min-w-0 max-w-[2000px] ">
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
                  className="inline-flex max-w-full items-center gap-2 rounded-box border border-hairline bg-main px-3.5 py-2.5 text-sm font-medium text-ink">
                  <Icon className="size-4 shrink-0 text-brass-strong" aria-hidden="true" />
                  <span className="min-w-0 break-words">{copy.highlights[id]}</span>
                </li>
              ))}
            </ul>
          }
          footer={
            <nav aria-label={copy.filters.aria}>
              <div className="flex flex-wrap gap-2">
                {COURSE_FILTERS.map((id) => (
                  <FilterPill key={id} active={filter === id} onClick={() => setFilter(id)}>
                    {copy.filters[id]}
                  </FilterPill>
                ))}
              </div>
            </nav>
          }
        />

        <section className="mt-10" aria-label={copy.hero.eyebrow}>
          {visibleCourses.length === 0 ? (
            <p className="rounded-box border border-hairline bg-main px-6 py-16 text-center text-body shadow-sm">
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
          <SectionHeading id="process-title" title={copy.process.title} description={copy.process.subtitle} />
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
                <details className="group rounded-box border border-hairline bg-main px-5 py-4 shadow-sm open:border-brass/40">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 break-words">{copy.faq.items[id].question}</span>
                    <ChevronDown
                      className="mt-0.5 size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-body">{copy.faq.items[id].answer}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>

        <section className="relative mt-16 overflow-hidden rounded-box border border-hairline bg-main px-6 py-10 text-center shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass sm:mt-20 sm:px-10 sm:py-12">
          <h2 className="text-2xl font-bold tracking-tight text-balance text-ink sm:text-3xl">{copy.banner.title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-pretty text-body">
            {copy.banner.subtitle}
          </p>
          <Link
            href={localePath(locale, '/contact')}
            className="mt-8 inline-flex cursor-pointer items-center justify-center gap-2 rounded-box bg-[#465D73] px-6 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98]">
            {copy.banner.cta}
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
