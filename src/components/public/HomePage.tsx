import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle2,
  GraduationCap,
  LineChart,
  Users,
  Video,
} from 'lucide-react';

import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';

interface HomePageProps {
  locale: Locale;
  dict: Dictionary;
}

export default function HomeLandPage({ locale, dict: _dict }: HomePageProps) {
  return (
    <main className="overflow-hidden bg-background text-ink antialiased selection:bg-navy/20 selection:text-navy">
      {/* ─────────────────────────────────────────────
          HERO
      ───────────────────────────────────────────── */}

      <section className="relative">
        <GridPattern id="hero-grid" />

        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8 lg:pb-32 lg:pt-32">
          <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            {/* Hero copy */}

            <div className="relative z-10 max-w-2xl">
              <h1 className="max-w-2xl text-[2.7rem] font-semibold leading-[1.04] tracking-[-0.04em] text-ink sm:text-5xl lg:text-[4.5rem]">
                მათემატიკის სწავლება
                <span className="block text-body/50">
                  ერთ სამუშაო სივრცეში.
                </span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-7 text-body/75 sm:text-lg sm:leading-8">
                შექმენი და მართე დავალებები, იმუშავე მოსწავლეებთან,
                ჩაატარე ონლაინ გაკვეთილები და გამოიყენე მათემატიკური
                ხელსაწყოები — ერთი სასწავლო პროცესის ფარგლებში.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href={localePath(locale, '/signup')}
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-navy px-7 text-sm font-medium text-white transition-[transform,background-color,box-shadow] hover:bg-navy/90 hover:shadow-lg hover:shadow-navy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 active:scale-[0.98]"
                >
                  დაიწყე გამოყენება
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>

                <span className="flex items-center justify-center gap-2 text-sm text-body/60 sm:justify-start">
                  <CheckCircle2
                    className="size-4 text-brass"
                    aria-hidden="true"
                  />
                  უფასო სატესტო პერიოდი
                </span>
              </div>
            </div>

            {/* Product visual */}

            <div className="relative lg:pl-4">
              <ProductFlowVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          PROCESS + WORKSPACES
          (merged: the 4-step explainer and the teacher/
          student panels used to repeat the same idea in
          two separate sections — now told once)
      ───────────────────────────────────────────── */}

      <section className="border-y border-hairline/70 bg-surface/35">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <SectionHeader
            eyebrow="ერთი უწყვეტი პროცესი"
            title="მასწავლებლიდან მოსწავლემდე"
            description="სამი ნაბიჯი — დავალების შექმნიდან შედეგის ნახვამდე. ორივესთვის, ერთ სივრცეში."
          />

          <div className="mt-16 lg:mt-20">
            <Process />
          </div>

          <div className="mt-16 border-t border-hairline pt-16 lg:mt-24 lg:pt-20">
            <p className="mb-8 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              სამუშაო სივრცე პრაქტიკაში
            </p>

            <div className="grid gap-10 sm:grid-cols-2 lg:gap-16">
              <TeacherWorkspace />
              <StudentWorkspace />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          MATH-NATIVE TOOLS
      ───────────────────────────────────────────── */}

      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="grid items-center gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <SectionHeader
              eyebrow="მათემატიკის ხელსაწყოები"
              title="მათემატიკა პროცესის ნაწილია."
              description="ალგებრა, გრაფიკები, გეომეტრია და ანალიზის ხელსაწყოები იქ არის, სადაც მათ რეალურად იყენებ — სასწავლო პროცესში."
              align="left"
            />

            <MathWorkspace />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          LIVE LESSONS
      ───────────────────────────────────────────── */}

      <section className="border-y border-hairline/70 bg-surface/35">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="overflow-hidden rounded-[2rem] border border-hairline/80 bg-navy text-white">
            <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
              <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
                <div className="mb-6 flex size-11 items-center justify-center rounded-xl bg-white/10">
                  <Video className="size-5" aria-hidden="true" />
                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                  Live სწავლება
                </p>

                <h2 className="mt-3 max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">
                  გააგრძელე გაკვეთილი ონლაინ.
                </h2>

                <p className="mt-5 max-w-md text-sm leading-7 text-white/65 sm:text-base">
                  ვიდეო ზარები და ინტერაქტიული სამუშაო სივრცე პირდაპირ
                  იმავე პლატფორმაში, სადაც დანარჩენი სასწავლო პროცესიც
                  მიმდინარეობს.
                </p>
              </div>

              <LiveLessonPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          FINAL CTA
      ───────────────────────────────────────────── */}

      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">
            დაიწყე აქედან
          </p>

          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            ერთი სივრცე მათემატიკის სწავლებისთვის.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-body/70">
            შექმენი ანგარიში და მოაწესრიგე დავალებები, მოსწავლეები და
            გაკვეთილები ერთ სამუშაო პროცესში — დღესვე, უფასოდ.
          </p>

          <Link
            href={localePath(locale, '/signup')}
            className="group mt-9 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-navy px-7 text-sm font-medium text-white transition-[transform,background-color,box-shadow] hover:bg-navy/90 hover:shadow-lg hover:shadow-navy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 active:scale-[0.98]"
          >
            ანგარიშის შექმნა
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>
    </main>
  );
}

/* ─────────────────────────────────────────────
   HERO PRODUCT VISUAL
───────────────────────────────────────────── */

function ProductFlowVisual() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 -z-10 bg-[radial-gradient(circle_at_50%_40%,rgba(20,40,80,0.08),transparent_65%)]" />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-hairline bg-surface shadow-[0_24px_70px_rgba(20,30,50,0.08)]">
        <div className="flex items-center justify-between border-b border-hairline/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-navy/5 text-navy">
              <BookOpen className="size-3.5" />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                დავალება
              </p>
              <p className="text-xs font-semibold text-ink">
                კვადრატული განტოლებები
              </p>
            </div>
          </div>

          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700">
            აქტიური
          </span>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-[1fr_0.8fr]">
          <div className="rounded-xl border border-hairline bg-background p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                მოსწავლეები
              </span>

              <Users className="size-3.5 text-muted" />
            </div>

            <div className="mt-4 space-y-2">
              <MiniStudentRow
                name="ანა ბერიძე"
                status="დასრულებული"
                completed
              />
              <MiniStudentRow name="ლუკა გიორგაძე" status="მუშავდება" />
              <MiniStudentRow name="ნინო მაისურაძე" status="არ დაუწყია" />
            </div>
          </div>

          <div className="rounded-xl bg-navy p-4 text-white">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                მოსწავლის სივრცე
              </span>

              <GraduationCap className="size-4 text-white/60" />
            </div>

            <p className="mt-8 text-xs font-medium text-white/60">
              მიმდინარე დავალება
            </p>

            <p className="mt-1 text-sm font-semibold">
              კვადრატული განტოლებები
            </p>

            <div className="mt-5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[40%] rounded-full bg-white" />
              </div>

              <span className="text-[10px] font-medium text-white/50">
                40%
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-hairline/70 bg-paper-deep/40 px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <ProductCapability
              icon={Calculator}
              label="ალგებრა"
            />
            <ProductCapability
              icon={LineChart}
              label="გრაფიკები"
            />
            <ProductCapability
              icon={Video}
              label="Live გაკვეთილი"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROCESS
   Three real moments in the workflow — not four.
   Auto-syncing an assignment to a student isn't a
   step either person takes, so it isn't numbered
   as one; it's described as the outcome of step 1.
───────────────────────────────────────────── */

function Process() {
  const steps = [
    {
      number: '01',
      title: 'შექმენი',
      description:
        'მოამზადე დავალება ერთხელ — ის ავტომატურად ჩნდება მოსწავლის სამუშაო სივრცეში.',
      icon: BookOpen,
    },
    {
      number: '02',
      title: 'იმუშავე',
      description:
        'მოსწავლე ხსნის დავალებას და საჭიროებისას იყენებს ალგებრის, გრაფიკების თუ გეომეტრიის ხელსაწყოებს იმავე სივრცეში.',
      icon: Calculator,
    },
    {
      number: '03',
      title: 'გააკონტროლე',
      description:
        'შედეგი მაშინვე გამოჩნდება შენთან — ნახე, ვინ დაასრულა და ვის სჭირდება დახმარება.',
      icon: BarChart3,
    },
  ];

  return (
    <div className="grid gap-0 lg:grid-cols-3">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.number}
            className="relative border-l border-hairline px-6 pb-10 first:border-l-0 first:pl-0 last:pb-0 lg:min-h-[220px] lg:border-l lg:px-8 lg:pb-0 lg:first:border-l lg:first:pl-8 lg:last:pr-0"
          >
            {!isLast && (
              <div className="absolute right-0 top-3 hidden h-px w-8 translate-x-1/2 bg-hairline lg:block" />
            )}

            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] font-medium text-brass">
                {step.number}
              </span>

              <div className="flex size-8 items-center justify-center rounded-lg bg-navy/5 text-navy">
                <Icon className="size-4" aria-hidden="true" />
              </div>
            </div>

            <h3 className="mt-6 text-xl font-semibold tracking-tight text-ink">
              {step.title}
            </h3>

            <p className="mt-3 max-w-xs text-sm leading-6 text-body/65">
              {step.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   WORKSPACES
   (illustration for the Process above — not a
   separate claim, so no section header of its own)
───────────────────────────────────────────── */

function TeacherWorkspace() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-navy/5 text-navy">
          <Users className="size-4" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            მასწავლებელი
          </p>
          <h3 className="mt-0.5 text-lg font-semibold text-ink">
            მართე სწავლება
          </h3>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <WorkspaceItem
          label="დავალებები"
          value="3 აქტიური"
          active
        />
        <WorkspaceItem
          label="მოსწავლეები"
          value="24"
        />
        <WorkspaceItem
          label="პროგრესი"
          value="ამ კვირის შედეგები"
        />
      </div>
    </div>
  );
}

function StudentWorkspace() {
  return (
    <div className="border-t border-hairline pt-8 sm:border-t-0 sm:border-l sm:pl-10">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-brass/10 text-brass">
          <GraduationCap className="size-4" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            მოსწავლე
          </p>
          <h3 className="mt-0.5 text-lg font-semibold text-ink">
            იმუშავე მშვიდად
          </h3>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <WorkspaceItem
          label="მიმდინარე დავალება"
          value="კვადრატული განტოლებები"
          active
        />
        <WorkspaceItem
          label="შემდეგი გაკვეთილი"
          value="გეომეტრია"
        />
        <WorkspaceItem
          label="პროგრესი"
          value="40% დასრულებული"
        />
      </div>
    </div>
  );
}

function WorkspaceItem({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-hairline/60 py-3 ${
        active ? 'text-ink' : 'text-body/70'
      }`}
    >
      <span className="text-xs font-medium">{label}</span>

      <span className="max-w-[58%] text-right text-xs text-body/60">
        {value}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MATH WORKSPACE
───────────────────────────────────────────── */

function MathWorkspace() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-hairline bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-hairline/70 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            გრაფიკული კალკულატორი
          </p>

          <p className="mt-1 font-mono text-sm font-medium text-ink">
            f(x) = x² − 4x + 3
          </p>
        </div>

        <div className="flex size-8 items-center justify-center rounded-lg bg-navy/5 text-navy">
          <LineChart className="size-4" />
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="overflow-hidden rounded-xl border border-hairline bg-white">
          <GraphVisual />
        </div>
      </div>

      {/*
        Previously four tab-styled buttons with no onClick — looked
        interactive, wasn't. Replaced with a plain capability list,
        matching the honest, non-clickable style used in the hero
        visual's capability row. Graphing is already demonstrated
        above, so it isn't repeated here.
      */}
      <div className="border-t border-hairline/70 bg-paper-deep/40 px-5 py-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
          ასევე შეიცავს
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <ProductCapability
            icon={Calculator}
            label="ალგებრა"
          />
          <ProductCapability
            icon={BookOpen}
            label="გეომეტრია"
          />
          <ProductCapability
            icon={BarChart3}
            label="ანალიზი"
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LIVE LESSON
───────────────────────────────────────────── */

function LiveLessonPreview() {
  return (
    <div className="relative min-h-[320px] border-t border-white/10 bg-[#111827] p-5 sm:p-7 lg:min-h-full lg:border-l lg:border-t-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.08),transparent_35%)]" />

      <div className="relative h-full rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-sm sm:p-5">
        <div className="border-b border-white/10 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            ონლაინ გაკვეთილი
          </p>
          <p className="mt-1 text-sm font-medium text-white/90">
            გეომეტრია · სამკუთხედები
          </p>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex h-40 items-center justify-center">
              <svg
                viewBox="0 0 240 150"
                className="h-full w-full max-w-[240px]"
                aria-hidden="true"
              >
                <path
                  d="M40 120 L120 25 L205 120 Z"
                  fill="none"
                  stroke="currentColor"
                  className="text-white/60"
                  strokeWidth="2"
                />

                <path
                  d="M120 25 L120 120"
                  fill="none"
                  stroke="currentColor"
                  className="text-white/30"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                <circle
                  cx="120"
                  cy="25"
                  r="3"
                  className="fill-white/80"
                />
              </svg>
            </div>
          </div>

          <div className="hidden w-28 space-y-2 sm:block">
            <div className="aspect-video rounded-lg border border-white/10 bg-white/5" />
            <div className="aspect-video rounded-lg border border-white/10 bg-white/5" />
          </div>
        </div>

        <div className="mt-4 text-[10px] text-white/40">
          ვიდეო ზარი და ინტერაქტიული დაფა ერთ ეკრანზე
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SMALL UI
───────────────────────────────────────────── */

function MiniStudentRow({
  name,
  status,
  completed = false,
}: {
  name: string;
  status: string;
  completed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-paper-deep/50 px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium ${
            completed
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-navy/5 text-navy'
          }`}
        >
          {completed ? (
            <CheckCircle2 className="size-3" aria-hidden="true" />
          ) : (
            name.charAt(0)
          )}
        </div>

        <span className="truncate text-[10px] font-medium text-ink">
          {name}
        </span>
      </div>

      <span
        className={`shrink-0 text-[9px] font-medium ${
          completed ? 'text-emerald-700' : 'text-muted'
        }`}
      >
        {status}
      </span>
    </div>
  );
}

function ProductCapability({
  icon: Icon,
  label,
}: {
  icon: typeof Calculator;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-medium text-body/65">
      <Icon className="size-3.5 text-muted" aria-hidden="true" />
      {label}
    </div>
  );
}

/* ─────────────────────────────────────────────
   GRAPH
───────────────────────────────────────────── */

function GraphVisual() {
  return (
    <svg
      viewBox="0 0 440 260"
      className="block w-full"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        className="text-hairline/70"
        strokeWidth="1"
      >
        {[50, 111.7, 173.3, 235, 296.7, 358.3, 419].map((x) => (
          <line
            key={`vertical-${x}`}
            x1={x}
            y1={0}
            x2={x}
            y2={260}
          />
        ))}

        {[20, 70, 120, 170, 220].map((y) => (
          <line
            key={`horizontal-${y}`}
            x1={50}
            y1={y}
            x2={419}
            y2={y}
          />
        ))}
      </g>

      <g
        stroke="currentColor"
        className="text-muted/40"
        strokeWidth="1.5"
      >
        <line x1={50} y1={170} x2={419} y2={170} />
        <line x1={111.7} y1={0} x2={111.7} y2={260} />
      </g>

      <path
        d="M80.8,0 Q235,370 389.2,0"
        fill="none"
        stroke="currentColor"
        className="text-navy"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <circle
        cx={173.3}
        cy={170}
        r={4.5}
        className="fill-white stroke-navy"
        strokeWidth="2"
      />

      <circle
        cx={296.7}
        cy={170}
        r={4.5}
        className="fill-white stroke-navy"
        strokeWidth="2"
      />

      <text
        x={173.3}
        y={194}
        textAnchor="middle"
        className="fill-muted text-[11px] font-medium"
      >
        x₁=1
      </text>

      <text
        x={296.7}
        y={194}
        textAnchor="middle"
        className="fill-muted text-[11px] font-medium"
      >
        x₂=3
      </text>

      <circle
        cx={235}
        cy={175}
        r={4.5}
        className="fill-brass"
      />

      <text
        x={235}
        y={218}
        textAnchor="middle"
        className="fill-ink text-[11px] font-medium"
      >
        Min (2, −1)
      </text>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────────── */

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}

function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
}: SectionHeaderProps) {
  const centered = align === 'center';

  return (
    <div
      className={`flex flex-col ${
        centered
          ? 'mx-auto max-w-2xl items-center text-center'
          : 'items-start text-left'
      }`}
    >
      {eyebrow && (
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">
          {eyebrow}
        </span>
      )}

      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">
        {title}
      </h2>

      {description && (
        <p
          className={`mt-4 text-base leading-7 text-body/70 ${
            centered ? 'max-w-2xl' : 'max-w-xl'
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   GRID
───────────────────────────────────────────── */

function GridPattern({
  id,
  className = '',
}: {
  id: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 h-full w-full ${className}`}
      style={{
        maskImage:
          'radial-gradient(ellipse 70% 60% at 50% 20%, black 0%, transparent 78%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 70% 60% at 50% 20%, black 0%, transparent 78%)',
      }}
    >
      <defs>
        <pattern
          id={id}
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 32V.5H32"
            fill="none"
            stroke="currentColor"
            className="text-hairline/50"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}