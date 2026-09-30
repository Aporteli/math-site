import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BarChart3, BookOpen, Calculator, Video } from 'lucide-react';

import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import { TOOL_SECTIONS, type ToolItemId } from '@/lib/tools';

interface HomePageProps {
  locale: Locale;
  dict: Dictionary;
}

const FEATURED_TOOLS: ToolItemId[] = [
  'graphing',
  'quadratic-equations',
  'fractions',
  'systemSolver',
  'polynomials',
  'triangle',
  'unitCircle',
  'geometry',
];

const toolsById = new Map(TOOL_SECTIONS.flatMap((section) => section.tools.map((tool) => [tool.id, tool] as const)));

const toolCount = TOOL_SECTIONS.reduce((sum, section) => sum + section.tools.length, 0);

const primaryButton =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-box bg-navy px-6 text-sm font-semibold text-white transition-colors hover:bg-navy-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:w-auto dark:bg-white dark:text-[#10233f] dark:hover:bg-white/90 dark:focus-visible:ring-white';

const secondaryButton =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-box border border-hairline bg-surface px-6 text-sm font-semibold text-ink transition-colors hover:border-navy/40 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:w-auto';

export default function HomeLandPage({ locale, dict }: HomePageProps) {
  const copy = landingCopy[locale];
  const featured = FEATURED_TOOLS.flatMap((id) => {
    const tool = toolsById.get(id);
    return tool ? [tool] : [];
  });

  return (
    <div className="bg-paper text-ink">
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <div className="max-w-3xl border-l-2 border-brass pl-5 sm:pl-7">
          <p className="text-sm font-medium text-brass">{copy.heroKicker}</p>
          <h1 className="mt-3 text-[2.45rem] font-semibold leading-[1.12] tracking-[-0.03em] text-balance text-ink sm:text-6xl sm:leading-[1.08]">
            {copy.heroTitleA}
            <span className="mt-1 block text-navy">{copy.heroTitleB}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-pretty text-body sm:text-lg sm:leading-8">{copy.heroBody}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={localePath(locale, '/signup')} className={primaryButton}>
              {copy.createAccount}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href={localePath(locale, '/tools')} className={secondaryButton}>
              {copy.browseTools}
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">{copy.heroNote}</p>
        </div>

        <GraphStage locale={locale} copy={copy} />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-md text-3xl font-semibold tracking-[-0.03em] text-balance text-ink sm:text-4xl">
            {copy.workspaceTitle}
          </h2>
          <p className="max-w-sm text-sm leading-6 text-pretty text-body sm:text-base sm:leading-7">{copy.workspaceBody}</p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-5">
          <TeacherPanel copy={copy} />
          <StudentPanel copy={copy} />
          <LivePanel copy={copy} />
        </div>
      </section>

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <p className="text-sm font-medium text-brass">{copy.processKicker}</p>
          <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-[-0.03em] text-balance text-ink sm:text-4xl">
            {copy.processTitle}
          </h2>

          <ol className="mt-8 grid gap-px overflow-hidden rounded-box border border-hairline bg-hairline md:grid-cols-3">
            {copy.steps.map((step, index) => {
              const Icon = [BookOpen, Calculator, BarChart3][index] ?? BookOpen;
              return (
                <li key={step.title} className="bg-surface px-6 py-7 sm:px-7 sm:py-8">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-brass">0{index + 1}</span>
                    <Icon className="size-5 text-navy" aria-hidden="true" />
                  </div>
                  <h3 className="mt-8 text-xl font-semibold tracking-tight text-ink">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-pretty text-body">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-brass">{copy.toolsKicker}</p>
              <h2 className="mt-2 flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-[-0.03em] text-balance text-ink sm:text-4xl">
                {copy.toolsTitle}
                <span className="rounded-box bg-navy-tint px-2.5 py-1 font-mono text-sm font-semibold text-navy">
                  {toolCount}
                </span>
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-pretty text-body sm:text-base sm:leading-7">{copy.toolsBody}</p>
            </div>
            <Link
              href={localePath(locale, '/tools')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
            >
              {copy.browseTools}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((tool) => {
              const Icon = tool.icon;
              return (
                <li key={tool.id}>
                  <Link
                    href={localePath(locale, tool.href)}
                    className="group flex h-full min-h-36 flex-col justify-between rounded-box border border-hairline bg-surface p-5 transition-colors hover:border-navy/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
                  >
                    <span className="flex size-11 items-center justify-center rounded-box bg-navy-tint text-navy transition-colors group-hover:bg-navy/15">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="mt-6 flex items-end justify-between gap-3">
                      <span className="line-clamp-2 text-sm font-semibold leading-5 text-ink">
                        {dict.toolsPage.items[tool.id].title}
                      </span>
                      <ArrowUpRight
                        className="size-4 shrink-0 text-muted transition-colors group-hover:text-navy"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="overflow-hidden rounded-box bg-[#0c2340] text-white">
            <div className="h-1 bg-brass" aria-hidden="true" />
            <div className="flex flex-col gap-8 px-6 py-10 sm:px-10 sm:py-12 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <h2 className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{copy.ctaTitle}</h2>
                <p className="mt-4 text-base leading-7 text-pretty text-white/75">{copy.ctaBody}</p>
              </div>
              <Link
                href={localePath(locale, '/signup')}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-box  bg-white px-6 text-sm font-semibold text-[#0c2340] transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c2340]"
              >
                {copy.createAccount}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function GraphStage({ locale, copy }: { locale: Locale; copy: LandingCopy }) {
  return (
    <div className="mt-12 overflow-hidden rounded-box border border-hairline bg-surface shadow-[0_24px_50px_-28px_rgba(16,40,80,0.35)] dark:shadow-none sm:mt-16">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline px-5 py-4 sm:px-7">
        <div>
          <p className="text-sm text-muted">{copy.graphCaption}</p>
          <p className="mt-1 font-mono text-lg font-medium tracking-tight text-ink sm:text-xl">f(x) = x² − 4x + 3</p>
        </div>
        <Link
          href={localePath(locale, '/tools/graphing')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
        >
          {copy.openGraph}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <QuadraticPlot />

      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-hairline px-5 py-3.5 text-sm text-body sm:px-7">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-box bg-navy" aria-hidden="true" />
          {copy.rootsLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-box bg-brass" aria-hidden="true" />
          {copy.vertexLabel}
        </span>
      </div>
    </div>
  );
}

function TeacherPanel({ copy }: { copy: LandingCopy }) {
  return (
    <article className="flex flex-col rounded-box border border-hairline bg-surface p-6 sm:p-8 lg:col-span-3">
      <p className="text-sm font-medium text-brass">{copy.teacherKicker}</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{copy.teacherTitle}</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-pretty text-body">{copy.teacherBody}</p>

      <div className="mt-8 flex items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <p className="text-xs text-muted">{copy.assignmentLabel}</p>
          <p className="mt-1 text-sm font-semibold text-ink">{copy.assignment}</p>
        </div>
        <span className="rounded-box bg-win-tint px-2.5 py-1 text-xs font-semibold text-win">{copy.active}</span>
      </div>

      <ul className="mt-2">
        {copy.students.map((student) => (
          <li key={student.name} className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.5rem] items-center gap-3 border-b border-hairline/80 py-3.5 last:border-b-0">
            <span className="flex size-9 items-center justify-center rounded-box bg-navy-tint text-xs font-semibold text-navy">
              {student.name.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{student.name}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-box bg-paper-deep">
                <div
                  className={`h-full rounded-box ${student.progress === 100 ? 'bg-win' : 'bg-navy'}`}
                  style={{ width: `${student.progress}%` }}
                />
              </div>
            </div>
            <span className="text-right font-mono text-xs text-muted">{student.progress}%</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function StudentPanel({ copy }: { copy: LandingCopy }) {
  return (
    <article className="flex flex-col rounded-box border border-brass/30 bg-brass-tint p-6 sm:p-8 lg:col-span-2">
      <p className="text-sm font-medium text-brass-strong">{copy.studentKicker}</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{copy.studentTitle}</h3>
      <p className="mt-3 text-sm leading-6 text-pretty text-body">{copy.studentBody}</p>

      <div className="mt-auto pt-8">
        <p className="text-xs text-muted">{copy.current}</p>
        <p className="mt-1 text-base font-semibold text-ink">{copy.assignment}</p>
        <p className="mt-5 font-mono text-5xl font-semibold tracking-tight text-navy">40%</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-box bg-surface/80">
          <div className="h-full w-[40%] rounded-box bg-navy" />
        </div>
        <div className="mt-6 border-t border-brass/25 pt-4">
          <p className="text-xs text-muted">{copy.next}</p>
          <p className="mt-1 text-sm font-medium text-ink">{copy.nextLesson}</p>
        </div>
      </div>
    </article>
  );
}

function LivePanel({ copy }: { copy: LandingCopy }) {
  return (
      <article className="overflow-hidden rounded-box bg-[#0c2340] text-white ring-1 ring-white/10 lg:col-span-5">
      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-2 text-sm font-medium text-brass">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-box bg-brass opacity-60 motion-reduce:hidden" />
              <span className="relative size-2 rounded-box bg-brass" />
            </span>
            {copy.liveKicker}
          </div>
          <h3 className="mt-4 max-w-md text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{copy.liveTitle}</h3>
          <p className="mt-4 max-w-md text-sm leading-6 text-pretty text-white/70 sm:text-base sm:leading-7">{copy.liveBody}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-box bg-white/10 px-3 py-1.5 text-xs font-medium">
              <Video className="size-3.5" aria-hidden="true" />
              {copy.teacherPresence}
            </span>
            <span className="inline-flex items-center gap-2 rounded-box bg-white/10 px-3 py-1.5 text-xs font-medium">
              {copy.studentPresence}
            </span>
          </div>
        </div>

        <div className="border-t border-white/10 p-6 sm:p-8 lg:border-t-0 lg:border-l lg:p-10">
          <p className="text-xs text-white/50">{copy.liveNow}</p>
          <p className="mt-1 text-sm font-semibold">{copy.nextLesson}</p>
          <BoardSketch />
          <p className="text-xs text-white/50">{copy.liveMeta}</p>
        </div>
      </div>
    </article>
  );
}

function BoardSketch() {
  return (
    <svg viewBox="0 0 360 200" className="my-4 block h-44 w-full sm:h-52" aria-hidden="true">
      <rect x="0.5" y="0.5" width="359" height="199" rx="16" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.12" />
      <path d="M70 158 L180 36 L292 158 Z" fill="none" stroke="white" strokeOpacity="0.85" strokeWidth="1.75" />
      <path d="M180 36 L180 158" fill="none" stroke="#e2a462" strokeWidth="1.25" strokeDasharray="4 4" />
      <path d="M180 158 L210 158 L210 128" fill="none" stroke="white" strokeOpacity="0.45" strokeWidth="1.25" />
      <circle cx="180" cy="36" r="3.5" fill="#e2a462" />
      <circle cx="70" cy="158" r="3" fill="white" />
      <circle cx="292" cy="158" r="3" fill="white" />
      <text x="58" y="176" fill="white" fillOpacity="0.55" fontSize="12">
        B
      </text>
      <text x="174" y="26" fill="#e2a462" fontSize="12">
        A
      </text>
      <text x="298" y="176" fill="white" fillOpacity="0.55" fontSize="12">
        C
      </text>
    </svg>
  );
}

const CURVE =
  'M96,61.3L114.7,92L133.3,120L152,145.3L170.7,168L189.3,188L208,205.3L226.7,220L245.3,232L264,241.3L282.7,248L301.3,252L320,253.3L338.7,252L357.3,248L376,241.3L394.7,232L413.3,220L432,205.3L450.7,188L469.3,168L488,145.3L506.7,120L525.3,92L544,61.3';

const NEGATIVE_REGION =
  'M226.7,220L245.3,232L264,241.3L282.7,248L301.3,252L320,253.3L338.7,252L357.3,248L376,241.3L394.7,232L413.3,220Z';

function QuadraticPlot() {
  const vertical = [133.3, 226.7, 320, 413.3, 506.7];
  const horizontal = [120, 153.3, 186.7, 220, 253.3];
  const ticks = [
    { x: 133.3, label: '0' },
    { x: 226.7, label: '1' },
    { x: 320, label: '2' },
    { x: 413.3, label: '3' },
    { x: 506.7, label: '4' },
  ];

  return (
    <svg viewBox="0 0 640 340" className="block w-full" aria-hidden="true">
      <g stroke="currentColor" className="text-hairline" strokeWidth="1">
        {vertical.map((x) => (
          <line key={`v-${x}`} x1={x} y1={24} x2={x} y2={286} />
        ))}
        {horizontal.map((y) => (
          <line key={`h-${y}`} x1={72} y1={y} x2={568} y2={y} />
        ))}
      </g>
      <g stroke="currentColor" className="text-muted/50" strokeWidth="1.25">
        <line x1={72} y1={220} x2={568} y2={220} />
        <line x1={133.3} y1={24} x2={133.3} y2={286} />
      </g>
      <path d={NEGATIVE_REGION} className="fill-navy/15" />
      <path d={CURVE} fill="none" className="stroke-navy" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={226.7} cy={220} r={5} className="fill-surface stroke-navy" strokeWidth="2" />
      <circle cx={413.3} cy={220} r={5} className="fill-surface stroke-navy" strokeWidth="2" />
      <circle cx={320} cy={253.3} r={5} className="fill-brass" />
      {ticks.map((tick) => (
        <text key={tick.label} x={tick.x} y={312} textAnchor="middle" className="fill-muted text-[13px]">
          {tick.label}
        </text>
      ))}
    </svg>
  );
}

type LandingCopy = {
  heroKicker: string;
  heroTitleA: string;
  heroTitleB: string;
  heroBody: string;
  heroNote: string;
  createAccount: string;
  browseTools: string;
  graphCaption: string;
  openGraph: string;
  rootsLabel: string;
  vertexLabel: string;
  workspaceTitle: string;
  workspaceBody: string;
  teacherKicker: string;
  teacherTitle: string;
  teacherBody: string;
  assignmentLabel: string;
  assignment: string;
  active: string;
  students: { name: string; progress: number }[];
  studentKicker: string;
  studentTitle: string;
  studentBody: string;
  current: string;
  next: string;
  nextLesson: string;
  liveKicker: string;
  liveTitle: string;
  liveBody: string;
  liveNow: string;
  liveMeta: string;
  teacherPresence: string;
  studentPresence: string;
  processKicker: string;
  processTitle: string;
  steps: { title: string; body: string }[];
  toolsKicker: string;
  toolsTitle: string;
  toolsBody: string;
  ctaTitle: string;
  ctaBody: string;
};

const landingCopy: Record<Locale, LandingCopy> = {
  ka: {
    heroKicker: 'PinF',
    heroTitleA: 'მათემატიკის სწავლება',
    heroTitleB: 'ერთ სამუშაო სივრცეში.',
    heroBody:
      'შექმენი დავალება, შეხვდი კლასს პირდაპირ ეთერში და გახსენი კალკულატორი იმ გვერდზე, სადაც ამოცანა იხსნება.',
    heroNote: 'კალკულატორები ანგარიშის გარეშეც იხსნება.',
    createAccount: 'ანგარიშის შექმნა',
    browseTools: 'ხელსაწყოები',
    graphCaption: 'კვადრატული ფუნქცია',
    openGraph: 'გრაფიკის გახსნა',
    rootsLabel: 'ფესვები x = 1 და x = 3',
    vertexLabel: 'წვერო (2, −1)',
    workspaceTitle: 'ორი მხარე, ერთი გაკვეთილი',
    workspaceBody: 'მასწავლებელი ხედავს ჯგუფს. მოსწავლე ხედავს თავის დავალებას. ონლაინ გაკვეთილი იქვე რჩება.',
    teacherKicker: 'მასწავლებელი',
    teacherTitle: 'მთელი ჯგუფი ერთ ხედში',
    teacherBody: 'დავალება ერთხელ იქმნება და მოსწავლესთან თვითონ ჩნდება. პროგრესი გიჩვენებს, ვის სჭირდება შენი დრო.',
    assignmentLabel: 'დავალება',
    assignment: 'კვადრატული განტოლებები',
    active: 'აქტიური',
    students: [
      { name: 'ანა ბერიძე', progress: 100 },
      { name: 'ლუკა გიორგაძე', progress: 40 },
      { name: 'ნინო მაისურაძე', progress: 0 },
    ],
    studentKicker: 'მოსწავლე',
    studentTitle: 'ერთი დავალება, მშვიდი ადგილი',
    studentBody: 'მოსწავლე ხედავს, რა უნდა გააკეთოს, რამდენი დარჩა და რომელი გაკვეთილია შემდეგი.',
    current: 'მიმდინარე',
    next: 'შემდეგი გაკვეთილი',
    nextLesson: 'გეომეტრია · სამკუთხედები',
    liveKicker: 'პირდაპირი გაკვეთილი',
    liveTitle: 'გააგრძელე გაკვეთილი ონლაინ, იმავე სივრცეში',
    liveBody: 'ვიდეო და სამუშაო დაფა დგას დავალებებთან და ხელსაწყოებთან ერთად, ერთ ეკრანზე.',
    liveNow: 'მიმდინარე გაკვეთილი',
    liveMeta: 'დაფა და ზარი ერთ ეკრანზე',
    teacherPresence: 'მასწავლებელი',
    studentPresence: 'მოსწავლე',
    processKicker: 'როგორ მუშაობს',
    processTitle: 'სამი ნაბიჯი. ერთი პროცესი.',
    steps: [
      {
        title: 'შექმენი',
        body: 'მოამზადე დავალება ერთხელ. ის თვითონ ჩნდება მოსწავლის სამუშაო სივრცეში.',
      },
      {
        title: 'იმუშავე',
        body: 'ამოცანის გვერდით იხსნება გრაფიკი, ალგებრა ან გეომეტრია — იმავე გვერდზე.',
      },
      {
        title: 'შეამოწმე',
        body: 'შედეგი მაშინვე ბრუნდება: ვინ დაასრულა და ვის სჭირდება დახმარება.',
      },
    ],
    toolsKicker: 'კატალოგი',
    toolsTitle: 'ხელსაწყოები, რომლებიც უკვე მუშაობს',
    toolsBody: 'გახსენი გრაფიკი, განტოლება ან გეომეტრია პირდაპირ აქედან. სრულ კატალოგში კიდევ უფრო მეტია.',
    ctaTitle: 'ერთი სივრცე მათემატიკის სწავლებისთვის.',
    ctaBody: 'შექმენი ანგარიში და მოაწესრიგე დავალებები, მოსწავლეები და გაკვეთილები ერთ პროცესში.',
  },
  en: {
    heroKicker: 'PinF',
    heroTitleA: 'Teach mathematics',
    heroTitleB: 'in one workspace.',
    heroBody:
      'Prepare an assignment, meet the class live, and open a calculator on the same page where the problem is solved.',
    heroNote: 'Calculators open without an account.',
    createAccount: 'Create an account',
    browseTools: 'Tools',
    graphCaption: 'Quadratic function',
    openGraph: 'Open the grapher',
    rootsLabel: 'Roots at x = 1 and x = 3',
    vertexLabel: 'Vertex (2, −1)',
    workspaceTitle: 'Two sides of one lesson',
    workspaceBody: 'The teacher sees the class. The student sees their assignment. The live lesson stays in the same place.',
    teacherKicker: 'Teacher',
    teacherTitle: 'The whole class in one view',
    teacherBody: 'An assignment is created once and appears in the student’s workspace. Progress shows who needs your time.',
    assignmentLabel: 'Assignment',
    assignment: 'Quadratic equations',
    active: 'Active',
    students: [
      { name: 'Ana Beridze', progress: 100 },
      { name: 'Luka Giorgadze', progress: 40 },
      { name: 'Nino Maisuradze', progress: 0 },
    ],
    studentKicker: 'Student',
    studentTitle: 'One assignment, a quiet place',
    studentBody: 'Students see what to do, how far along they are, and which lesson comes next.',
    current: 'Now',
    next: 'Next lesson',
    nextLesson: 'Geometry · triangles',
    liveKicker: 'Live lesson',
    liveTitle: 'Continue the lesson online, in the same place',
    liveBody: 'Video and a shared board sit with the assignments and the tools, on one screen.',
    liveNow: 'Current lesson',
    liveMeta: 'Board and call on one screen',
    teacherPresence: 'Teacher',
    studentPresence: 'Student',
    processKicker: 'How it works',
    processTitle: 'Three steps. One process.',
    steps: [
      {
        title: 'Create',
        body: 'Prepare the assignment once. It appears in the student’s workspace on its own.',
      },
      {
        title: 'Work',
        body: 'A graph, algebra, or geometry opens beside the problem, on the same page.',
      },
      {
        title: 'Review',
        body: 'Results come back immediately: who finished, and who needs help.',
      },
    ],
    toolsKicker: 'Catalog',
    toolsTitle: 'Tools that already work',
    toolsBody: 'Open a graph, an equation, or a geometry figure from here. The full catalog goes further.',
    ctaTitle: 'One workspace for teaching mathematics.',
    ctaBody: 'Create an account and put assignments, students, and lessons into one process.',
  },
  ru: {
    heroKicker: 'PinF',
    heroTitleA: 'Преподавание математики',
    heroTitleB: 'в одном пространстве.',
    heroBody:
      'Подготовьте задание, проведите урок в эфире и откройте калькулятор на той же странице, где решается задача.',
    heroNote: 'Калькуляторы открываются без аккаунта.',
    createAccount: 'Создать аккаунт',
    browseTools: 'Инструменты',
    graphCaption: 'Квадратичная функция',
    openGraph: 'Открыть графопостроитель',
    rootsLabel: 'Корни x = 1 и x = 3',
    vertexLabel: 'Вершина (2, −1)',
    workspaceTitle: 'Две стороны одного урока',
    workspaceBody: 'Учитель видит класс. Ученик видит своё задание. Онлайн-урок остаётся там же.',
    teacherKicker: 'Учитель',
    teacherTitle: 'Весь класс в одном виде',
    teacherBody: 'Задание создаётся один раз и само появляется у ученика. Прогресс показывает, кому нужно ваше время.',
    assignmentLabel: 'Задание',
    assignment: 'Квадратные уравнения',
    active: 'Активно',
    students: [
      { name: 'Ана Беридзе', progress: 100 },
      { name: 'Лука Гиоргадзе', progress: 40 },
      { name: 'Нино Маисурадзе', progress: 0 },
    ],
    studentKicker: 'Ученик',
    studentTitle: 'Одно задание и спокойное место',
    studentBody: 'Ученик видит, что делать, сколько уже сделано и какой урок следующий.',
    current: 'Сейчас',
    next: 'Следующий урок',
    nextLesson: 'Геометрия · треугольники',
    liveKicker: 'Урок онлайн',
    liveTitle: 'Продолжите урок онлайн, в том же пространстве',
    liveBody: 'Видео и общая доска стоят рядом с заданиями и инструментами, на одном экране.',
    liveNow: 'Текущий урок',
    liveMeta: 'Доска и звонок на одном экране',
    teacherPresence: 'Учитель',
    studentPresence: 'Ученик',
    processKicker: 'Как это устроено',
    processTitle: 'Три шага. Один процесс.',
    steps: [
      {
        title: 'Создайте',
        body: 'Подготовьте задание один раз. Оно само появится в пространстве ученика.',
      },
      {
        title: 'Работайте',
        body: 'График, алгебра или геометрия открываются рядом с задачей, на той же странице.',
      },
      {
        title: 'Проверьте',
        body: 'Результат возвращается сразу: кто закончил и кому нужна помощь.',
      },
    ],
    toolsKicker: 'Каталог',
    toolsTitle: 'Инструменты, которые уже работают',
    toolsBody: 'Откройте график, уравнение или геометрию прямо отсюда. В полном каталоге их больше.',
    ctaTitle: 'Одно пространство для преподавания математики.',
    ctaBody: 'Создайте аккаунт и соберите задания, учеников и уроки в одном процессе.',
  },
};
