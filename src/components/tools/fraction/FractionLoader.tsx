"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/i18n/config";
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
  copy,
}: FractionToolProps) {
  return <FractionCalculator copy={copy} />;
}

function FractionSkeleton() {
  return (
    <div className="h-80 animate-pulse rounded-box border border-hairline bg-main" />
  );
}
