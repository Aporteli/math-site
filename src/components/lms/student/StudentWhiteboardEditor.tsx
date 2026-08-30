"use client";

import "@excalidraw/excalidraw/index.css";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft, Loader2, Save } from "lucide-react";
import { localePath, type Locale } from "@/i18n/config";
import { saveStudentWhiteboardAssignmentAction } from "@/lib/actions/whiteboard";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-slate-300" />
      </div>
    ),
  },
);

interface EditorCopy {
  back: string;
  save: string;
  saving: string;
  saved: string;
  errorFailed: string;
  editorHint: string;
}

interface StudentWhiteboardEditorProps {
  id: string;
  locale: Locale;
  title: string;
  initialElements: unknown[];
  copy: EditorCopy;
}

export function StudentWhiteboardEditor({
  id,
  locale,
  title,
  initialElements,
  copy,
}: StudentWhiteboardEditorProps) {
  const elementsRef = useRef<any[]>(initialElements as any[]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function handleSave() {
    setSaving(true);
    setStatus("idle");

    const result = await saveStudentWhiteboardAssignmentAction({
      id,
      content: { elements: elementsRef.current },
    });

    setSaving(false);
    setStatus(result.success ? "saved" : "error");
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[480px] flex-col gap-3">
      <header className="flex items-center gap-3 rounded-2xl border border-hairline bg-white px-4 py-3 shadow-sm">
        <Link
          href={localePath(locale, "/student/whiteboards")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-paper px-3 py-2 text-xs font-bold text-ink transition-colors hover:border-navy/30 hover:text-navy"
        >
          <ChevronLeft className="size-3.5" />
          {copy.back}
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold text-ink sm:text-base">{title}</h1>
          <p className="truncate text-xs text-muted">{copy.editorHint}</p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-navy-strong disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {saving ? copy.saving : copy.save}
        </button>
      </header>

      {status === "saved" && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          {copy.saved}
        </p>
      )}
      {status === "error" && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {copy.errorFailed}
        </p>
      )}

      <div className="relative flex-1 overflow-hidden rounded-2xl border border-hairline bg-white shadow-sm">
        <Excalidraw
          initialData={{ elements: initialElements as any[], scrollToContent: true }}
          onChange={(elements) => {
            elementsRef.current = elements as any[];
          }}
        />
      </div>
    </div>
  );
}
