import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calculator,
  LogIn,
  Newspaper,
  Quote,
  Sigma,
  Target,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { isLocale, localePath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Dictionary } from "@/i18n/types";
import type { ResourceId, StatId } from "@/lib/navigation";

const statIcons: { id: StatId; icon: LucideIcon }[] = [
  { id: "experience", icon: Award },
  { id: "students", icon: Users },
  { id: "olympiad", icon: Trophy },
  { id: "passRate", icon: Target },
];

const resourceCards: { id: ResourceId; icon: LucideIcon; href: string }[] = [
  { id: "tools", icon: Calculator, href: "/tools" },
  { id: "courses", icon: BookOpen, href: "/courses" },
  { id: "blog", icon: Newspaper, href: "/blog" },
  { id: "portal", icon: LogIn, href: "/login" },
];

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold tracking-wide text-brass">{eyebrow}</p>
      <h2
        id={id}
        className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
      >
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-body">{description}</p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  hint,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  hint: string;
}) {
  return (
    <article className="rounded-2xl border border-hairline bg-white p-6 shadow-sm">
      <span className="inline-flex rounded-xl bg-navy-tint p-2.5 text-navy">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-4 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
        {value}
      </p>
      <h3 className="mt-1 text-base font-semibold text-ink">{label}</h3>
      <p className="mt-1 text-sm leading-relaxed text-body">{hint}</p>
    </article>
  );
}

function TestimonialCard({
  name,
  achievement,
  result,
  quote,
}: Dictionary["home"]["testimonials"]["items"][number]) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-hairline bg-paper-deep p-6">
      <Quote className="size-7 text-brass-soft" aria-hidden="true" />
      <blockquote className="mt-4 flex-1 text-base leading-relaxed text-body">
        {quote}
      </blockquote>
      <footer className="mt-6 border-t border-hairline pt-4">
        <p className="font-semibold text-ink">{name}</p>
        <p className="text-sm text-muted">{achievement}</p>
        <p className="mt-2 inline-flex rounded-full bg-brass-tint px-3 py-1 text-xs font-semibold text-brass-strong">
          {result}
        </p>
      </footer>
    </article>
  );
}

function ResourceCard({
  icon: Icon,
  href,
  title,
  description,
  cta,
}: {
  icon: LucideIcon;
  href: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <article className="group h-full rounded-2xl border border-hairline bg-white p-6 shadow-sm transition-all hover:border-navy/30 hover:shadow-md">
      <Link href={href} className="flex h-full flex-col">
        <span className="inline-flex w-fit rounded-xl bg-paper-deep p-2.5 text-navy transition-colors group-hover:bg-navy-tint">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-body">
          {description}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy">
          {cta}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </Link>
    </article>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);
  const { hero, stats, testimonials, resources } = dict.home;

  return (
    <>
      <header className="mx-auto max-w-6xl px-4 pt-12 pb-12 sm:px-6 sm:pt-20 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative mx-auto w-full max-w-sm lg:mx-0">
            <div className="flex aspect-4/5 items-center justify-center rounded-3xl border border-hairline bg-paper-deep shadow-sm">
              <Sigma className="size-24 text-navy/15" aria-hidden="true" />
              <span className="sr-only">{hero.photoAlt}</span>
            </div>
            <div className="absolute -bottom-5 left-4 right-4 rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:left-6 sm:right-auto">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="size-2 rounded-full bg-brass" />
                {hero.statusTitle}
              </p>
              <p className="mt-1 text-xs text-body">{hero.statusNote}</p>
            </div>
          </div>

          <div className="mt-8 text-center lg:mt-0 lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-3 py-1 text-sm font-semibold text-brass">
              {hero.badge}
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              {dict.brand.person}
            </h1>
            <p className="mt-3 text-lg font-semibold text-navy">{hero.role}</p>
            <p className="mt-6 text-base leading-relaxed text-body sm:text-lg">
              {hero.bio1}
            </p>
            <p className="mt-4 text-base leading-relaxed text-body">{hero.bio2}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href={localePath(locale, "/courses")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-navy-strong"
              >
                {hero.primaryCta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href={localePath(locale, "/tools")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-6 py-3 text-base font-semibold text-ink transition-colors hover:border-navy/40 hover:text-navy"
              >
                {hero.secondaryCta}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section
        aria-labelledby="achievements-title"
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <h2 id="achievements-title" className="sr-only">
          {stats.title}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statIcons.map(({ id, icon }) => (
            <StatCard key={id} icon={icon} {...stats.items[id]} />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="testimonials-title"
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <SectionHeading
          id="testimonials-title"
          eyebrow={testimonials.eyebrow}
          title={testimonials.title}
          description={testimonials.description}
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.items.map((testimonial) => (
            <TestimonialCard key={testimonial.name} {...testimonial} />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="resources-title"
        className="mx-auto max-w-6xl px-4 py-16 pb-24 sm:px-6 lg:px-8"
      >
        <SectionHeading
          id="resources-title"
          eyebrow={resources.eyebrow}
          title={resources.title}
          description={resources.description}
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {resourceCards.map(({ id, icon, href }) => (
            <ResourceCard
              key={id}
              icon={icon}
              href={localePath(locale, href)}
              cta={resources.cta}
              {...resources.items[id]}
            />
          ))}
        </div>
      </section>
    </>
  );
}
