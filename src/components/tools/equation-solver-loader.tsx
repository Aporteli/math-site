"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

// 1. შევქმნათ ტიპი კომპონენტის პარამეტრებისთვის
interface EquationSolverProps {
  locale: Locale;
  copy: Dictionary["equations"];
  title: string;
  description: string;
}

// 2. გადავცეთ ეს ტიპი dynamic ფუნქციას
const EquationSolver = dynamic<EquationSolverProps>(
  () => import("./EquationSolver").then((mod) => mod.EquationSolver),
  {
    ssr: false,
    loading: () => <SolverSkeleton />,
  }
);

export function EquationSolverLoader({
  locale,
  copy,
  title,
  description,
}: EquationSolverProps) {
  return (
    <EquationSolver
      locale={locale}
      copy={copy}
      title={title}
      description={description}
    />
  );
}

function SolverSkeleton() {
  return (
    <div className="bg-paper-deep/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-80 animate-pulse rounded-2xl border border-hairline bg-white" />
      </div>
    </div>
  );
}