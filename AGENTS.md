# Math Site - Agent Guidelines

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & Lucide Icons
- **Database & ORM:** MySQL with Prisma
- **Auth:** NextAuth.js (Auth.js) with Role-Based Access Control (`ADMIN`, `TEACHER`, `STUDENT`)
- **Math & Rendering:** KaTeX, rehype-katex, remark-math, Math.js, Algebrite
- **Graphics & Visualization:** Recharts, Three.js (`@react-three/fiber`), Konva.js / Canvas API
- **File Storage:** Uploadthing or AWS S3 SDK (for assignments and attachments)
- **Optimization:** React Compiler enabled (do not write manual `useMemo`/`useCallback` unless strictly necessary)

---

## Internationalisation (ka / en / ru)

- **No hardcoded UI text.** Every user-visible string lives in `src/i18n/messages/{ka,en,ru}.json`.
  This includes `aria-label`s, `alt` text, input placeholders and page metadata.
- **Georgian is the source of truth.** `Dictionary` is derived from `ka.json`, and `get-dictionary.ts`
  types `en`/`ru` against it — a missing or renamed key fails `next build`.
- **Routing:** all pages live under `src/app/[locale]/`. `src/proxy.ts` redirects unprefixed paths
  (`/tools` -> `/ka/tools`), choosing the locale from the `NEXT_LOCALE` cookie, then `Accept-Language`,
  then `defaultLocale`. Each locale is prerendered via `generateStaticParams`.
- **Links:** never write a bare internal `href`. Wrap it with `localePath(locale, "/tools")`.
- **Data split:** hrefs, icons and ordering stay in `src/lib/navigation.ts` keyed by id; the matching
  labels live in the JSON under the same ids.
- Server components read text with `getDictionary(locale)`; client components receive the slice they
  need as props (e.g. `dict.header`) rather than importing dictionaries directly.

---

## Design System — Base Color Palette

The site-wide palette is **ink navy + brass on warm paper** (academic, modern, low chroma).
It is defined once as Tailwind v4 theme tokens in `src/app/globals.css` under `@theme`.

**Always use these semantic tokens; never hardcode raw Tailwind scales (`blue-700`, `amber-50`, `slate-600`, …).**

| Token                        | Value                 | Use for                                     |
| ---------------------------- | --------------------- | ------------------------------------------- |
| `paper`                      | `#faf9f6`             | Page background                             |
| `paper-deep`                 | `#f2f0ea`             | Muted sections, icon chips, quiet cards     |
| `white`                      | `#ffffff`             | Cards and raised surfaces                   |
| `hairline` / `hairline-soft` | `#e6e3da` / `#efece4` | Borders and dividers                        |
| `ink`                        | `#16233a`             | Headings and high-emphasis text             |
| `body`                       | `#515b6b`             | Paragraphs and body copy                    |
| `muted`                      | `#7b8494`             | Captions, placeholders, metadata            |
| `navy` / `navy-strong`       | `#17365d` / `#0f2544` | Primary buttons, links, hover state         |
| `navy-tint`                  | `#e9eef5`             | Primary icon chips, selection, subtle fills |
| `brass` / `brass-strong`     | `#8a621b` / `#6f4e14` | Secondary accent: eyebrows, badges, status  |
| `brass-soft`                 | `#d3ab61`             | Brass accent placed on dark navy surfaces   |
| `brass-tint`                 | `#f7f0e0`             | Badge and pill backgrounds                  |

**Motion:** scroll reveals use the native `view()` timeline, not JavaScript observers or animation
libraries. Add `.reveal` to a single element or `.reveal-group` to a container to stagger its
children (defined in `globals.css`). For above-the-fold entrances use `motion-safe:animate-fade-up`.
Both paths respect `prefers-reduced-motion` and degrade to the final state when unsupported.

Conventions: dark navy footer with `text-paper/75` copy, white cards with `border-hairline` and
`shadow-sm`, hover states move borders to `navy/30` and add `shadow-md`. Reserve brass for accents —
it should never compete with navy as the primary action color.

---

## Project Rules & Architecture

- **Server Components First:** Use Server Components by default; add `'use client'` only when client-side interactivity, canvas handling, or browser-only math engines are required.
- **Dynamic Imports:** Isolate heavy computation and 3D/Canvas rendering via `next/dynamic` with `ssr: false` to protect initial load performance.
- **Pre-rendered Math:** Store static math formulas and blog markdown pre-rendered where possible; utilize server-side KaTeX rendering to avoid client runtime overhead.
- **Logic Separation:** Keep business logic, mathematical parsers, and helper functions strictly in `@/lib/math/` or `@/lib/helpers/`.
- **Validation:** Validate all incoming API, Server Action, and form inputs using `zod` schemas.
- **Database Client:** Place shared database logic in `@/lib/prisma.ts`.
- **Directory Structure:**
  - `@/components/ui/` — Primitives, UI design system
  - `@/components/math/` — Calculators, graph viewers, canvas engines, formula sheets
  - `@/components/lms/` — Gradebooks, assignments, submission forms, attendance matrices
- **Type Safety:** Use TypeScript strict mode; strictly avoid `any`, especially when handling complex mathematical data types (matrices, vectors, ASTs).

---

## Database & Storage Rules

- **Object Storage:** Never store raw binary files, images, or large assignment PDFs directly in MySQL; upload to object storage and persist only secure URLs in the database.
- **LMS Relations:** Maintain strict database relations: `User` -> `Enrollment` -> `Course` -> `Assignment` -> `Submission` -> `Grade`.
- **Migrations:** To update schema, modify `prisma/schema.prisma` and run: `npx prisma migrate dev --name <migration_name>`

---

## Math Rendering & Input Standards

- **LaTeX Formatting:** All mathematical expressions displayed in the UI must conform to standard LaTeX formatting wrapped in KaTeX containers.
- **Live Preview:** Formula inputs from teacher dashboards must support live preview before committing to the database.
- **Input Sanitization:** Interactive calculators (derivatives, matrices, graphing) must sanitize raw mathematical text input before parsing via `mathjs` to prevent code execution vulnerabilities.

## Performance & Dynamic Loading Rules

- Always use Next.js Dynamic Imports (`next/dynamic`) with `{ ssr: false }` for heavy client-side mathematical, canvas, and visualization libraries.
- Target libraries for dynamic loading:
  - 3D Graphics / Three.js (`@react-three/fiber`, `three`)
  - 2D Canvas / Whiteboards (`konva`, `react-konva`, `roughjs`)
  - Heavy Charting (`recharts`, `chart.js`)
  - Interactive Geometry / Math solvers that rely on browser DOM/Canvas APIs.
- Provide a clean fallback loading state or skeleton UI matching the warm theme (`bg-amber-50`, `text-slate-500`) for all dynamically imported components.
- Example Pattern:

  ```tsx
  import dynamic from "next/dynamic";
  ```

  ## Heavy Computation & Web Worker Guidelines

- Offload CPU-heavy mathematical tasks, large simulations, iterative approximations, and Monte Carlo runs to **Web Workers** so the UI thread remains at a smooth 60 FPS without freezing.
- Triggers for using Web Workers:
  - Iteration counts > $10^5$ (e.g., Buffon's Needle simulation, Monte Carlo $\pi$ estimation).
  - Heavy numeric ODE integration with small step sizes.
  - Large matrix operations (e.g., matrix inversion or eigenvalue computations for dimensions $> 100 \times 100$).
  - Complex Prime factor searches or cryptographic discrete math operations.
- Implementation Standard:
  1. Place worker scripts inside dedicated worker files (e.g., `src/workers/[tool-name].worker.ts`).
  2. Instantiate workers inside React components/hooks using the Next.js standard URL constructor:
     ```typescript
     const worker = new Worker(
       new URL("@/workers/math-sim.worker.ts", import.meta.url),
     );
     ```
  3. Always clean up worker instances inside the `useEffect` cleanup return:
     ```typescript
     useEffect(() => {
       const worker = new Worker(
         new URL("@/workers/math-sim.worker.ts", import.meta.url),
       );
       // handle messages...
       return () => {
         worker.terminate();
       };
     }, []);
     ```
  4. Provide a visual loading progress or spinner state while the background worker is computing.
