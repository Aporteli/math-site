"use client";

import { FileText } from "lucide-react";

export function EmptyFilePreview() {
  return (
    <div className="flex h-24 w-28 shrink-0 items-center justify-center self-center rounded-box border-2 border-dashed border-hairline bg-paper/50 text-muted transition-all duration-200">
      <FileText className="size-8 opacity-30" />
    </div>
  );
}
