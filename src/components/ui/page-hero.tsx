import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface PageHeroProps {
  icon: LucideIcon;
  eyebrow?: string;
  badge?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  footer?: ReactNode;
}

export function PageHero({
  icon: Icon,
  eyebrow,
  badge,
  title,
  description,
  aside,
  footer,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-hairline bg-white shadow-sm motion-safe:animate-fade-up">
      {/* Lichess-ის სტილის მათემატიკური რვეულის ბადე */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-hairline)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-hairline)_1px,transparent_1px)] bg-[size:1.25rem_1.25rem] opacity-35"
        aria-hidden="true"
      />
      {/* ზედა დამახასიათებელი ნარინჯისფერ-ოქროსფერი აქცენტის ხაზი */}
      <div className="absolute inset-x-0 top-0 h-1 bg-brass" aria-hidden="true" />

      <div
        className={
          aside
            ? "relative grid lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]"
            : "relative"
        }
      >
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-3">
            {/* Lichess-ის ანთებული აიკონის ბლოკი */}
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-hairline bg-paper-deep text-brass shadow-inner">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            {eyebrow ? (
              <p className="text-sm font-bold tracking-wide text-brass">
                {eyebrow}
              </p>
            ) : null}
            {badge ? (
              <p className="rounded-full border border-hairline bg-paper-deep px-3 py-1 text-xs font-bold text-ink">
                {badge}
              </p>
            ) : null}
          </div>
          <h1 className="mt-4 max-w-xl text-3xl font-bold tracking-tight break-words text-balance text-ink sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-xl text-base leading-relaxed text-pretty text-body sm:text-lg">
              {description}
            </p>
          ) : null}
        </div>

        {aside ? (
          <div className="flex flex-col justify-center gap-3 border-t border-hairline bg-paper-deep/60 p-6 sm:p-8 lg:border-t-0 lg:border-l">
            {aside}
          </div>
        ) : null}
      </div>

      {footer ? (
        <div className="relative border-t border-hairline bg-paper-deep/40 px-6 py-4 sm:px-8 lg:px-10">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

export function SectionHeading({
  id,
  title,
  description,
}: {
  id?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-hairline pb-4">
      <span
        className="mt-1 hidden h-10 w-1 shrink-0 rounded-full bg-brass sm:block"
        aria-hidden="true"
      />
      <div className="min-w-0 max-w-2xl">
        <h2
          id={id}
          className="text-2xl font-bold tracking-tight break-words text-ink sm:text-3xl"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-base leading-relaxed text-pretty text-body">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}