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
