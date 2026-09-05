"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Percent } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

type FractionToolProps = {
  locale: Locale;
  title: string;
  description: string;
  copy: Dictionary["fractionTool"];
};

const FractionCalculator = dynamic<{ copy: Dictionary["fractionTool"] }>(
  () => import("./FractionCalculator").then((mod) => mod.FractionCalculator),
  {
    ssr: false,
    loading: () => <FractionSkeleton />,
  },
);

export function FractionToolLoader({
  locale,
  title,
  description,
  copy,
}: FractionToolProps) {
  return (
    <div className="bg-paper-deep/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href={localePath(locale, "/tools")}
          className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-navy-strong"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {copy.back}
        </Link>
        <div className="mt-5">
          <PageHero
            icon={Percent}
            eyebrow={copy.eyebrow}
            title={title}
            description={description}
          />
        </div>
        <div className="mt-8">
          <FractionCalculator copy={copy} />
        </div>
      </div>
    </div>
  );
}

function FractionSkeleton() {
  return (
    <div className="h-80 animate-pulse rounded-2xl border border-hairline bg-white" />
  );
}
