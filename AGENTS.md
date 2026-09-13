---
description: Project rules
alwaysApply: true
---

- **Stack:** Next.js App Router, TS strict, Tailwind v4, Postgres/Prisma, NextAuth. React Compiler active (skip `useMemo`/`useCallback`).
- **Arch:** RSC default (`'use client'` only when interactive). Paths: `@/components/{ui,math,lms}/`, `@/lib/`. Zod on all inputs.
- **i18n:** Zero raw UI text; use `src/i18n/messages/{ka,en,ru}.json` (`ka` baseline). Wrap links in `localePath()`.
- **Theme (`globals.css` only):**
  - BG: `bg-paper`, `bg-paper-deep`, `bg-white`, `bg-navy-tint`, `bg-brass-tint`.
  - Text: `text-ink` (h1-h6), `text-body`, `text-muted`, `text-navy`, `text-brass`.
  - Borders: `border-hairline`, `border-hairline-soft`.
  - Buttons: `bg-navy` (`hover:bg-navy-strong`). Brass for accents only.
  - Ban raw colors (`slate-*`, `blue-*`).
- **Math/Perf:** `next/dynamic(..., { ssr: false })` for Canvas/Recharts/Three.js. KaTeX for math. Workers for ops > 10^5.
