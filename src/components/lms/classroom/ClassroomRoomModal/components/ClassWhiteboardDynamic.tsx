"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const ClassWhiteboard = dynamic(
  () => import("../../ClassWhiteboard/ClassWhiteboard").then((mod) => mod.ClassWhiteboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-white rounded-xl">
        <Loader2 className="size-8 animate-spin text-slate-300" />
      </div>
    ),
  },
);