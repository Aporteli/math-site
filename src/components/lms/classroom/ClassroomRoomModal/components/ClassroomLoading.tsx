"use client";

import { Loader2 } from "lucide-react";

export function ClassroomLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-8 shadow-2xl">
        <Loader2 className="size-8 animate-spin text-navy" />
        <p className="text-sm font-bold text-ink">
          გაკვეთილთან დაკავშირება...
        </p>
      </div>
    </div>
  );
}